const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getAllPayments,
  getPaymentById,
  processRefund,
  getPaymentStats,
} = require('../controllers/adminPaymentController');

/**
 * @route   GET /api/admin/payments/stats
 * @desc    Get payment statistics
 * @access  Private/Admin
 */
router.get('/stats', protect, authorize('admin'), getPaymentStats);

/**
 * @route   GET /api/admin/payments
 * @desc    Get all payments
 * @access  Private/Admin
 */
router.get('/', protect, authorize('admin'), getAllPayments);

/**
 * @route   GET /api/admin/payments/:id
 * @desc    Get payment by ID
 * @access  Private/Admin
 */
router.get('/:id', protect, authorize('admin'), getPaymentById);

/**
 * @route   POST /api/admin/payments/:id/refund
 * @desc    Process refund
 * @access  Private/Admin
 */
router.post('/:id/refund', protect, authorize('admin'), processRefund);

module.exports = router;
