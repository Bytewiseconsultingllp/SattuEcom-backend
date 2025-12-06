const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { protect, admin } = require('../middleware/auth');

/**
 * Report Generation Routes
 * All routes require admin authentication
 */

/**
 * @route   POST /api/admin/reports/generate
 * @desc    Generate a report on-demand
 * @access  Admin only
 */
router.post('/generate', protect, admin, reportController.generateReport);

/**
 * @route   POST /api/admin/reports/schedule
 * @desc    Schedule automated reports
 * @access  Admin only
 */
router.post('/schedule', protect, admin, reportController.scheduleReport);

/**
 * @route   GET /api/admin/reports/schedules
 * @desc    Get all report schedules
 * @access  Admin only
 */
router.get('/schedules', protect, admin, reportController.getSchedules);

/**
 * @route   PUT /api/admin/reports/schedules/:id
 * @desc    Update a report schedule
 * @access  Admin only
 */
router.put('/schedules/:id', protect, admin, reportController.updateSchedule);

/**
 * @route   DELETE /api/admin/reports/schedules/:id
 * @desc    Delete a report schedule
 * @access  Admin only
 */
router.delete('/schedules/:id', protect, admin, reportController.deleteSchedule);

/**
 * @route   GET /api/admin/reports/history
 * @desc    Get report generation history
 * @access  Admin only
 */
router.get('/history', protect, admin, reportController.getHistory);

/**
 * @route   POST /api/admin/reports/download-all
 * @desc    Download all reports as ZIP
 * @access  Admin only
 */
router.post('/download-all', protect, admin, reportController.downloadAllReports);

module.exports = router;
