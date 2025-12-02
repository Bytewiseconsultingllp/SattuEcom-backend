const Order = require('../models/Order');
const OfflineSale = require('../models/OfflineSale');
const Expense = require('../models/Expense');
const User = require('../models/User');
const Product = require('../models/Product');
const Review = require('../models/Review');

/**
 * Get all dashboard statistics
 * Calculates: Total Revenue = Online Sales + Offline Sales
 * ✅ OPTIMIZED: Uses Promise.all() to parallelize all queries
 */
exports.getStats = async (req, res, next) => {
  try {
    const previousMonth = new Date();
    previousMonth.setMonth(previousMonth.getMonth() - 1);

    // ✅ Execute all queries in parallel using Promise.all()
    // This reduces execution time from ~8 sequential queries to parallel execution
    const [
      onlineSalesResult,
      offlineSalesResult,
      expensesResult,
      totalOrders,
      totalCustomers,
      totalProducts,
      previousOnlineSales,
      previousOrders,
      previousCustomers,
      previousProducts
    ] = await Promise.all([
      // Current period queries
      Order.aggregate([
        { $match: { status: 'delivered' } },
        { $group: { _id: null, total: { $sum: '$total_amount' } } }
      ]),
      OfflineSale.aggregate([
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      Expense.aggregate([
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Order.countDocuments(),
      User.countDocuments({ role: 'user' }),
      Product.countDocuments(),
      
      // Previous month queries for comparison
      Order.aggregate([
        {
          $match: {
            status: 'delivered',
            created_at: { $gte: previousMonth }
          }
        },
        { $group: { _id: null, total: { $sum: '$total_amount' } } }
      ]),
      Order.countDocuments({ created_at: { $gte: previousMonth } }),
      User.countDocuments({
        role: 'user',
        createdAt: { $gte: previousMonth }
      }),
      Product.countDocuments({ createdAt: { $gte: previousMonth } })
    ]);

    // Extract values
    const onlineSales = onlineSalesResult[0]?.total || 0;
    const offlineSales = offlineSalesResult[0]?.total || 0;
    const expenses = expensesResult[0]?.total || 0;
    const totalRevenue = onlineSales + offlineSales;

    // Calculate percentage changes
    const prevOnline = previousOnlineSales[0]?.total || onlineSales;
    const revenueChange = prevOnline > 0 
      ? ((totalRevenue - prevOnline) / prevOnline) * 100 
      : 0;

    const ordersChange = previousOrders > 0 
      ? ((totalOrders - previousOrders) / previousOrders) * 100 
      : 0;

    const customersChange = previousCustomers > 0 
      ? ((totalCustomers - previousCustomers) / previousCustomers) * 100 
      : 0;

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
 * ✅ OPTIMIZED: Uses single aggregation with $facet instead of 36 sequential queries
 */
exports.getRevenueOverview = async (req, res, next) => {
  try {
    // ✅ Calculate date range for last 12 months
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 11);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    // ✅ Execute all 3 aggregations in parallel instead of 36 sequential queries
    const [onlineData, offlineData, expenseData] = await Promise.all([
      // Get online sales grouped by month
      Order.aggregate([
        {
          $match: {
            status: 'delivered',
            created_at: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$created_at' },
              month: { $month: '$created_at' }
            },
            total: { $sum: '$total_amount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]),
      
      // Get offline sales grouped by month
      OfflineSale.aggregate([
        {
          $match: {
            date: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$date' },
              month: { $month: '$date' }
            },
            total: { $sum: '$totalAmount' }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]),
      
      // Get expenses grouped by month
      Expense.aggregate([
        {
          $match: {
            date: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$date' },
              month: { $month: '$date' }
            },
            total: { $sum: '$amount' }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ])
    ]);

    // ✅ Merge data by month
    const monthMap = new Map();
    
    // Initialize all months in range
    for (let i = 0; i < 12; i++) {
      const date = new Date(startDate);
      date.setMonth(date.getMonth() + i);
      const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
      monthMap.set(key, {
        month: date.toLocaleString('default', { month: 'short' }),
        revenue: 0,
        orders: 0,
        online: 0,
        offline: 0,
        expenses: 0
      });
    }

    // Add online sales data
    onlineData.forEach(item => {
      const key = `${item._id.year}-${item._id.month}`;
      if (monthMap.has(key)) {
        const data = monthMap.get(key);
        data.online = Math.round(item.total);
        data.orders = item.count;
      }
    });

    // Add offline sales data
    offlineData.forEach(item => {
      const key = `${item._id.year}-${item._id.month}`;
      if (monthMap.has(key)) {
        const data = monthMap.get(key);
        data.offline = Math.round(item.total);
      }
    });

    // Add expenses data
    expenseData.forEach(item => {
      const key = `${item._id.year}-${item._id.month}`;
      if (monthMap.has(key)) {
        const data = monthMap.get(key);
        data.expenses = Math.round(item.total);
      }
    });

    // Calculate revenue for each month
    const revenueData = Array.from(monthMap.values()).map(data => ({
      ...data,
      revenue: Math.round(data.online + data.offline - data.expenses)
    }));

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

    // Return actual data or empty array if no data exists
    return res.json({
      success: true,
      data: topCategories.length > 0 ? topCategories : []
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

    // Return actual data or empty array if no data exists
    return res.json({
      success: true,
      data: topProducts.length > 0 ? topProducts : []
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
