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
 * @swagger
 * tags:
 *   name: Payments
 *   description: Payment processing and management
 */

/**
 * @swagger
 * /api/payments/create-order:
 *   post:
 *     summary: Create Razorpay payment order
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - orderId
 *             properties:
 *               amount:
 *                 type: number
 *                 example: 500
 *               orderId:
 *                 type: string
 *                 example: "ORD123456"
 *     responses:
 *       200:
 *         description: Payment order created successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 */
router.post('/create-order', protect, createPaymentOrder);

/**
 * @swagger
 * /api/payments/verify:
 *   post:
 *     summary: Verify Razorpay payment
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - razorpay_order_id
 *               - razorpay_payment_id
 *               - razorpay_signature
 *             properties:
 *               razorpay_order_id:
 *                 type: string
 *               razorpay_payment_id:
 *                 type: string
 *               razorpay_signature:
 *                 type: string
 *               orderId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment verified successfully
 *       400:
 *         description: Payment verification failed
 */
router.post('/verify', protect, verifyPayment);

/**
 * @swagger
 * /api/payments/failed:
 *   post:
 *     summary: Handle payment failure
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               orderId:
 *                 type: string
 *               error:
 *                 type: object
 *     responses:
 *       200:
 *         description: Payment failure recorded
 */
router.post('/failed', protect, handlePaymentFailure);

/**
 * @swagger
 * /api/payments/my-payments:
 *   get:
 *     summary: Get user's payment history
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user payments
 *       401:
 *         description: Unauthorized
 */
router.get('/my-payments', protect, getMyPayments);

/**
 * @swagger
 * /api/payments/{id}:
 *   get:
 *     summary: Get payment details by ID
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment ID
 *     responses:
 *       200:
 *         description: Payment details
 *       404:
 *         description: Payment not found
 */
router.get('/:id', protect, getPaymentById);

/**
 * @swagger
 * /api/payments/{id}/refund:
 *   post:
 *     summary: Request payment refund
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 example: "Product not as described"
 *     responses:
 *       200:
 *         description: Refund request submitted
 *       400:
 *         description: Invalid request
 */
router.post('/:id/refund', protect, requestRefund);

module.exports = router;
