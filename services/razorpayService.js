const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay instance
const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * Create Razorpay order
 */
const createRazorpayOrder = async (amount, currency = 'INR', receipt, notes = {}) => {
  try {
    const options = {
      amount: Math.round(amount * 100), // Amount in paise
      currency,
      receipt,
      notes,
    };

    const order = await razorpayInstance.orders.create(options);
    return order;
  } catch (error) {
    console.error('Razorpay order creation error:', error);
    throw new Error(`Failed to create Razorpay order: ${error.message}`);
  }
};

/**
 * Verify Razorpay payment signature
 */
const verifyPaymentSignature = (razorpay_order_id, razorpay_payment_id, razorpay_signature) => {
  try {
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    return generatedSignature === razorpay_signature;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
};

/**
 * Verify webhook signature
 */
const verifyWebhookSignature = (body, signature) => {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(JSON.stringify(body))
      .digest('hex');

    return expectedSignature === signature;
  } catch (error) {
    console.error('Webhook signature verification error:', error);
    return false;
  }
};

/**
 * Fetch payment details from Razorpay
 */
const fetchPaymentDetails = async (paymentId) => {
  try {
    const payment = await razorpayInstance.payments.fetch(paymentId);
    return payment;
  } catch (error) {
    console.error('Fetch payment error:', error);
    throw new Error(`Failed to fetch payment: ${error.message}`);
  }
};

/**
 * Capture payment (for authorized payments)
 */
const capturePayment = async (paymentId, amount, currency = 'INR') => {
  try {
    const capture = await razorpayInstance.payments.capture(
      paymentId,
      Math.round(amount * 100),
      currency
    );
    return capture;
  } catch (error) {
    console.error('Capture payment error:', error);
    throw new Error(`Failed to capture payment: ${error.message}`);
  }
};

/**
 * Create refund
 */
const createRefund = async (paymentId, amount = null, notes = {}) => {
  try {
    const refundData = {
      notes,
    };

    // If amount is specified, it's a partial refund
    if (amount) {
      refundData.amount = Math.round(amount * 100);
    }

    const refund = await razorpayInstance.payments.refund(paymentId, refundData);
    return refund;
  } catch (error) {
    console.error('Refund creation error:', error);
    throw new Error(`Failed to create refund: ${error.message}`);
  }
};

/**
 * Fetch refund details
 */
const fetchRefund = async (refundId) => {
  try {
    const refund = await razorpayInstance.refunds.fetch(refundId);
    return refund;
  } catch (error) {
    console.error('Fetch refund error:', error);
    throw new Error(`Failed to fetch refund: ${error.message}`);
  }
};

/**
 * Fetch all refunds for a payment
 */
const fetchAllRefunds = async (paymentId) => {
  try {
    const refunds = await razorpayInstance.payments.fetchMultipleRefund(paymentId);
    return refunds;
  } catch (error) {
    console.error('Fetch refunds error:', error);
    throw new Error(`Failed to fetch refunds: ${error.message}`);
  }
};

module.exports = {
  razorpayInstance,
  createRazorpayOrder,
  verifyPaymentSignature,
  verifyWebhookSignature,
  fetchPaymentDetails,
  capturePayment,
  createRefund,
  fetchRefund,
  fetchAllRefunds,
};
