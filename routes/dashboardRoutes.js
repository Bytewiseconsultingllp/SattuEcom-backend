const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { protect, admin } = require('../middleware/auth');

/**
 * Dashboard Statistics Routes
 * All routes require admin authentication
 */

/**
 * @route   GET /api/admin/dashboard/stats
 * @desc    Get all dashboard statistics
 * @access  Admin only
 * @returns {Object} Dashboard statistics with revenue calculation
 */
router.get(
  '/stats',
  protect,
  admin,
  dashboardController.getStats
);

/**
 * @route   GET /api/admin/dashboard/online-sales
 * @desc    Get online sales total with optional date filtering
 * @access  Admin only
 * @query   {String} startDate - Optional start date (ISO format)
 * @query   {String} endDate - Optional end date (ISO format)
 * @returns {Object} Online sales total, count, and average
 */
router.get(
  '/online-sales',
  protect,
  admin,
  dashboardController.getOnlineSalesTotal
);

/**
 * @route   GET /api/admin/dashboard/offline-sales
 * @desc    Get offline sales total with optional date filtering
 * @access  Admin only
 * @query   {String} startDate - Optional start date (ISO format)
 * @query   {String} endDate - Optional end date (ISO format)
 * @returns {Object} Offline sales total, count, and average
 */
router.get(
  '/offline-sales',
  protect,
  admin,
  dashboardController.getOfflineSalesTotal
);

/**
 * @route   GET /api/admin/dashboard/expenses
 * @desc    Get expenses total with optional date filtering
 * @access  Admin only
 * @query   {String} startDate - Optional start date (ISO format)
 * @query   {String} endDate - Optional end date (ISO format)
 * @returns {Object} Expenses total, count, and average
 */
router.get(
  '/expenses',
  protect,
  admin,
  dashboardController.getExpensesTotal
);

/**
 * @route   GET /api/admin/dashboard/revenue-overview
 * @desc    Get revenue overview data for the last 12 months
 * @access  Admin only
 * @returns {Array} Monthly revenue, orders, and breakdown data
 */
router.get(
  '/revenue-overview',
  protect,
  admin,
  dashboardController.getRevenueOverview
);

/**
 * @route   GET /api/admin/dashboard/top-categories
 * @desc    Get top selling product categories
 * @access  Admin only
 * @returns {Array} Top categories with sales and orders
 */
router.get(
  '/top-categories',
  protect,
  admin,
  dashboardController.getTopCategories
);

/**
 * @route   GET /api/admin/dashboard/recent-orders
 * @desc    Get recent orders
 * @access  Admin only
 * @query   {Number} limit - Number of orders to return (default: 4)
 * @returns {Array} Recent orders with customer and status info
 */
router.get(
  '/recent-orders',
  protect,
  admin,
  dashboardController.getRecentOrders
);

/**
 * @route   GET /api/admin/dashboard/top-products
 * @desc    Get top selling products
 * @access  Admin only
 * @query   {Number} limit - Number of products to return (default: 4)
 * @returns {Array} Top products with sales and revenue
 */
router.get(
  '/top-products',
  protect,
  admin,
  dashboardController.getTopProducts
);

module.exports = router;
