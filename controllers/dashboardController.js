const Order = require('../models/Order');
const OfflineSale = require('../models/OfflineSale');
const Expense = require('../models/Expense');
const User = require('../models/User');
const Product = require('../models/Product');
const Review = require('../models/Review');

/**
 * Get all dashboard statistics
 * Calculates: Total Revenue = Online Sales + Offline Sales
 */
exports.getStats = async (req, res, next) => {
  try {
    // Calculate online sales (from delivered orders)
    const onlineSalesResult = await Order.aggregate([
      { $match: { status: 'delivered' } },
      { $group: { _id: null, total: { $sum: '$total_amount' } } }
    ]);
    const onlineSales = onlineSalesResult[0]?.total || 0;

    // Calculate offline sales
    const offlineSalesResult = await OfflineSale.aggregate([
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const offlineSales = offlineSalesResult[0]?.total || 0;

    // Calculate expenses
    const expensesResult = await Expense.aggregate([
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const expenses = expensesResult[0]?.total || 0;

    // Calculate total revenue
    const totalRevenue = onlineSales + offlineSales;

    // Get counts
    const totalOrders = await Order.countDocuments();
    const totalCustomers = await User.countDocuments({ role: 'user' });
    const totalProducts = await Product.countDocuments();

    // Calculate percentage changes (compare with previous month)
    const previousMonth = new Date();
    previousMonth.setMonth(previousMonth.getMonth() - 1);

    const previousOnlineSales = await Order.aggregate([
      {
        $match: {
          status: 'delivered',
          created_at: { $gte: previousMonth }
        }
      },
      { $group: { _id: null, total: { $sum: '$total_amount' } } }
    ]);
    const prevOnline = previousOnlineSales[0]?.total || onlineSales;
    const revenueChange = prevOnline > 0 
      ? ((totalRevenue - prevOnline) / prevOnline) * 100 
      : 0;

    const previousOrders = await Order.countDocuments({
      created_at: { $gte: previousMonth }
    });
    const ordersChange = previousOrders > 0 
      ? ((totalOrders - previousOrders) / previousOrders) * 100 
      : 0;

    const previousCustomers = await User.countDocuments({
      role: 'user',
      createdAt: { $gte: previousMonth }
    });
    const customersChange = previousCustomers > 0 
      ? ((totalCustomers - previousCustomers) / previousCustomers) * 100 
      : 0;

    const previousProducts = await Product.countDocuments({
      createdAt: { $gte: previousMonth }
    });
    const productsChange = previousProducts > 0 
      ? ((totalProducts - previousProducts) / previousProducts) * 100 
      : 0;

    return res.json({
      success: true,
      data: {
        onlineSales: Math.round(onlineSales),
        offlineSales: Math.round(offlineSales),
        expenses: Math.round(expenses),
        totalRevenue: Math.round(totalRevenue),
        totalOrders,
        totalCustomers,
        totalProducts,
        revenueChange: parseFloat(revenueChange.toFixed(1)),
        ordersChange: parseFloat(ordersChange.toFixed(1)),
        customersChange: parseFloat(customersChange.toFixed(1)),
        productsChange: parseFloat(productsChange.toFixed(1))
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch dashboard statistics'
    });
  }
};

/**
 * Get online sales total
 * Filters: startDate, endDate
 */
exports.getOnlineSalesTotal = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    let matchStage = { status: 'delivered' };

    if (startDate || endDate) {
      matchStage.created_at = {};
      if (startDate) {
        matchStage.created_at.$gte = new Date(startDate);
      }
      if (endDate) {
        matchStage.created_at.$lte = new Date(endDate);
      }
    }

    const result = await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          total: { $sum: '$total_amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    const total = result[0]?.total || 0;
    const count = result[0]?.count || 0;

    return res.json({
      success: true,
      data: {
        total: Math.round(total),
        count,
        average: count > 0 ? Math.round(total / count) : 0
      }
    });
  } catch (error) {
    console.error('Online sales error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch online sales'
    });
  }
};

/**
 * Get offline sales total
 * Filters: startDate, endDate
 */
exports.getOfflineSalesTotal = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    let matchStage = {};

    if (startDate || endDate) {
      matchStage.date = {};
      if (startDate) {
        matchStage.date.$gte = new Date(startDate);
      }
      if (endDate) {
        matchStage.date.$lte = new Date(endDate);
      }
    }

    const result = await OfflineSale.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      }
    ]);

    const total = result[0]?.total || 0;
    const count = result[0]?.count || 0;

    return res.json({
      success: true,
      data: {
        total: Math.round(total),
        count,
        average: count > 0 ? Math.round(total / count) : 0
      }
    });
  } catch (error) {
    console.error('Offline sales error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch offline sales'
    });
  }
};

/**
 * Get expenses total
 * Filters: startDate, endDate
 */
exports.getExpensesTotal = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    let matchStage = {};

    if (startDate || endDate) {
      matchStage.date = {};
      if (startDate) {
        matchStage.date.$gte = new Date(startDate);
      }
      if (endDate) {
        matchStage.date.$lte = new Date(endDate);
      }
    }

    const result = await Expense.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    const total = result[0]?.total || 0;
    const count = result[0]?.count || 0;

    return res.json({
      success: true,
      data: {
        total: Math.round(total),
        count,
        average: count > 0 ? Math.round(total / count) : 0
      }
    });
  } catch (error) {
    console.error('Expenses error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch expenses'
    });
  }
};

/**
 * Get revenue overview data (Monthly)
 * Returns revenue and orders data for the last 12 months
 */
exports.getRevenueOverview = async (req, res, next) => {
  try {
    const months = 12;
    const revenueData = [];

    for (let i = months - 1; i >= 0; i--) {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - i);
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
      endDate.setHours(0, 0, 0, 0);

      // Get online sales for the month
      const onlineSalesResult = await Order.aggregate([
        {
          $match: {
            status: 'delivered',
            created_at: { $gte: startDate, $lt: endDate }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$total_amount' },
            count: { $sum: 1 }
          }
        }
      ]);

      // Get offline sales for the month
      const offlineSalesResult = await OfflineSale.aggregate([
        {
          $match: {
            date: { $gte: startDate, $lt: endDate }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$totalAmount' }
          }
        }
      ]);

      // Get expenses for the month
      const expensesResult = await Expense.aggregate([
        {
          $match: {
            date: { $gte: startDate, $lt: endDate }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]);

      const onlineSales = onlineSalesResult[0]?.total || 0;
      const offlineSales = offlineSalesResult[0]?.total || 0;
      const expenses = expensesResult[0]?.total || 0;
      const revenue = onlineSales + offlineSales - expenses;
      const orders = onlineSalesResult[0]?.count || 0;

      const monthName = startDate.toLocaleString('default', { month: 'short' });

      revenueData.push({
        month: monthName,
        revenue: Math.round(revenue),
        orders,
        online: Math.round(onlineSales),
        offline: Math.round(offlineSales),
        expenses: Math.round(expenses)
      });
    }

    return res.json({
      success: true,
      data: revenueData
    });
  } catch (error) {
    console.error('Revenue overview error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch revenue overview'
    });
  }
};

/**
 * Get top categories data
 * Returns top selling product categories
 */
exports.getTopCategories = async (req, res, next) => {
  try {
    const OrderItem = require('../models/OrderItem');
    const Product = require('../models/Product');

    const topCategories = await OrderItem.aggregate([
      {
        $lookup: {
          from: 'orders',
          localField: 'order_id',
          foreignField: '_id',
          as: 'order'
        }
      },
      { $unwind: '$order' },
      { $match: { 'order.status': 'delivered' } },
      {
        $lookup: {
          from: 'products',
          localField: 'product_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $group: {
          _id: '$product.category',
          sales: { $sum: '$price' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { sales: -1 } },
      { $limit: 4 },
      {
        $project: {
          _id: 0,
          name: '$_id',
          sales: { $round: ['$sales', 0] },
          orders: 1
        }
      }
    ]);

    // If no data from aggregation, return mock data
    const categoryData = topCategories.length > 0 ? topCategories : [
      { name: 'Sattu Powder', sales: 45000, orders: 234 },
      { name: 'Sattu Drinks', sales: 38000, orders: 198 },
      { name: 'Sattu Snacks', sales: 32000, orders: 167 },
      { name: 'Gift Packs', sales: 28000, orders: 145 }
    ];

    return res.json({
      success: true,
      data: categoryData
    });
  } catch (error) {
    console.error('Top categories error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch top categories'
    });
  }
};

/**
 * Get recent orders
 * Returns the most recent orders with status
 */
exports.getRecentOrders = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 4;

    const recentOrders = await Order.find()
      .select('_id user_id total_amount status createdAt')
      .populate('user_id', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const formattedOrders = recentOrders.map((order) => ({
      id: order._id.toString().slice(-6).toUpperCase(),
      customer: order.user_id?.name || 'Unknown',
      amount: Math.round(order.total_amount),
      status: order.status,
      time: getTimeAgo(order.createdAt)
    }));

    return res.json({
      success: true,
      data: formattedOrders
    });
  } catch (error) {
    console.error('Recent orders error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch recent orders'
    });
  }
};

/**
 * Get top products
 * Returns the top selling products
 */
exports.getTopProducts = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 4;
    const OrderItem = require('../models/OrderItem');

    const topProducts = await OrderItem.aggregate([
      {
        $lookup: {
          from: 'orders',
          localField: 'order_id',
          foreignField: '_id',
          as: 'order'
        }
      },
      { $unwind: '$order' },
      { $match: { 'order.status': 'delivered' } },
      {
        $lookup: {
          from: 'products',
          localField: 'product_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $group: {
          _id: '$product_id',
          sales: { $sum: 1 },
          revenue: { $sum: '$price' },
          name: { $first: '$product.name' }
        }
      },
      { $sort: { sales: -1 } },
      { $limit: limit },
      {
        $project: {
          _id: 0,
          name: 1,
          sales: 1,
          revenue: { $round: ['$revenue', 0] }
        }
      }
    ]);

    // If no data from aggregation, return mock data
    const productData = topProducts.length > 0 ? topProducts : [
      { name: 'Premium Sattu Powder 1kg', sales: 234, revenue: 23400 },
      { name: 'Sattu Energy Drink Mix', sales: 198, revenue: 19800 },
      { name: 'Roasted Sattu Snacks', sales: 167, revenue: 16700 },
      { name: 'Sattu Gift Hamper', sales: 145, revenue: 14500 }
    ];

    return res.json({
      success: true,
      data: productData
    });
  } catch (error) {
    console.error('Top products error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch top products'
    });
  }
};

/**
 * Helper function to format time ago
 */
function getTimeAgo(date) {
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  return date.toLocaleDateString();
}
