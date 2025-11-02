const Expense = require('../models/Expense');

/**
 * Get all expenses
 */
exports.getExpenses = async (req, res, next) => {
  try {
    const { category, startDate, endDate, vendor } = req.query;

    let query = {};

    if (category) {
      query.category = category;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(startDate);
      }
      if (endDate) {
        query.date.$lte = new Date(endDate);
      }
    }

    if (vendor) {
      query.vendor = new RegExp(vendor, 'i');
    }

    const expenses = await Expense.find(query).sort({ date: -1 });

    res.status(200).json({
      success: true,
      count: expenses.length,
      data: expenses,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single expense by ID
 */
exports.getExpenseById = async (req, res, next) => {
  try {
    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found',
      });
    }

    res.status(200).json({
      success: true,
      data: expense,
    });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Expense not found',
      });
    }
    next(error);
  }
};

/**
 * Create new expense
 */
exports.createExpense = async (req, res, next) => {
  try {
    const { date, category, description, amount, paymentMethod, vendor, invoiceNumber, notes } = req.body;

    if (!category || !description || !amount || !vendor) {
      return res.status(400).json({
        success: false,
        message: 'Category, description, amount, and vendor are required',
      });
    }

    const expense = await Expense.create({
      date: date ? new Date(date) : new Date(),
      category,
      description,
      amount,
      paymentMethod: paymentMethod || 'cash',
      vendor,
      invoiceNumber: invoiceNumber || '',
      notes: notes || '',
    });

    res.status(201).json({
      success: true,
      data: expense,
      message: 'Expense created successfully',
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
 * Update expense by ID
 */
exports.updateExpense = async (req, res, next) => {
  try {
    const { date, category, description, amount, paymentMethod, vendor, invoiceNumber, notes } = req.body;

    const updateData = {};
    if (date) updateData.date = new Date(date);
    if (category) updateData.category = category;
    if (description) updateData.description = description;
    if (amount) updateData.amount = amount;
    if (paymentMethod) updateData.paymentMethod = paymentMethod;
    if (vendor) updateData.vendor = vendor;
    if (invoiceNumber !== undefined) updateData.invoiceNumber = invoiceNumber;
    if (notes !== undefined) updateData.notes = notes;

    const expense = await Expense.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found',
      });
    }

    res.status(200).json({
      success: true,
      data: expense,
      message: 'Expense updated successfully',
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
        message: 'Expense not found',
      });
    }
    next(error);
  }
};

/**
 * Delete expense by ID
 */
exports.deleteExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findByIdAndDelete(req.params.id);

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Expense deleted successfully',
      data: {},
    });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Expense not found',
      });
    }
    next(error);
  }
};

/**
 * Get expense statistics
 */
exports.getExpenseStats = async (req, res, next) => {
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

    const expenses = await Expense.find(query);

    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const expenseCount = expenses.length;

    const categoryBreakdown = {};
    expenses.forEach((expense) => {
      if (!categoryBreakdown[expense.category]) {
        categoryBreakdown[expense.category] = 0;
      }
      categoryBreakdown[expense.category] += expense.amount;
    });

    res.status(200).json({
      success: true,
      data: {
        totalExpenses,
        expenseCount,
        averageExpense: expenseCount > 0 ? totalExpenses / expenseCount : 0,
        categoryBreakdown,
      },
    });
  } catch (error) {
    next(error);
  }
};
