const express = require('express');
const router = express.Router();
const { handleRazorpayWebhook } = require('../controllers/webhookController');

/**
 * @route   POST /api/webhooks/razorpay
 * @desc    Handle Razorpay webhooks
 * @access  Public (verified by signature)
 */
router.post('/razorpay', express.raw({ type: 'application/json' }), handleRazorpayWebhook);

module.exports = router;
