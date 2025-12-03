const OfflineSale = require('../models/OfflineSale');
const User = require('../models/User');
const Order = require('../models/Order');
const Invoice = require('../models/Invoice');
const crypto = require('crypto');
const { sendPasswordResetEmail } = require('../utils/emailService');
const { createInvoiceFromOrder } = require('./invoiceController');
const logger = require('../utils/logger');

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

    // ✅ FIX: Use snake_case field names for queries
    if (paymentMethod) {
      query.payment_method = paymentMethod;
    }

    if (gstType) {
      query.gst_type = gstType;
    }

    if (q) {
      const regex = new RegExp(String(q).trim(), 'i');
      query.$or = [
        { customer_name: regex },
        { customer_phone: regex },
        { customer_email: regex },
        { invoice_number: regex },
      ];
    }

    logger.info('offlineSales:list:start', {
      page,
      limit,
      filters: {
        startDate,
        endDate,
        paymentMethod,
        gstType,
        hasSearch: Boolean(q),
      },
    });

    const [sales, total] = await Promise.all([
      OfflineSale.find(query)
        .sort({ date: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      OfflineSale.countDocuments(query),
    ]);

    // Fetch invoice status for sales that have invoices
    const salesWithInvoiceStatus = await Promise.all(
      sales.map(async (sale) => {
        if (sale.invoice_number) {
          try {
            const invoice = await Invoice.findOne({ invoice_number: sale.invoice_number })
              .select('payment_status sale_type')
              .lean();
            return {
              ...sale,
              invoice_payment_status: invoice?.payment_status || 'pending',
              invoice_sale_type: invoice?.sale_type || 'offline',
            };
          } catch (err) {
            logger.error('offlineSales:fetch_invoice_status:error', {
              invoice_number: sale.invoice_number,
              error: err.message,
            });
            return sale;
          }
        }
        return sale;
      })
    );

    logger.info('offlineSales:list:success', {
      page,
      limit,
      count: sales.length,
      total,
    });

    res.status(200).json({
      success: true,
      count: salesWithInvoiceStatus.length,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: salesWithInvoiceStatus,
    });
  } catch (error) {
    logger.error('offlineSales:list:error', {
      message: error.message,
      stack: error.stack,
    });
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

    await sendPasswordResetEmail(sale.customer_email, sale.customer_name || '');  // ✅ FIX: Use snake_case

    logger.info('offlineSales:send_credential_for_sale:success', {
      saleId: sale._id.toString(),
    });

    return res.status(200).json({ success: true, message: 'Password reset email sent' });
  } catch (error) {
    logger.error('offlineSales:send_credential_for_sale:error', {
      message: error.message,
      stack: error.stack,
      saleId: req.params.id,
    });
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

      logger.info('offlineSales:create:user_created', {
        userId: user._id.toString(),
        email: user.email,
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
    const { date, customerName, customerPhone, customerEmail, items, totalAmount, finalAmount, discount, gstType, paymentMethod, notes } = req.body;

    if (!customerName || !customerPhone || !customerEmail || !items || items.length === 0 || !totalAmount) {
      return res.status(400).json({
        success: false,
        message: 'Customer name, phone, email, items, and total amount are required',
      });
    }

    const parsedTotalAmount = Number(totalAmount) || 0;
    const parsedFinalAmount = finalAmount !== undefined ? Number(finalAmount) : parsedTotalAmount;

    logger.info('offlineSales:create:start', {
      gstType,
      totalAmount: parsedTotalAmount,
      finalAmount: parsedFinalAmount,
      itemsCount: items.length,
    });

    // ✅ FIX: Map camelCase from frontend to snake_case for model
    const sale = await OfflineSale.create({
      date: date ? new Date(date) : new Date(),
      customer_name: customerName,        // ✅ snake_case
      customer_phone: customerPhone,      // ✅ snake_case
      customer_email: customerEmail,      // ✅ snake_case
      items,
      total_amount: parsedTotalAmount,    // ✅ snake_case
      final_amount: parsedFinalAmount,    // ✅ snake_case
      discount: discount || 0,
      gst_type: gstType || 'non-gst',     // ✅ snake_case
      payment_method: paymentMethod || 'cash',  // ✅ snake_case
      notes: notes || '',
    });

    logger.info('offlineSales:create:sale_created', {
      saleId: sale._id.toString(),
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
          logger.info('offlineSales:create:welcome_email_sent', {
            userId: user._id.toString(),
          });
        } catch (e) {
          // do not block sale creation on email errors during normal flow
          logger.error('offlineSales:create:welcome_email_failed', {
            message: e?.message,
          });
        }
      }
    }
    // Create order from offline sale (minimal fields per Order schema)
    const order = await Order.create({
      user_id: user._id,
      total_amount: parsedFinalAmount || parsedTotalAmount,
      status: 'delivered',
    });

    logger.info('offlineSales:create:order_created', {
      orderId: order._id.toString(),
      userId: user._id.toString(),
      saleId: sale._id.toString(),
    });

    let invoice = null;
    // ✅ FIX: Use snake_case field from model
    if ((sale.gst_type || '').toLowerCase() === 'gst') {
      try {
        logger.info('offlineSales:create:creating_invoice', {
          saleId: sale._id.toString(),
          orderId: order._id.toString(),
          gst_type: sale.gst_type,  // ✅ snake_case
        });
        // ✅ FIX: Use snake_case for all fields matching Invoice model
        const invoicePayload = {
          user_id: user._id,
          items: (sale.items || []).map((item) => ({
            name: item.product,
            description: item.description || '',
            quantity: item.quantity,
            price: item.price,
          })),
          subtotal: sale.total_amount,          // ✅ Use snake_case from model
          discount_amount: sale.discount || 0,
          coupon_discount: 0,
          gift_price: 0,
          delivery_charges: 0,
          tax_amount: sale.tax || 0,
          total_amount: sale.final_amount,      // ✅ Use snake_case from model
          payment_status: 'pending',
          payment_method: sale.payment_method || paymentMethod || 'cash',  // ✅ Use snake_case
          billing_address: {
            full_name: sale.customer_name,      // ✅ Use snake_case from model
            phone: sale.customer_phone,         // ✅ Use snake_case from model
            address_line1: 'Offline sale purchase',
          },
          shipping_address: {
            full_name: sale.customer_name,      // ✅ Use snake_case from model
            phone: sale.customer_phone,         // ✅ Use snake_case from model
            address_line1: 'Offline sale purchase',
          },
          notes: sale.notes || 'Thank you for your purchase!',
          sale_type: 'offline',  // ✅ REQUIRED FIELD
        };

        invoice = await createInvoiceFromOrder(order._id, invoicePayload, null);

        logger.info('offlineSales:create:invoice_created', {
          saleId: sale._id.toString(),
          orderId: order._id.toString(),
          invoiceId: invoice._id.toString(),
          invoice_number: invoice.invoice_number,  // ✅ Use snake_case
        });

        // ✅ FIX: Use snake_case for invoice_number field
        order.invoice_id = invoice._id;
        order.invoice_number = invoice.invoice_number;
        await order.save();

        sale.invoice_number = invoice.invoice_number;  // ✅ Use snake_case field
        await sale.save();
      } catch (invoiceError) {
        logger.error('offlineSales:create:invoice_creation_failed', {
          message: invoiceError?.message,
          stack: invoiceError?.stack,
          saleId: sale._id.toString(),
          orderId: order._id.toString(),
        });
      }
    }

    res.status(201).json({
      success: true,
      data: {
        sale,
        customer: user,
        order,
        invoice: invoice
          ? {
              id: invoice._id.toString(),
              invoice_number: invoice.invoice_number,
            }
          : null,
        isNewCustomer,
      },
      message: isNewCustomer 
        ? 'Offline sale created, customer created, and welcome email sent'
        : 'Offline sale and order created successfully',
    });
    logger.info('offlineSales:create:success', {
      saleId: sale._id.toString(),
      orderId: order._id.toString(),
      invoiceNumber: sale.invoiceNumber || null,
      isNewCustomer,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', '),
      });
    }
    logger.error('offlineSales:create:error', {
      message: error.message,
      stack: error.stack,
    });
    next(error);
  }
};

/**
 * Update offline sale by ID
 */
exports.updateOfflineSale = async (req, res, next) => {
  try {
    const { date, customerName, customerPhone, customerEmail, items, totalAmount, finalAmount, discount, gstType, paymentMethod, notes } = req.body;

    const updateData = {};
    if (date) updateData.date = new Date(date);
    if (customerName) updateData.customerName = customerName;
    if (customerPhone) updateData.customerPhone = customerPhone;
    if (customerEmail) updateData.customerEmail = customerEmail;
    if (items) updateData.items = items;
    if (totalAmount) updateData.totalAmount = totalAmount;
    if (finalAmount !== undefined) updateData.finalAmount = finalAmount;
    if (discount !== undefined) updateData.discount = discount;
    if (gstType) updateData.gst_type = gstType;  // ✅ FIX: Use snake_case
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
    const totalRevenue = sales.reduce((sum, sale) => sum + (sale.final_amount || sale.total_amount), 0);  // ✅ FIX: Use snake_case
    const totalDiscount = sales.reduce((sum, sale) => sum + (sale.discount || 0), 0);
    const averageOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;

    const gstBreakdown = { gst: 0, nonGst: 0 };
    const paymentMethodBreakdown = {};
    
    sales.forEach((sale) => {
      // GST breakdown - ✅ FIX: Use snake_case for all fields
      if (sale.gst_type === 'gst') {
        gstBreakdown.gst += sale.final_amount || sale.total_amount;
      } else {
        gstBreakdown.nonGst += sale.final_amount || sale.total_amount;  // ✅ FIX: Use snake_case
      }

      // Payment method breakdown - ✅ FIX: Use snake_case
      if (!paymentMethodBreakdown[sale.payment_method]) {
        paymentMethodBreakdown[sale.payment_method] = 0;
      }
      paymentMethodBreakdown[sale.payment_method] += sale.final_amount || sale.total_amount;
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
    const { period, gstType } = req.query; // weekly, monthly, quarterly, annually, optional gst/non-gst filter
    
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

    const findQuery = {
      date: { $gte: startDate, $lte: endDate },
    };

    // ✅ FIX: Use snake_case for query
    if (gstType) {
      findQuery.gst_type = gstType;
    }

    const sales = await OfflineSale.find(findQuery).sort({ date: -1 });

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

      // ✅ FIX: Use snake_case field names
      csvContent += [
        new Date(sale.date).toISOString().split('T')[0],
        `"${sale.customer_name}"`,
        sale.customer_phone,
        sale.customer_email,
        `"${itemsStr}"`,
        `"${qtyStr}"`,
        `"${priceStr}"`,
        sale.total_amount,
        sale.discount || 0,
        sale.final_amount || sale.total_amount,
        sale.gst_type,
        sale.invoice_number || '',
        sale.payment_method,
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
