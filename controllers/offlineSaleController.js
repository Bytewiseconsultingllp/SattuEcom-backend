const OfflineSale = require('../models/OfflineSale');

/**
 * Get all offline sales with pagination
 */
exports.getOfflineSales = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 100);
    const { startDate, endDate, paymentMethod } = req.query;

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
    const { date, customerName, customerPhone, items, totalAmount, paymentMethod, notes } = req.body;

    if (!customerName || !customerPhone || !items || items.length === 0 || !totalAmount) {
      return res.status(400).json({
        success: false,
        message: 'Customer name, phone, items, and total amount are required',
      });
    }

    const sale = await OfflineSale.create({
      date: date ? new Date(date) : new Date(),
      customerName,
      customerPhone,
      items,
      totalAmount,
      paymentMethod: paymentMethod || 'cash',
      notes: notes || '',
    });

    res.status(201).json({
      success: true,
      data: sale,
      message: 'Offline sale created successfully',
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
    const { date, customerName, customerPhone, items, totalAmount, paymentMethod, notes } = req.body;

    const updateData = {};
    if (date) updateData.date = new Date(date);
    if (customerName) updateData.customerName = customerName;
    if (customerPhone) updateData.customerPhone = customerPhone;
    if (items) updateData.items = items;
    if (totalAmount) updateData.totalAmount = totalAmount;
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
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const averageOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;

    const paymentMethodBreakdown = {};
    sales.forEach((sale) => {
      if (!paymentMethodBreakdown[sale.paymentMethod]) {
        paymentMethodBreakdown[sale.paymentMethod] = 0;
      }
      paymentMethodBreakdown[sale.paymentMethod] += sale.totalAmount;
    });

    res.status(200).json({
      success: true,
      data: {
        totalSales,
        totalRevenue,
        averageOrderValue,
        paymentMethodBreakdown,
      },
    });
  } catch (error) {
    next(error);
  }
};
