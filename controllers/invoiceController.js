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
    const invoice_number = await Invoice.generateInvoiceNumber();

    logger.info('invoice:create_from_order:start', {
      orderId: orderId ? orderId.toString() : null,
      user_id: orderData?.user_id,
      sale_type: orderData?.sale_type,
      hasPaymentData: !!paymentData,
    });

    // Dates
    const issue_date = new Date();
    const due_date = new Date(issue_date);
    due_date.setDate(due_date.getDate() + 30);

    // ✅ EXPLICIT SALE TYPE - Must be provided
    const sale_type = orderData.sale_type || 'online';
    if (!['online', 'offline'].includes(sale_type)) {
      throw new Error(`Invalid sale_type: ${sale_type}. Must be 'online' or 'offline'`);
    }
    const isOnlineSale = sale_type === 'online';
    const isOfflineSale = sale_type === 'offline';

    // ✅ STANDARDIZED ITEMS - snake_case only
    const items = (orderData.items || []).map(item => ({
      product_id: item.product_id,
      name: item.name || item.product_name,
      description: item.description || '',
      quantity: item.quantity || 1,
      price: item.price || 0,
      amount: (item.quantity || 1) * (item.price || 0),
    }));

    // ✅ STANDARDIZED FIELD PARSING - snake_case only
    const parseAmount = v => {
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    };

    const subtotal = parseAmount(orderData.subtotal || 0);
    const delivery_charges = parseAmount(orderData.delivery_charges || 0);
    const gift_price = parseAmount(orderData.gift_price || 0);
    const discount_amount = parseAmount(orderData.discount_amount || 0);
    const coupon_discount = parseAmount(orderData.coupon_discount || 0);
    const tax_amount = parseAmount(orderData.tax_amount || 0);
    const total_amount = parseAmount(orderData.total_amount || 0);

    // ✅ COMPUTE FINAL TOTAL (trust provided value)
    const final_total_amount = total_amount || subtotal;

    // ✅ PAYMENT STATUS - Online sales are ALWAYS paid (invoice created only after Razorpay success)
    const isOnlinePaid = paymentData && (paymentData.status === 'captured' || paymentData.status === 'authorized');
    
    // If online sale, always mark as paid (invoice only created after successful payment)
    // If offline sale, default to pending unless explicitly marked as paid
    let payment_status;
    let invoice_status;
    
    if (isOnlineSale) {
      // Online invoices are ALWAYS paid - they're only created after Razorpay success
      payment_status = 'paid';
      invoice_status = 'paid';
    } else {
      // Offline invoices can be pending or paid based on provided data
      payment_status = isOnlinePaid ? 'paid' : (orderData.payment_status || 'pending');
      invoice_status = isOnlinePaid ? 'paid' : 'issued';
    }

    // ✅ UPI QR for offline invoices
    let upi_qr_code = null;
    let upi_id = null;
    if (isOfflineSale) {
      const companySettings = await CompanySettings.findOne().lean();
      upi_id = companySettings?.upiId;
      if (upi_id) {
        try {
          const QRCode = require('qrcode');
          const upiString = `upi://pay?pa=${upi_id}&pn=${encodeURIComponent(companySettings.companyName || 'Store')}&am=${final_total_amount}&cu=INR&tn=Invoice ${invoice_number}`;
          upi_qr_code = await QRCode.toDataURL(upiString);
        } catch (err) {
          logger.error('invoice:create_from_order:qr_generation_failed', {
            message: err?.message,
            orderId: orderId ? orderId.toString() : null,
            invoice_number,
          });
        }
      }
    }

    // ✅ BUILD INVOICE WITH STANDARDIZED FIELDS ONLY
    const invoicePayload = {
      invoice_number,
      user_id: orderData.user_id,
      order_id: orderId,
      items,
      subtotal,
      discount_amount,
      coupon_discount,
      gift_price,
      delivery_charges,
      tax_amount,
      total_amount: final_total_amount,
      issue_date,
      due_date,
      payment_status,
      payment_method: paymentData?.payment_method || orderData.payment_method || 'UPI',
      payment_date: (isOnlineSale || isOnlinePaid) ? new Date() : null,
      razorpay_payment_id: paymentData?.razorpay_payment_id || orderData.razorpay_payment_id || null,
      razorpay_order_id: paymentData?.razorpay_order_id || orderData.razorpay_order_id || null,
      sale_type,
      upi_qr_code,
      upi_id,
      billing_address: orderData.billing_address || null,
      shipping_address: orderData.shipping_address || null,
      notes: orderData.notes || 'Thank you for your order!',
      terms: orderData.terms || 'Payment due within 30 days. All sales are final.',
      status: invoice_status,
    };

    // Create invoice
    const invoice = await Invoice.create(invoicePayload);

    logger.info('invoice:create_from_order:success', {
      orderId: orderId ? orderId.toString() : null,
      invoiceId: invoice._id.toString(),
      invoice_number,
      sale_type,
      payment_status,
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
      query.invoice_number = { $regex: req.query.search, $options: 'i' }; // ✅ FIX: Use snake_case
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
        .populate('user_id', 'name email') // ✅ FIX: Use snake_case
        .populate('order_id', 'order_number') // ✅ FIX: Use snake_case
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Invoice.countDocuments(query),
    ]);

    // ✅ STANDARDIZED: All fields use snake_case matching Invoice model
    const formattedInvoices = invoices.map(inv => ({
      id: inv._id.toString(),
      invoice_number: inv.invoice_number,
      user_id: inv.user_id?._id?.toString() || inv.user_id?.toString(),
      order_id: inv.order_id?._id?.toString() || inv.order_id?.toString(),
      
      // User details (from populate)
      user_name: inv.user_id?.name,
      user_email: inv.user_id?.email,
      
      // Amounts - all snake_case
      subtotal: inv.subtotal,
      discount_amount: inv.discount_amount || 0,
      coupon_discount: inv.coupon_discount || 0,
      gift_price: inv.gift_price || 0,
      delivery_charges: inv.delivery_charges || 0,
      tax_amount: inv.tax_amount || 0,
      total_amount: inv.total_amount,
      
      // Dates
      issue_date: inv.issue_date,
      due_date: inv.due_date,
      
      // Payment info
      payment_status: inv.payment_status,
      payment_method: inv.payment_method,
      payment_date: inv.payment_date,
      
      // Razorpay info
      razorpay_payment_id: inv.razorpay_payment_id,
      razorpay_order_id: inv.razorpay_order_id,
      
      // Sale type
      sale_type: inv.sale_type,
      
      // Status
      status: inv.status,
      
      // Timestamps
      created_at: inv.createdAt,
      updated_at: inv.updatedAt,
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

    const query = { user_id: userId }; // ✅ FIX: Use snake_case field name

    logger.info('invoice:getUserInvoices:start', {
      userId,
      page,
      limit,
    });

    const [invoices, total] = await Promise.all([
      Invoice.find(query)
        .populate('order_id', 'order_number') // ✅ FIX: Use snake_case
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Invoice.countDocuments(query),
    ]);

    // ✅ STANDARDIZED: All fields use snake_case matching Invoice model
    const formattedInvoices = invoices.map(inv => ({
      id: inv._id.toString(),
      invoice_number: inv.invoice_number,
      user_id: inv.user_id?.toString(),
      order_id: inv.order_id?._id?.toString() || inv.order_id?.toString(),
      
      // Amounts - all snake_case
      subtotal: inv.subtotal,
      discount_amount: inv.discount_amount || 0,
      coupon_discount: inv.coupon_discount || 0,
      gift_price: inv.gift_price || 0,
      delivery_charges: inv.delivery_charges || 0,
      tax_amount: inv.tax_amount || 0,
      total_amount: inv.total_amount,
      
      // Dates
      issue_date: inv.issue_date,
      due_date: inv.due_date,
      
      // Payment info
      payment_status: inv.payment_status,
      payment_method: inv.payment_method,
      payment_date: inv.payment_date,
      
      // Sale type
      sale_type: inv.sale_type,
      
      // Status
      status: inv.status,
      
      // Timestamps
      created_at: inv.createdAt,
      updated_at: inv.updatedAt,
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
      .populate('user_id', 'name email phone') // ✅ FIX: Use snake_case
      .populate('order_id') // ✅ FIX: Use snake_case
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
    if (userRole !== 'admin' && invoice.user_id._id.toString() !== userId.toString()) { // ✅ FIX: Use snake_case
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // Get company settings (dynamic data from admin dashboard)
    const companySettings = await CompanySettings.findOne().lean();

    // ✅ FIX: Prepare invoice data for PDF with correct field names
    const invoiceData = {
      // Invoice details - use snake_case from database
      invoice_number: invoice.invoice_number,
      order_id: invoice.order_id?._id?.toString() || invoice.order_id?.toString(),
      
      // User details - from populated user_id
      user_name: invoice.user_id?.name || 'N/A',
      user_email: invoice.user_id?.email || 'N/A',
      user_phone: invoice.user_id?.phone || 'N/A',
      
      // Items
      items: invoice.items || [],
      
      // Amounts - all from database (don't recalculate!)
      subtotal: invoice.subtotal || 0,
      discount_amount: invoice.discount_amount || 0,
      coupon_discount: invoice.coupon_discount || 0,
      gift_price: invoice.gift_price || 0,
      delivery_charges: invoice.delivery_charges || 0,
      tax_amount: invoice.tax_amount || 0,  // ✅ Use stored tax, don't recalculate
      total_amount: invoice.total_amount || 0,
      
      // Dates - use snake_case from database
      issue_date: invoice.issue_date,
      due_date: invoice.due_date,
      
      // Payment info
      payment_status: invoice.payment_status,
      payment_method: invoice.payment_method,
      payment_date: invoice.payment_date,
      razorpay_payment_id: invoice.razorpay_payment_id,
      razorpay_order_id: invoice.razorpay_order_id,
      
      // Sale type and UPI
      sale_type: invoice.sale_type,
      upi_qr_code: invoice.upi_qr_code,
      
      // Addresses - use snake_case from database
      billing_address: invoice.billing_address,
      shipping_address: invoice.shipping_address,
      
      // Additional
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
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoice.invoice_number}.pdf"`); // ✅ FIX: Use snake_case
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
    const { status, payment_status, paymentStatus } = req.body;

    // Accept both snake_case and camelCase for backward compatibility
    const newPaymentStatus = payment_status || paymentStatus;

    logger.info('invoice:updateStatus:start', {
      invoiceId,
      status,
      payment_status: newPaymentStatus,
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

    if (newPaymentStatus) {
      invoice.payment_status = newPaymentStatus;
      if (newPaymentStatus === 'paid' && !invoice.payment_date) {
        invoice.payment_date = new Date();
      }
    }

    await invoice.save();

    logger.info('invoice:updateStatus:success', {
      invoiceId,
      status: invoice.status,
      payment_status: invoice.payment_status,
    });

    res.json({
      success: true,
      message: 'Invoice updated successfully',
      data: {
        id: invoice._id.toString(),
        status: invoice.status,
        payment_status: invoice.payment_status,
        payment_date: invoice.payment_date,
      },
    });
  } catch (error) {
    logger.error('invoice:updateStatus:error', {
      message: error.message,
      stack: error.stack,
      invoiceId: req.params.id,
    });
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
      payment_status: 'pending', // ✅ FIX: Use snake_case
    };

    const [invoices, total] = await Promise.all([
      Invoice.find(query)
        .populate('user_id', 'name email phone') // ✅ FIX: Use snake_case
        .populate('order_id', 'order_number') // ✅ FIX: Use snake_case
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Invoice.countDocuments(query),
    ]);

    // ✅ STANDARDIZED: All fields use snake_case matching Invoice model
    const formattedInvoices = invoices.map(inv => ({
      id: inv._id.toString(),
      invoice_number: inv.invoice_number,
      user_id: inv.user_id?._id?.toString() || inv.user_id?.toString(),
      order_id: inv.order_id?._id?.toString() || inv.order_id?.toString(),
      
      // User details (from populate)
      user_name: inv.user_id?.name,
      user_email: inv.user_id?.email,
      user_phone: inv.user_id?.phone,
      
      // Amounts - all snake_case
      subtotal: inv.subtotal,
      discount_amount: inv.discount_amount || 0,
      coupon_discount: inv.coupon_discount || 0,
      gift_price: inv.gift_price || 0,
      delivery_charges: inv.delivery_charges || 0,
      tax_amount: inv.tax_amount || 0,
      total_amount: inv.total_amount,
      
      // Dates
      issue_date: inv.issue_date,
      due_date: inv.due_date,
      
      // Payment info
      payment_status: inv.payment_status,
      payment_method: inv.payment_method,
      payment_date: inv.payment_date,
      
      // Sale type and UPI
      sale_type: inv.sale_type,
      upi_id: inv.upi_id,
      upi_qr_code: inv.upi_qr_code,
      
      // Status
      status: inv.status,
      
      // Timestamps
      created_at: inv.createdAt,
      updated_at: inv.updatedAt,
      
      // Calculate days pending
      days_pending: Math.floor((new Date() - new Date(inv.createdAt)) / (1000 * 60 * 60 * 24)),
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

    // ✅ Update invoice status - use snake_case fields
    invoice.payment_status = 'paid';
    invoice.status = 'paid';
    invoice.payment_date = new Date();
    if (paymentMethod) {
      invoice.payment_method = paymentMethod;
    }
    if (paymentNotes) {
      invoice.notes = `${invoice.notes}\n\nPayment Notes: ${paymentNotes}`;
    }

    await invoice.save();

    logger.info('invoice:markOfflinePaid:success', {
      invoiceId,
      payment_status: invoice.payment_status,
      status: invoice.status,
    });

    res.json({
      success: true,
      message: 'Invoice marked as paid successfully',
      data: {
        id: invoice._id.toString(),
        invoice_number: invoice.invoice_number,
        payment_status: invoice.payment_status,
        status: invoice.status,
        payment_date: invoice.payment_date,
      },
    });
  } catch (error) {
    next(error);
  }
};
