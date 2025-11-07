const OfflineSale = require('../models/OfflineSale');
const User = require('../models/User');
const Order = require('../models/Order');
const crypto = require('crypto');
const { sendPasswordResetEmail } = require('../utils/emailService');

// Generate random password
const generatePassword = () => crypto.randomBytes(8).toString('hex');

/**
 * Get all offline sales with pagination
 */
exports.getOfflineSales = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 100);
    const { startDate, endDate, paymentMethod, gstType, q } = req.query;

    let query = {};
    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(startDate);
      }
      if (endDate) {
        query.date.$lte = new Date(endDate);
      }
    }

    if (paymentMethod) {
      query.paymentMethod = paymentMethod;
    }

    if (gstType) {
      query.gstType = gstType;
    }

    if (q) {
      const regex = new RegExp(String(q).trim(), 'i');
      query.$or = [
        { customerName: regex },
        { customerPhone: regex },
        { customerEmail: regex },
        { invoiceNumber: regex },
      ];
    }

    const [sales, total] = await Promise.all([
      OfflineSale.find(query)
        .sort({ date: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      OfflineSale.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      count: sales.length,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: sales,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Return registration status for a list of emails
 * GET /admin/offline-sales/registered-status?emails=a@b.com,c@d.com
 */
exports.getRegistrationStatus = async (req, res, next) => {
  try {
    let emailsParam = req.query.emails;
    let emails = [];
    if (Array.isArray(emailsParam)) {
      emails = emailsParam;
    } else if (typeof emailsParam === 'string') {
      emails = emailsParam.split(',');
    }
    emails = emails
      .map((e) => String(e || '').toLowerCase().trim())
      .filter(Boolean);

    if (emails.length === 0) {
      return res.status(200).json({ success: true, data: {} });
    }

    const users = await User.find({ email: { $in: emails } }, { email: 1 }).lean();
    const set = new Set(users.map((u) => String(u.email).toLowerCase()));
    const map = {};
    emails.forEach((e) => { map[e] = set.has(e); });

    return res.status(200).json({ success: true, data: map });
  } catch (error) {
    next(error);
  }
};

/**
 * Send password-reset email for a single offline sale's customer
 */
exports.sendCredentialForSale = async (req, res, next) => {
  try {
    const sale = await OfflineSale.findById(req.params.id);
    if (!sale) {
      return res.status(404).json({ success: false, message: 'Offline sale not found' });
    }
    if (!sale.customerEmail) {
      return res.status(400).json({ success: false, message: 'Sale has no customer email' });
    }

    await sendPasswordResetEmail(sale.customerEmail, sale.customerName || '');

    return res.status(200).json({ success: true, message: 'Password reset email sent' });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk send password-reset emails to customers created via offline flows
 * Body: { emails?: string[], startDate?: ISOString, endDate?: ISOString, ratePerMinute?: number }
 */
exports.sendCredentialsBulk = async (req, res, next) => {
  try {
    const { emails, startDate, endDate, ratePerMinute } = req.body || {};
    const rate = Math.max(parseInt(ratePerMinute, 10) || 20, 1);
    const delayMs = Math.floor(60000 / rate);

    let users = [];
    if (Array.isArray(emails) && emails.length > 0) {
      const unique = [...new Set(emails.map((e) => String(e).toLowerCase().trim()))].filter(Boolean);
      users = await User.find({ email: { $in: unique } });
    } else {
      const query = {};
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
      }
      users = await User.find(query);
    }

    let sent = 0;
    let failed = 0;
    for (const u of users) {
      try {
        await sendPasswordResetEmail(u.email, u.name || '');
        sent += 1;
      } catch (e) {
        failed += 1;
      }
      // throttle between emails
      await new Promise((r) => setTimeout(r, delayMs));
    }

    return res.status(200).json({ success: true, data: { targeted: users.length, sent, failed, ratePerMinute: rate } });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single offline sale by ID
 */
exports.getOfflineSaleById = async (req, res, next) => {
  try {
    const sale = await OfflineSale.findById(req.params.id);

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Offline sale not found',
      });
    }

    res.status(200).json({
      success: true,
      data: sale,
    });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Offline sale not found',
      });
    }
    next(error);
  }
};

/**
 * Create new offline sale
 */
exports.createOfflineSale = async (req, res, next) => {
  try {
    const { date, customerName, customerPhone, customerEmail, items, totalAmount, finalAmount, discount, gstType, invoiceNumber, paymentMethod, notes } = req.body;

    if (!customerName || !customerPhone || !customerEmail || !items || items.length === 0 || !totalAmount) {
      return res.status(400).json({
        success: false,
        message: 'Customer name, phone, email, items, and total amount are required',
      });
    }

    // Validate GST invoice number if GST type is selected
    if (gstType === 'gst' && !invoiceNumber) {
      return res.status(400).json({
        success: false,
        message: 'Invoice number is required for GST sales',
      });
    }

    const sale = await OfflineSale.create({
      date: date ? new Date(date) : new Date(),
      customerName,
      customerPhone,
      customerEmail,
      items,
      totalAmount,
      finalAmount: finalAmount || totalAmount,
      discount: discount || 0,
      gstType: gstType || 'non-gst',
      invoiceNumber: invoiceNumber || '',
      paymentMethod: paymentMethod || 'cash',
      notes: notes || '',
    });

    // Create or get customer
    let user = await User.findOne({ email: customerEmail });
    let isNewCustomer = false;

    if (!user) {
      isNewCustomer = true;
      const tempPassword = generatePassword();
      const hashedPassword = require('bcryptjs').hashSync(tempPassword, 10);

      user = await User.create({
        name: customerName,
        email: customerEmail,
        phone: customerPhone,
        password: hashedPassword,
        role: 'user',
      });

      // Send password reset email (skip if bulk import suppresses email)
      const suppressEmail = Boolean(req.body && req.body.suppressEmail);
      if (!suppressEmail) {
        try {
          await sendPasswordResetEmail(customerEmail, customerName);
        } catch (e) {
          // do not block sale creation on email errors during normal flow
        }
      }
    }
    // Create order from offline sale (minimal fields per Order schema)
    const order = await Order.create({
      user_id: user._id,
      total_amount: finalAmount || totalAmount,
      status: 'delivered',
    });

    res.status(201).json({
      success: true,
      data: {
        sale,
        customer: user,
        order,
        isNewCustomer,
      },
      message: isNewCustomer 
        ? 'Offline sale created, customer created, and welcome email sent'
        : 'Offline sale and order created successfully',
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', '),
      });
    }
    next(error);
  }
};

/**
 * Update offline sale by ID
 */
exports.updateOfflineSale = async (req, res, next) => {
  try {
    const { date, customerName, customerPhone, customerEmail, items, totalAmount, finalAmount, discount, gstType, invoiceNumber, paymentMethod, notes } = req.body;

    // Validate GST invoice number if GST type is selected
    if (gstType === 'gst' && !invoiceNumber) {
      return res.status(400).json({
        success: false,
        message: 'Invoice number is required for GST sales',
      });
    }

    const updateData = {};
    if (date) updateData.date = new Date(date);
    if (customerName) updateData.customerName = customerName;
    if (customerPhone) updateData.customerPhone = customerPhone;
    if (customerEmail) updateData.customerEmail = customerEmail;
    if (items) updateData.items = items;
    if (totalAmount) updateData.totalAmount = totalAmount;
    if (finalAmount !== undefined) updateData.finalAmount = finalAmount;
    if (discount !== undefined) updateData.discount = discount;
    if (gstType) updateData.gstType = gstType;
    if (invoiceNumber !== undefined) updateData.invoiceNumber = invoiceNumber;
    if (paymentMethod) updateData.paymentMethod = paymentMethod;
    if (notes !== undefined) updateData.notes = notes;

    const sale = await OfflineSale.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Offline sale not found',
      });
    }

    res.status(200).json({
      success: true,
      data: sale,
      message: 'Offline sale updated successfully',
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', '),
      });
    }
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Offline sale not found',
      });
    }
    next(error);
  }
};

/**
 * Delete offline sale by ID
 */
exports.deleteOfflineSale = async (req, res, next) => {
  try {
    const sale = await OfflineSale.findByIdAndDelete(req.params.id);

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Offline sale not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Offline sale deleted successfully',
      data: {},
    });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Offline sale not found',
      });
    }
    next(error);
  }
};

/**
 * Get offline sales statistics
 */
exports.getOfflineSalesStats = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    let query = {};

    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(startDate);
      }
      if (endDate) {
        query.date.$lte = new Date(endDate);
      }
    }

    const sales = await OfflineSale.find(query);

    const totalSales = sales.length;
    // Use finalAmount if available, otherwise use totalAmount
    const totalRevenue = sales.reduce((sum, sale) => sum + (sale.finalAmount || sale.totalAmount), 0);
    const totalDiscount = sales.reduce((sum, sale) => sum + (sale.discount || 0), 0);
    const averageOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;

    const gstBreakdown = { gst: 0, nonGst: 0 };
    const paymentMethodBreakdown = {};
    
    sales.forEach((sale) => {
      // GST breakdown
      if (sale.gstType === 'gst') {
        gstBreakdown.gst += sale.finalAmount || sale.totalAmount;
      } else {
        gstBreakdown.nonGst += sale.finalAmount || sale.totalAmount;
      }

      // Payment method breakdown
      if (!paymentMethodBreakdown[sale.paymentMethod]) {
        paymentMethodBreakdown[sale.paymentMethod] = 0;
      }
      paymentMethodBreakdown[sale.paymentMethod] += sale.finalAmount || sale.totalAmount;
    });

    res.status(200).json({
      success: true,
      data: {
        totalSales,
        totalRevenue,
        totalDiscount,
        averageOrderValue,
        gstBreakdown,
        paymentMethodBreakdown,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Export offline sales based on time period
 */
exports.exportOfflineSales = async (req, res, next) => {
  try {
    const { period } = req.query; // weekly, monthly, quarterly, annually
    
    let startDate = new Date();
    const endDate = new Date();

    switch (period) {
      case 'weekly':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'monthly':
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      case 'quarterly':
        startDate.setMonth(endDate.getMonth() - 3);
        break;
      case 'annually':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(endDate.getDate() - 7); // Default to weekly
    }

    const sales = await OfflineSale.find({
      date: { $gte: startDate, $lte: endDate },
    }).sort({ date: -1 });

    // Generate CSV
    const headers = [
      'Date',
      'Customer Name',
      'Phone',
      'Email',
      'Items',
      'Quantity',
      'Price',
      'Total Amount',
      'Discount',
      'Final Amount',
      'GST Type',
      'Invoice Number',
      'Payment Method',
      'Notes',
    ];

    let csvContent = headers.join(',') + '\n';

    sales.forEach((sale) => {
      const itemsStr = sale.items.map((i) => i.product).join('; ');
      const qtyStr = sale.items.map((i) => i.quantity).join('; ');
      const priceStr = sale.items.map((i) => i.price).join('; ');

      csvContent += [
        new Date(sale.date).toISOString().split('T')[0],
        `"${sale.customerName}"`,
        sale.customerPhone,
        sale.customerEmail,
        `"${itemsStr}"`,
        `"${qtyStr}"`,
        `"${priceStr}"`,
        sale.totalAmount,
        sale.discount || 0,
        sale.finalAmount || sale.totalAmount,
        sale.gstType,
        sale.invoiceNumber || '',
        sale.paymentMethod,
        `"${sale.notes || ''}"`,
      ].join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="offline-sales-${period}-${new Date().toISOString().split('T')[0]}.csv"`
    );
    res.send(csvContent);
  } catch (error) {
    next(error);
  }
};
