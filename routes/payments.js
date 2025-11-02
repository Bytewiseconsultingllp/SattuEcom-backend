const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createPaymentOrder,
  verifyPayment,
  handlePaymentFailure,
  getPaymentById,
  getMyPayments,
  requestRefund,
} = require('../controllers/paymentController');

/**
 * @route   POST /api/payments/create-order
 * @desc    Create Razorpay order for payment
 * @access  Private
 */
router.post('/create-order', protect, createPaymentOrder);

/**
 * @route   POST /api/payments/verify
 * @desc    Verify payment after Razorpay checkout
 * @access  Private
 */
router.post('/verify', protect, verifyPayment);

/**
 * @route   POST /api/payments/failed
 * @desc    Handle payment failure
 * @access  Private
 */
router.post('/failed', protect, handlePaymentFailure);

/**
 * @route   GET /api/payments/my-payments
 * @desc    Get user's payment history
 * @access  Private
 */
router.get('/my-payments', protect, getMyPayments);

/**
 * @route   GET /api/payments/:id
 * @desc    Get payment details
 * @access  Private
 */
router.get('/:id', protect, getPaymentById);

/**
 * @route   POST /api/payments/:id/refund
 * @desc    Request refund
 * @access  Private
 */
router.post('/:id/refund', protect, requestRefund);

module.exports = router;
