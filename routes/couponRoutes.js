const express = require('express');
const router = express.Router();
const { getActiveCoupons, validateCoupon, applyCoupon } = require('../controllers/couponController');

/**
 * @swagger
 * tags:
 *   name: Coupons
 *   description: Coupon management for users
 */

/**
 * @swagger
 * /api/coupons/active:
 *   get:
 *     summary: Get all active coupons
 *     tags: [Coupons]
 *     responses:
 *       200:
 *         description: List of active coupons
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       code:
 *                         type: string
 *                       discount:
 *                         type: number
 *                       description:
 *                         type: string
 */
router.get('/active', getActiveCoupons);

/**
 * @swagger
 * /api/coupons/validate:
 *   post:
 *     summary: Validate a coupon code
 *     tags: [Coupons]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - orderAmount
 *             properties:
 *               code:
 *                 type: string
 *                 example: "SAVE20"
 *               orderAmount:
 *                 type: number
 *                 example: 500
 *     responses:
 *       200:
 *         description: Coupon is valid
 *       400:
 *         description: Invalid or expired coupon
 */
router.post('/validate', validateCoupon);

/**
 * @swagger
 * /api/coupons/apply:
 *   post:
 *     summary: Apply a coupon to order
 *     tags: [Coupons]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - orderId
 *             properties:
 *               code:
 *                 type: string
 *                 example: "SAVE20"
 *               orderId:
 *                 type: string
 *                 example: "ORD123456"
 *     responses:
 *       200:
 *         description: Coupon applied successfully
 *       400:
 *         description: Cannot apply coupon
 */
router.post('/apply', applyCoupon);

module.exports = router;