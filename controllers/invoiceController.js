const Invoice = require('../models/Invoice');
const Order = require('../models/Order');
const User = require('../models/User');
const CompanySettings = require('../models/CompanySettings');
const { generateInvoicePDF } = require('../utils/pdfGenerator');
const logger = require('../utils/logger');

/**
 * Create invoice from order
 */
// createInvoiceFromOrder (fixed)
exports.createInvoiceFromOrder = async (orderId, orderData, paymentData = null) => {
  try {
    // Generate invoice number
    const invoiceNumber = await Invoice.generateInvoiceNumber();

    logger.info('invoice:create_from_order:start', {
      orderId: orderId ? orderId.toString() : null,
      userId: orderData?.user_id || orderData?.userId || null,
      hasPaymentData: !!paymentData,
    });

    // Dates
    const issueDate = new Date();
    const dueDate = new Date(issueDate);
    dueDate.setDate(dueDate.getDate() + 30);

    // Normalize sale type: trust explicit orderData.sale_type if provided; otherwise default to 'online' (backwards compatible).
    let saleTypeRaw = (orderData.sale_type).toString().trim().toLowerCase();
    let saleType = (saleTypeRaw === 'offline' || saleTypeRaw === 'online') ? saleTypeRaw : 'online';
    const isOnlineSale = saleType === 'online';
    const isOfflineSale = saleType === 'offline';

    // Items (map compatible shapes)
    const items = (orderData.items || []).map(item => ({
      productId: item.product_id || item.productId,
      name: item.name || item.product_name,
      description: item.description,
      quantity: item.quantity || 1,
      rate: item.price || item.rate || 0,
      amount: (item.quantity || 1) * (item.price || item.rate || 0),
    }));

    // Parse numeric values safely (accept many possible keys)
    const parseAmount = v => {
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    };

    const subtotal = parseAmount(orderData.subtotal ?? orderData.subtotal_amount ?? orderData.itemsSubtotal ?? 0);
    const delivery_charges = parseAmount(orderData.delivery_charges ?? orderData.deliveryCharges ?? orderData.shipping_charges ?? 0);
    const gift_price = parseAmount(orderData.gift_price ?? orderData.giftPrice ?? 0);
    const discount_amount_raw = parseAmount(orderData.discount_amount ?? orderData.discount ?? 0); // server computed discount (coupon or manual)
    const coupon_discount_raw = parseAmount(orderData.coupon_discount ?? orderData.couponDiscount ?? 0);
    const provided_gst = parseAmount(orderData.gst_amount ?? orderData.tax ?? orderData.tax_amount ?? 0);
    const provided_total = parseAmount(orderData.total_amount ?? orderData.total ?? orderData.totalAmount ?? 0);

    // Decide which discount fields to use in invoice:
    // - Offline: use discount_amount (manual/POS discount)
    // - Online: prefer coupon_discount if provided, otherwise fall back to discount_amount
    const discount_amount = isOfflineSale ? discount_amount_raw : 0; // offline's "discount" (shown as Discount)
    const coupon_discount = isOnlineSale ? (coupon_discount_raw || discount_amount_raw) : 0; // online's coupon (shown as Coupon Discount)

    // Compute GST for online if not provided. For offline, GST is included in subtotal (do not compute).
    let gst_amount = provided_gst;
    if (isOnlineSale) {
      if (gst_amount === 0) {
        // taxable base for GST is subtotal - coupon_discount + gift_price (coupon reduces taxable base)
        const taxableBase = subtotal - coupon_discount + gift_price;
        gst_amount = Math.round((taxableBase * 5) * 100) / 10000; // keep two decimals (equivalent to (taxableBase*5)/100)
        gst_amount = (taxableBase * 5) / 100;
      }
    } else {
      gst_amount = 0; // offline: GST included in subtotal
    }

    // Final total: prefer provided_total if frontend computed final amount; otherwise compute
    let computedTotal;
    if (isOfflineSale) {
      computedTotal = subtotal - discount_amount;
    } else {
      computedTotal = subtotal + delivery_charges + gift_price + gst_amount - coupon_discount;
    }
    const finalTotal = provided_total || computedTotal;

    // Payment status / invoice status
    const isOnlinePaid = paymentData && (paymentData.status === 'captured' || paymentData.status === 'authorized');
    const paymentStatus = isOnlinePaid ? 'paid' : (orderData.payment_status || orderData.paymentStatus || 'pending');
    const invoiceStatus = isOnlinePaid ? 'paid' : 'issued';

    // UPI QR for offline invoices (optional)
    let upiQrCode = null;
    let upiId = null;
    if (isOfflineSale) {
      const companySettings = await CompanySettings.findOne().lean();
      upiId = companySettings?.upiId;
      if (upiId) {
        try {
          const QRCode = require('qrcode');
          const upiString = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(companySettings.companyName || 'Store')}&am=${finalTotal}&cu=INR&tn=Invoice ${invoiceNumber}`;
          upiQrCode = await QRCode.toDataURL(upiString);
        } catch (err) {
          logger.error('invoice:create_from_order:qr_generation_failed', {
            message: err?.message,
            orderId: orderId ? orderId.toString() : null,
            invoiceNumber,
          });
        }
      }
    }

    // Build invoice document payload (fields aligned with PDF generator)
    const invoicePayload = {
      invoiceNumber,
      orderId,
      order_id: orderId ? orderId.toString() : null,
      userId: orderData.user_id || orderData.userId,
      items,
      subtotal,
      tax: gst_amount, // legacy field - may be unused by PDF but keep populated
      discount: discount_amount, // offline discount
      discount_amount: discount_amount,
      coupon_discount: coupon_discount,
      gift_price,
      shippingCharges: delivery_charges,
      shipping_charges: delivery_charges,
      delivery_charges: delivery_charges,
      gst_amount,
      total: finalTotal,
      total_amount: finalTotal,
      issueDate,
      dueDate,
      paymentStatus,
      paymentMethod: paymentData?.payment_method || orderData.payment_method || orderData.paymentMethod || 'UPI',
      paymentDate: isOnlinePaid ? (orderData.paymentDate || new Date()) : (orderData.paymentDate || null),
      razorpay_payment_id: paymentData?.razorpay_payment_id || orderData.razorpay_payment_id || null,
      razorpay_order_id: paymentData?.razorpay_order_id || orderData.razorpay_order_id || null,
      sale_type: saleType,
      upi_qr_code: upiQrCode,
      upi_id: upiId,
      billingAddress: orderData.billing_address || orderData.billingAddress || orderData.billingAddressRaw || null,
      shippingAddress: orderData.shipping_address || orderData.shippingAddress || orderData.shippingAddressRaw || null,
      notes: orderData.notes || 'Thank you for your order!',
      terms: orderData.terms || 'Payment due within 30 days. All sales are final.',
      status: invoiceStatus,
    };

    // Create invoice
    const invoice = await Invoice.create(invoicePayload);

    logger.info('invoice:create_from_order:success', {
      orderId: orderId ? orderId.toString() : null,
      invoiceId: invoice._id.toString(),
      invoiceNumber,
      sale_type: saleType,
    });

    return invoice;
  } catch (error) {
    logger.error('invoice:create_from_order:error', {
      message: error?.message,
      stack: error?.stack,
      orderId: orderId ? orderId.toString() : null,
    });
    throw error;
  }
};


/**
 * Get all invoices (admin)
 */
exports.getAllInvoices = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const query = {};

    // Filter by status
    if (req.query.status) {
      query.status = req.query.status;
    }

    // Filter by payment status
    if (req.query.paymentStatus) {
      query.paymentStatus = req.query.paymentStatus;
    }

    // Search by invoice number
    if (req.query.search) {
      query.invoiceNumber = { $regex: req.query.search, $options: 'i' };
    }

    logger.info('invoice:getAllInvoices:start', {
      page,
      limit,
      hasStatus: Boolean(req.query.status),
      hasPaymentStatus: Boolean(req.query.paymentStatus),
      hasSearch: Boolean(req.query.search),
    });

    const [invoices, total] = await Promise.all([
      Invoice.find(query)
        .populate('userId', 'name email')
        .populate('orderId', 'order_number')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Invoice.countDocuments(query),
    ]);

    const formattedInvoices = invoices.map(inv => ({
      id: inv._id.toString(),
      invoiceNumber: inv.invoiceNumber,
      orderId: inv.orderId?._id?.toString(),
      order_id: inv.order_id || inv.orderId?._id?.toString(),
      orderNumber: inv.orderId?.order_number,
      userId: inv.userId?._id?.toString(),
      userName: inv.userId?.name,
      userEmail: inv.userId?.email,
      total: inv.total,
      subtotal: inv.subtotal,
      tax: inv.tax,
      discount: inv.discount,
      issueDate: inv.issueDate,
      dueDate: inv.dueDate,
      paymentStatus: inv.paymentStatus,
      status: inv.status,
      createdAt: inv.createdAt,
      updatedAt: inv.updatedAt,
    }));

    logger.info('invoice:getAllInvoices:success', {
      page,
      limit,
      count: formattedInvoices.length,
      total,
    });

    res.json({
      success: true,
      data: formattedInvoices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('invoice:getAllInvoices:error', {
      message: error.message,
      stack: error.stack,
    });
    next(error);
  }
};

/**
 * Get user's invoices
 */
exports.getUserInvoices = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const query = { userId };

    logger.info('invoice:getUserInvoices:start', {
      userId,
      page,
      limit,
    });

    const [invoices, total] = await Promise.all([
      Invoice.find(query)
        .populate('orderId', 'order_number')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Invoice.countDocuments(query),
    ]);

    const formattedInvoices = invoices.map(inv => ({
      id: inv._id.toString(),
      invoiceNumber: inv.invoiceNumber,
      orderId: inv.orderId?._id?.toString(),
      orderNumber: inv.orderId?.order_number,
      total: inv.total,
      subtotal: inv.subtotal,
      tax: inv.tax,
      discount: inv.discount,
      issueDate: inv.issueDate,
      dueDate: inv.dueDate,
      paymentStatus: inv.paymentStatus,
      status: inv.status,
      createdAt: inv.createdAt,
    }));

    res.json({
      success: true,
      data: formattedInvoices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get invoice by ID
 */
exports.getInvoiceById = async (req, res, next) => {
  try {
    const invoiceId = req.params.id;
    const userId = req.user._id;
    const userRole = req.user.role;

    logger.info('invoice:getInvoiceById:start', {
      invoiceId,
      userId,
      userRole,
    });

    const invoice = await Invoice.findById(invoiceId)
      .populate('userId', 'name email phone')
      .populate('orderId', 'order_number')
      .lean();

    if (!invoice) {
      logger.warn('invoice:getInvoiceById:not_found', {
        invoiceId,
      });
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
    }

    // Check permissions (user can only see their own invoices, admin can see all)
    if (userRole !== 'admin' && invoice.userId._id.toString() !== userId.toString()) {
      logger.warn('invoice:getInvoiceById:forbidden', {
        invoiceId,
        userId,
        userRole,
      });
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const formattedInvoice = {
      id: invoice._id.toString(),
      invoiceNumber: invoice.invoiceNumber,
      orderId: invoice.orderId?._id?.toString(),
      order_id: invoice.order_id || invoice.orderId?._id?.toString(),
      orderNumber: invoice.orderId?.order_number,
      userId: invoice.userId._id.toString(),
      userName: invoice.userId.name,
      userEmail: invoice.userId.email,
      userPhone: invoice.userId.phone,
      items: invoice.items,
      subtotal: invoice.subtotal,
      tax: invoice.tax,
      discount: invoice.discount,
      shippingCharges: invoice.shippingCharges,
      total: invoice.total,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      paymentStatus: invoice.paymentStatus,
      paymentMethod: invoice.paymentMethod,
      paymentDate: invoice.paymentDate,
      billingAddress: invoice.billingAddress,
      shippingAddress: invoice.shippingAddress,
      notes: invoice.notes,
      terms: invoice.terms,
      status: invoice.status,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
    };

    logger.info('invoice:getInvoiceById:success', {
      invoiceId,
      userId,
    });

    res.json({
      success: true,
      data: formattedInvoice,
    });
  } catch (error) {
    logger.error('invoice:getInvoiceById:error', {
      message: error.message,
      stack: error.stack,
      invoiceId: req.params.id,
      userId: req.user?._id,
    });
    next(error);
  }
};

/**
 * Generate and download invoice PDF
 */
exports.downloadInvoicePDF = async (req, res, next) => {
  try {
    const invoiceId = req.params.id;
    const userId = req.user._id;
    const userRole = req.user.role;

    logger.info('invoice:downloadPDF:start', {
      invoiceId,
      userId,
      userRole,
    });

    const invoice = await Invoice.findById(invoiceId)
      .populate('userId', 'name email phone')
      .populate('orderId')
      .lean();

    if (!invoice) {
      logger.warn('invoice:downloadPDF:not_found', {
        invoiceId,
      });
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
    }

    // Check permissions
    if (userRole !== 'admin' && invoice.userId._id.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // Get company settings (dynamic data from admin dashboard)
    const companySettings = await CompanySettings.findOne().lean();

    // Prepare invoice data for PDF
    const invoiceData = {
      invoiceNumber: invoice.invoiceNumber,
      orderId: invoice.orderId?._id?.toString(),
      order_id: invoice.order_id || invoice.orderId?._id?.toString(),
      orderNumber: invoice.orderId?.order_number,
      userName: invoice.userId?.name,
      userEmail: invoice.userId?.email,
      items: invoice.items,
      subtotal: invoice.subtotal,
      tax: invoice.tax,
      discount: invoice.discount,
      discount_amount: invoice.discount,
      coupon_discount: invoice.coupon_discount || 0,
      gift_price: invoice.gift_price || 0,
      shippingCharges: invoice.shippingCharges,
      shipping_charges: invoice.shippingCharges,
      delivery_charges: invoice.delivery_charges || 0,
      gst_amount: invoice.gst_amount || 0,
      total: invoice.total,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      paymentStatus: invoice.paymentStatus,
      paymentMethod: invoice.paymentMethod,
      paymentDate: invoice.paymentDate,
      razorpay_payment_id: invoice.razorpay_payment_id,
      razorpay_order_id: invoice.razorpay_order_id,
      sale_type: invoice.sale_type,
      upi_qr_code: invoice.upi_qr_code,
      billingAddress: invoice.billingAddress,
      shippingAddress: invoice.shippingAddress,
      notes: invoice.notes,
      terms: invoice.terms,
    };

    // Prepare company settings for PDF (dynamic from admin dashboard)
    const pdfCompanySettings = {
      companyName: companySettings?.companyName || 'Your Company',
      address: companySettings?.address || '',
      phone: companySettings?.phone || '',
      email: companySettings?.email || '',
      website: companySettings?.website || '',
      gstin: companySettings?.gstNumber || '',
      pan: companySettings?.panNumber || '',
      placeOfSupply: companySettings?.placeOfSupply || '',
      logo: companySettings?.logo || null,  // Direct URL support
      logoData: companySettings?.logo || null,  // Backward compatibility
      signature: companySettings?.signature || null,  // Direct URL support
      selectedBank: {
        bankName: companySettings?.bankName || '',
        accountHolder: companySettings?.accountHolderName || companySettings?.companyName || '',
        accountNumber: companySettings?.accountNumber || '',
        ifscCode: companySettings?.ifscCode || '',
        branchName: companySettings?.branchName || '',
        upiId: companySettings?.upiId || '',
      },
      selectedSignature: {
        imageData: companySettings?.signature || null,
        signatureName: 'Authorized Signatory',
      },
    };

    // Generate PDF
    const pdfBuffer = await generateInvoicePDF(invoiceData, pdfCompanySettings);

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    // Send PDF
    res.send(pdfBuffer);

    logger.info('invoice:downloadPDF:success', {
      invoiceId,
      userId,
    });
  } catch (error) {
    logger.error('invoice:downloadPDF:error', {
      message: error.message,
      stack: error.stack,
      invoiceId: req.params.id,
      userId: req.user?._id,
    });
    next(error);
  }
};

/**
 * Update invoice status (admin only)
 */
exports.updateInvoiceStatus = async (req, res, next) => {
  try {
    const invoiceId = req.params.id;
    const { status, paymentStatus } = req.body;

    logger.info('invoice:updateStatus:start', {
      invoiceId,
      status,
      paymentStatus,
    });

    const invoice = await Invoice.findById(invoiceId);

    if (!invoice) {
      logger.warn('invoice:updateStatus:not_found', {
        invoiceId,
      });
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
    }

    if (status) {
      invoice.status = status;
    }

    if (paymentStatus) {
      invoice.paymentStatus = paymentStatus;
      if (paymentStatus === 'paid' && !invoice.paymentDate) {
        invoice.paymentDate = new Date();
      }
    }

    await invoice.save();

    logger.info('invoice:updateStatus:success', {
      invoiceId,
      status: invoice.status,
      paymentStatus: invoice.paymentStatus,
    });

    res.json({
      success: true,
      message: 'Invoice updated successfully',
      data: {
        id: invoice._id.toString(),
        status: invoice.status,
        paymentStatus: invoice.paymentStatus,
        paymentDate: invoice.paymentDate,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete invoice (admin only)
 */
exports.deleteInvoice = async (req, res, next) => {
  try {
    const invoiceId = req.params.id;

    logger.info('invoice:delete:start', {
      invoiceId,
    });

    const invoice = await Invoice.findByIdAndDelete(invoiceId);

    if (!invoice) {
      logger.warn('invoice:delete:not_found', {
        invoiceId,
      });
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
    }

    logger.info('invoice:delete:success', {
      invoiceId,
    });

    res.json({
      success: true,
      message: 'Invoice deleted successfully',
    });
  } catch (error) {
    logger.error('invoice:delete:error', {
      message: error.message,
      stack: error.stack,
      invoiceId: req.params.id,
    });
    next(error);
  }
};

/**
 * Get next invoice number
 */
exports.getNextInvoiceNumber = async (req, res, next) => {
  try {
    logger.info('invoice:getNextNumber:start');

    const nextNumber = await Invoice.generateInvoiceNumber();

    logger.info('invoice:getNextNumber:success', {
      nextNumber,
    });

    res.json({
      success: true,
      nextNumber,
    });
  } catch (error) {
    logger.error('invoice:getNextNumber:error', {
      message: error.message,
      stack: error.stack,
    });
    next(error);
  }
};

/**
 * Get pending offline invoices (admin only)
 * For tracking offline sales where payment is pending
 */
exports.getPendingOfflineInvoices = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    // Query for offline sales with pending payment
    const query = {
      sale_type: 'offline',
      paymentStatus: 'pending',
    };

    const [invoices, total] = await Promise.all([
      Invoice.find(query)
        .populate('userId', 'name email phone')
        .populate('orderId', 'order_number')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Invoice.countDocuments(query),
    ]);

    const formattedInvoices = invoices.map(inv => ({
      id: inv._id.toString(),
      invoiceNumber: inv.invoiceNumber,
      orderId: inv.orderId?._id?.toString(),
      orderNumber: inv.orderId?.order_number,
      userId: inv.userId?._id?.toString(),
      userName: inv.userId?.name,
      userEmail: inv.userId?.email,
      userPhone: inv.userId?.phone,
      total: inv.total,
      subtotal: inv.subtotal,
      tax: inv.tax,
      discount: inv.discount,
      issueDate: inv.issueDate,
      dueDate: inv.dueDate,
      paymentStatus: inv.paymentStatus,
      sale_type: inv.sale_type,
      upi_id: inv.upi_id,
      status: inv.status,
      createdAt: inv.createdAt,
      updatedAt: inv.updatedAt,
      // Calculate days pending
      daysPending: Math.floor((new Date() - new Date(inv.createdAt)) / (1000 * 60 * 60 * 24)),
    }));

    res.json({
      success: true,
      data: formattedInvoices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        totalPending: total,
        totalAmount: formattedInvoices.reduce((sum, inv) => sum + inv.total, 0),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark offline invoice as paid (admin only)
 * When admin receives payment for offline sale
 */
exports.markOfflineInvoicePaid = async (req, res, next) => {
  try {
    const invoiceId = req.params.id;
    const { paymentMethod, paymentNotes } = req.body;

    logger.info('invoice:markOfflinePaid:start', {
      invoiceId,
    });

    const invoice = await Invoice.findById(invoiceId);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
    }

    if (invoice.sale_type !== 'offline') {
      return res.status(400).json({
        success: false,
        message: 'This endpoint is only for offline invoices',
      });
    }

    // Update invoice status
    invoice.paymentStatus = 'paid';
    invoice.status = 'paid';
    invoice.paymentDate = new Date();
    if (paymentMethod) {
      invoice.paymentMethod = paymentMethod;
    }
    if (paymentNotes) {
      invoice.notes = `${invoice.notes}\n\nPayment Notes: ${paymentNotes}`;
    }

    await invoice.save();

    logger.info('invoice:markOfflinePaid:success', {
      invoiceId,
      paymentStatus: invoice.paymentStatus,
      status: invoice.status,
    });

    res.json({
      success: true,
      message: 'Invoice marked as paid successfully',
      data: {
        id: invoice._id.toString(),
        invoiceNumber: invoice.invoiceNumber,
        paymentStatus: invoice.paymentStatus,
        status: invoice.status,
        paymentDate: invoice.paymentDate,
      },
    });
  } catch (error) {
    next(error);
  }
};
