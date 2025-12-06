const express = require('express');
const router = express.Router();
const customReportController = require('../controllers/customReportController');
const { protect, admin } = require('../middleware/auth');

/**
 * Custom Report Routes
 * All routes require admin authentication
 */

/**
 * @route   POST /api/admin/reports/custom/monthly
 * @desc    Generate Monthly Performance Report
 * @access  Admin only
 */
router.post('/monthly', protect, admin, customReportController.generateMonthlyReport);

/**
 * @route   POST /api/admin/reports/custom/quarterly
 * @desc    Generate Quarterly Financial Report
 * @access  Admin only
 */
router.post('/quarterly', protect, admin, customReportController.generateQuarterlyReport);

/**
 * @route   POST /api/admin/reports/custom/annual
 * @desc    Generate Annual Business Report
 * @access  Admin only
 */
router.post('/annual', protect, admin, customReportController.generateAnnualReport);

module.exports = router;
