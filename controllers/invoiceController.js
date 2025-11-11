const Invoice = require('../models/Invoice');
const Order = require('../models/Order');
const User = require('../models/User');
const CompanySettings = require('../models/CompanySettings');
const { generateInvoicePDF } = require('../utils/pdfGenerator');

/**
 * Create invoice from order
 */
exports.createInvoiceFromOrder = async (orderId, orderData, paymentData = null) => {
  try {
    // Generate invoice number
    const invoiceNumber = await Invoice.generateInvoiceNumber();

    // Calculate due date (30 days from issue date)
    const issueDate = new Date();
    const dueDate = new Date(issueDate);
    dueDate.setDate(dueDate.getDate() + 30);

    // Prepare invoice items from order items
    const items = (orderData.items || []).map(item => ({
      productId: item.product_id || item.productId,
      name: item.name || item.product_name,
      description: item.description,
      quantity: item.quantity,
      rate: item.price,
      amount: item.quantity * item.price,
    }));

    // Determine sale type and payment status
    const saleType = paymentData ? 'online' : 'offline';
    const isOnlinePaid = paymentData && (paymentData.status === 'captured' || paymentData.status === 'authorized');
    const paymentStatus = isOnlinePaid ? 'paid' : 'pending';
    const invoiceStatus = isOnlinePaid ? 'paid' : 'issued';

    // Get company settings for UPI QR code generation (for offline sales)
    let upiQrCode = null;
    let upiId = null;
    if (saleType === 'offline') {
      const companySettings = await CompanySettings.findOne().lean();
      upiId = companySettings?.upiId;
      
      // Generate UPI QR code if UPI ID exists
      if (upiId) {
        const QRCode = require('qrcode');
        const upiString = `upi://pay?pa=${upiId}&pn=${companySettings.companyName || 'Store'}&am=${orderData.total_amount}&cu=INR&tn=Invoice ${invoiceNumber}`;
        try {
          upiQrCode = await QRCode.toDataURL(upiString);
        } catch (qrError) {
          console.error('Error generating QR code:', qrError);
        }
      }
    }

    // Create invoice
    const invoice = await Invoice.create({
      invoiceNumber,
      orderId,
      userId: orderData.user_id || orderData.userId,
      items,
      subtotal: orderData.subtotal || orderData.total_amount || 0,
      tax: orderData.tax || 0,
      discount: orderData.discount_amount || orderData.discount || 0,
      coupon_discount: orderData.coupon_discount || 0,
      gift_price: orderData.gift_price || 0,
      shippingCharges: orderData.shipping_charges || orderData.shippingCharges || 0,
      delivery_charges: orderData.delivery_charges || 0,
      gst_amount: orderData.gst_amount || 0,
      total: orderData.total_amount || orderData.total || 0,
      issueDate,
      dueDate,
      paymentStatus,
      paymentMethod: paymentData?.payment_method || orderData.payment_method || 'UPI',
      paymentDate: isOnlinePaid ? new Date() : null,
      razorpay_payment_id: paymentData?.razorpay_payment_id || null,
      razorpay_order_id: paymentData?.razorpay_order_id || null,
      sale_type: saleType,
      upi_qr_code: upiQrCode,
      upi_id: upiId,
      billingAddress: orderData.billing_address || orderData.billingAddress,
      shippingAddress: orderData.shipping_address || orderData.shippingAddress,
      notes: orderData.notes || 'Thank you for your order!',
      terms: 'Payment due within 30 days. All sales are final.',
      status: invoiceStatus,
    });

    return invoice;
  } catch (error) {
    console.error('Error creating invoice from order:', error);
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
 * Get user's invoices
 */
exports.getUserInvoices = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const query = { userId };

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

    const invoice = await Invoice.findById(invoiceId)
      .populate('userId', 'name email phone')
      .populate('orderId', 'order_number')
      .lean();

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
    }

    // Check permissions (user can only see their own invoices, admin can see all)
    if (userRole !== 'admin' && invoice.userId._id.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const formattedInvoice = {
      id: invoice._id.toString(),
      invoiceNumber: invoice.invoiceNumber,
      orderId: invoice.orderId?._id?.toString(),
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

    res.json({
      success: true,
      data: formattedInvoice,
    });
  } catch (error) {
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

    const invoice = await Invoice.findById(invoiceId)
      .populate('userId', 'name email phone')
      .populate('orderId')
      .lean();

    if (!invoice) {
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
  } catch (error) {
    console.error('Error generating invoice PDF:', error);
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

    const invoice = await Invoice.findById(invoiceId);

    if (!invoice) {
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

    const invoice = await Invoice.findByIdAndDelete(invoiceId);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
    }

    res.json({
      success: true,
      message: 'Invoice deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get next invoice number
 */
exports.getNextInvoiceNumber = async (req, res, next) => {
  try {
    const nextNumber = await Invoice.generateInvoiceNumber();

    res.json({
      success: true,
      nextNumber,
    });
  } catch (error) {
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
