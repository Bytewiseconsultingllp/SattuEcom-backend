const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const OfflineSale = require('../models/OfflineSale');
const Expense = require('../models/Expense');
const User = require('../models/User');
const Product = require('../models/Product');
const Payment = require('../models/Payment');
const ReportSchedule = require('../models/ReportSchedule');
const ReportHistory = require('../models/ReportHistory');
// const PDFDocument = require('pdfkit');
// const ExcelJS = require('exceljs');
// const { Parser } = require('json2csv');
// Note: Excel and CSV generation will be implemented in frontend or as future enhancement

/**
 * Helper function to parse date range
 */
const parseDateRange = (dateRange, startDate, endDate) => {
  const now = new Date();
  let start, end, label;

  switch (dateRange) {
    case 'today':
      start = new Date(now.setHours(0, 0, 0, 0));
      end = new Date(now.setHours(23, 59, 59, 999));
      label = 'Today';
      break;
    case 'yesterday':
      start = new Date(now.setDate(now.getDate() - 1));
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setHours(23, 59, 59, 999);
      label = 'Yesterday';
      break;
    case 'last-7-days':
      start = new Date(now.setDate(now.getDate() - 7));
      end = new Date();
      label = 'Last 7 Days';
      break;
    case 'last-30-days':
      start = new Date(now.setDate(now.getDate() - 30));
      end = new Date();
      label = 'Last 30 Days';
      break;
    case 'this-month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date();
      label = 'This Month';
      break;
    case 'last-month':
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0);
      label = 'Last Month';
      break;
    case 'this-quarter':
      const quarter = Math.floor(now.getMonth() / 3);
      start = new Date(now.getFullYear(), quarter * 3, 1);
      end = new Date();
      label = 'This Quarter';
      break;
    case 'this-year':
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date();
      label = 'This Year';
      break;
    case 'custom':
      if (startDate && endDate) {
        start = new Date(startDate);
        end = new Date(endDate);
        label = `${startDate} to ${endDate}`;
      } else {
        start = null;
        end = null;
        label = 'All Time';
      }
      break;
    default:
      start = null;
      end = null;
      label = 'All Time';
  }

  return { start, end, label };
};

/**
 * Generate Sales Report Data
 */
const getSalesReportData = async (dateRange) => {
  try {
    const matchStage = {};
    if (dateRange.start && dateRange.end) {
      matchStage.createdAt = { $gte: dateRange.start, $lte: dateRange.end };
    }

    // Online sales
    const onlineOrders = await Order.find({
      ...matchStage,
      status: 'delivered',
      sale_type: 'online'
    })
      .populate('user_id', 'name email')
      .populate('order_items')
      .lean();

    // Offline sales
    const offlineSales = await OfflineSale.find(matchStage).lean();

    const onlineTotal = onlineOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
    const offlineTotal = offlineSales.reduce((sum, sale) => sum + (sale.totalAmount || 0), 0);

    return {
      onlineOrders,
      offlineSales,
      onlineTotal,
      offlineTotal,
      totalSales: onlineTotal + offlineTotal,
      onlineCount: onlineOrders.length,
      offlineCount: offlineSales.length
    };
  } catch (error) {
    throw new Error('Failed to generate sales report data: ' + error.message);
  }
};

/**
 * Generate Orders Report Data
 */
const getOrdersReportData = async (dateRange) => {
  try {
    const matchStage = {};
    if (dateRange.start && dateRange.end) {
      matchStage.createdAt = { $gte: dateRange.start, $lte: dateRange.end };
    }

    const orders = await Order.find(matchStage)
      .populate('user_id', 'name email phone')
      .populate('shipping_address_id')
      .populate('order_items')
      .sort({ createdAt: -1 })
      .lean();

    const statusBreakdown = orders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {});

    const totalRevenue = orders
      .filter(o => o.status === 'delivered')
      .reduce((sum, order) => sum + (order.total_amount || 0), 0);

    return {
      orders,
      totalOrders: orders.length,
      statusBreakdown,
      totalRevenue,
      averageOrderValue: orders.length > 0 ? totalRevenue / orders.length : 0
    };
  } catch (error) {
    throw new Error('Failed to generate orders report data: ' + error.message);
  }
};

/**
 * Generate Customers Report Data
 */
const getCustomersReportData = async (dateRange) => {
  try {
    const matchStage = { role: 'user' };
    if (dateRange.start && dateRange.end) {
      matchStage.createdAt = { $gte: dateRange.start, $lte: dateRange.end };
    }

    const customers = await User.find(matchStage)
      .select('-password -refreshToken')
      .lean();

    // Get order counts for each customer
    const customerIds = customers.map(c => c._id);
    const orderCounts = await Order.aggregate([
      { $match: { user_id: { $in: customerIds } } },
      { $group: { _id: '$user_id', orderCount: { $sum: 1 }, totalSpent: { $sum: '$total_amount' } } }
    ]);

    const orderCountMap = orderCounts.reduce((acc, item) => {
      acc[item._id.toString()] = { orderCount: item.orderCount, totalSpent: item.totalSpent };
      return acc;
    }, {});

    const enrichedCustomers = customers.map(customer => ({
      ...customer,
      orderCount: orderCountMap[customer._id.toString()]?.orderCount || 0,
      totalSpent: orderCountMap[customer._id.toString()]?.totalSpent || 0
    }));

    return {
      customers: enrichedCustomers,
      totalCustomers: customers.length,
      verifiedCustomers: customers.filter(c => c.isVerified).length,
      activeCustomers: customers.filter(c => c.isActive).length
    };
  } catch (error) {
    throw new Error('Failed to generate customers report data: ' + error.message);
  }
};

/**
 * Generate Revenue Report Data
 */
const getRevenueReportData = async (dateRange) => {
  try {
    const matchStage = {};
    if (dateRange.start && dateRange.end) {
      matchStage.createdAt = { $gte: dateRange.start, $lte: dateRange.end };
    }

    const orders = await Order.aggregate([
      { $match: { ...matchStage, status: 'delivered' } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          revenue: { $sum: '$total_amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    const totalRevenue = orders.reduce((sum, item) => sum + item.revenue, 0);

    return {
      monthlyRevenue: orders,
      totalRevenue,
      averageMonthlyRevenue: orders.length > 0 ? totalRevenue / orders.length : 0
    };
  } catch (error) {
    throw new Error('Failed to generate revenue report data: ' + error.message);
  }
};

/**
 * Generate Tax Report Data
 */
const getTaxReportData = async (dateRange) => {
  try {
    const matchStage = {};
    if (dateRange.start && dateRange.end) {
      matchStage.createdAt = { $gte: dateRange.start, $lte: dateRange.end };
    }

    const orders = await Order.find({
      ...matchStage,
      status: 'delivered'
    })
      .select('invoice_number total_amount tax_amount tax_rate createdAt')
      .lean();

    const totalTax = orders.reduce((sum, order) => sum + (order.tax_amount || 0), 0);
    const totalSales = orders.reduce((sum, order) => sum + (order.total_amount || 0), 0);

    return {
      orders,
      totalTax,
      totalSales,
      taxableAmount: totalSales - totalTax,
      orderCount: orders.length
    };
  } catch (error) {
    throw new Error('Failed to generate tax report data: ' + error.message);
  }
};

/**
 * @route   POST /api/admin/reports/generate
 * @desc    Generate a report on-demand
 * @access  Admin
 */
exports.generateReport = async (req, res) => {
  try {
    const { reportType, format, dateRange, startDate, endDate } = req.body;

    if (!reportType || !format) {
      return res.status(400).json({
        success: false,
        message: 'Report type and format are required'
      });
    }

    const range = parseDateRange(dateRange, startDate, endDate);
    let reportData;

    // Generate report data based on type
    switch (reportType) {
      case 'sales':
        reportData = await getSalesReportData(range);
        break;
      case 'orders':
        reportData = await getOrdersReportData(range);
        break;
      case 'customers':
        reportData = await getCustomersReportData(range);
        break;
      case 'revenue':
        reportData = await getRevenueReportData(range);
        break;
      case 'tax':
        reportData = await getTaxReportData(range);
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid report type'
        });
    }

    // Save to history
    const history = await ReportHistory.create({
      report_type: reportType,
      format,
      date_range: {
        start_date: range.start,
        end_date: range.end,
        label: range.label
      },
      generated_by: req.user._id,
      is_scheduled: false,
      status: 'completed'
    });

    res.json({
      success: true,
      message: 'Report generated successfully',
      data: {
        reportData,
        historyId: history._id
      }
    });
  } catch (error) {
    console.error('Generate report error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate report'
    });
  }
};

/**
 * @route   POST /api/admin/reports/schedule
 * @desc    Schedule automated reports
 * @access  Admin
 */
exports.scheduleReport = async (req, res) => {
  try {
    const { reportTypes, frequency, emailRecipients, formats } = req.body;

    if (!reportTypes || !frequency || !emailRecipients || !formats) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Calculate next run date based on frequency
    const now = new Date();
    let nextRun;

    switch (frequency) {
      case 'daily':
        nextRun = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        break;
      case 'weekly':
        nextRun = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        nextRun = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
        break;
      case 'quarterly':
        nextRun = new Date(now.getFullYear(), now.getMonth() + 3, now.getDate());
        break;
      default:
        nextRun = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }

    const schedule = await ReportSchedule.create({
      report_types: reportTypes,
      frequency,
      email_recipients: emailRecipients,
      formats,
      next_run: nextRun,
      created_by: req.user._id
    });

    res.status(201).json({
      success: true,
      message: 'Report schedule created successfully',
      data: schedule
    });
  } catch (error) {
    console.error('Schedule report error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to schedule report'
    });
  }
};

/**
 * @route   GET /api/admin/reports/schedules
 * @desc    Get all report schedules
 * @access  Admin
 */
exports.getSchedules = async (req, res) => {
  try {
    const schedules = await ReportSchedule.find()
      .populate('created_by', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: schedules
    });
  } catch (error) {
    console.error('Get schedules error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch schedules'
    });
  }
};

/**
 * @route   PUT /api/admin/reports/schedules/:id
 * @desc    Update a report schedule
 * @access  Admin
 */
exports.updateSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const schedule = await ReportSchedule.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    );

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    res.json({
      success: true,
      message: 'Schedule updated successfully',
      data: schedule
    });
  } catch (error) {
    console.error('Update schedule error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update schedule'
    });
  }
};

/**
 * @route   DELETE /api/admin/reports/schedules/:id
 * @desc    Delete a report schedule
 * @access  Admin
 */
exports.deleteSchedule = async (req, res) => {
  try {
    const { id } = req.params;

    const schedule = await ReportSchedule.findByIdAndDelete(id);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    res.json({
      success: true,
      message: 'Schedule deleted successfully'
    });
  } catch (error) {
    console.error('Delete schedule error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete schedule'
    });
  }
};

/**
 * @route   GET /api/admin/reports/history
 * @desc    Get report generation history
 * @access  Admin
 */
exports.getHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20, reportType } = req.query;

    const query = {};
    if (reportType) {
      query.report_type = reportType;
    }

    const history = await ReportHistory.find(query)
      .populate('generated_by', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await ReportHistory.countDocuments(query);

    res.json({
      success: true,
      data: {
        history,
        totalPages: Math.ceil(count / limit),
        currentPage: parseInt(page),
        total: count
      }
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch history'
    });
  }
};

/**
 * @route   POST /api/admin/reports/download-all
 * @desc    Download all reports as ZIP
 * @access  Admin
 */
exports.downloadAllReports = async (req, res) => {
  try {
    const { dateRange, startDate, endDate } = req.body;
    const range = parseDateRange(dateRange, startDate, endDate);

    // Generate all reports
    const reportTypes = ['sales', 'orders', 'customers', 'profit-loss', 'revenue', 'expenses', 'tax'];
    const reports = {};

    for (const type of reportTypes) {
      try {
        let data;
        switch (type) {
          case 'sales':
            data = await getSalesReportData(range);
            break;
          case 'orders':
            data = await getOrdersReportData(range);
            break;
          case 'customers':
            data = await getCustomersReportData(range);
            break;
          case 'revenue':
            data = await getRevenueReportData(range);
            break;
          case 'tax':
            data = await getTaxReportData(range);
            break;
          case 'expenses':
            const expenses = await Expense.find(
              range.start && range.end 
                ? { createdAt: { $gte: range.start, $lte: range.end } }
                : {}
            ).lean();
            data = {
              expenses,
              totalExpenses: expenses.reduce((sum, e) => sum + e.amount, 0)
            };
            break;
          case 'profit-loss':
            const salesData = await getSalesReportData(range);
            const expensesData = await Expense.find(
              range.start && range.end 
                ? { createdAt: { $gte: range.start, $lte: range.end } }
                : {}
            ).lean();
            data = {
              totalSales: salesData.totalSales,
              totalExpenses: expensesData.reduce((sum, e) => sum + e.amount, 0),
              netProfit: salesData.totalSales - expensesData.reduce((sum, e) => sum + e.amount, 0)
            };
            break;
        }
        reports[type] = data;
      } catch (err) {
        console.error(`Error generating ${type} report:`, err);
      }
    }

    res.json({
      success: true,
      message: 'All reports data generated',
      data: reports
    });
  } catch (error) {
    console.error('Download all reports error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to download all reports'
    });
  }
};
