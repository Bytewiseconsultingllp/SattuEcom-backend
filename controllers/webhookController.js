const Payment = require('../models/Payment');
const Order = require('../models/Order');
const { verifyWebhookSignature } = require('../services/razorpayService');

/**
 * Handle Razorpay webhooks
 * POST /api/webhooks/razorpay
 */
exports.handleRazorpayWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const body = req.body;

    // Verify webhook signature
    const isValid = verifyWebhookSignature(body, signature);

    if (!isValid) {
      console.error('Invalid webhook signature');
      return res.status(400).json({
        success: false,
        message: 'Invalid signature',
      });
    }

    const event = body.event;
    const payload = body.payload.payment || body.payload.refund || body.payload.order;

    console.log(`Webhook received: ${event}`);

    switch (event) {
      case 'payment.authorized':
        await handlePaymentAuthorized(payload.entity);
        break;

      case 'payment.captured':
        await handlePaymentCaptured(payload.entity);
        break;

      case 'payment.failed':
        await handlePaymentFailed(payload.entity);
        break;

      case 'refund.created':
        await handleRefundCreated(payload.entity);
        break;

      case 'refund.processed':
        await handleRefundProcessed(payload.entity);
        break;

      case 'refund.failed':
        await handleRefundFailed(payload.entity);
        break;

      case 'order.paid':
        await handleOrderPaid(payload.entity);
        break;

      default:
        console.log(`Unhandled webhook event: ${event}`);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({
      success: false,
      message: 'Webhook processing failed',
    });
  }
};

/**
 * Handle payment.authorized event
 */
async function handlePaymentAuthorized(paymentEntity) {
  try {
    const payment = await Payment.findOne({
      razorpay_order_id: paymentEntity.order_id,
    });

    if (payment) {
      payment.razorpay_payment_id = paymentEntity.id;
      payment.status = 'authorized';
      payment.payment_method = paymentEntity.method;
      payment.payment_email = paymentEntity.email;
      payment.payment_contact = paymentEntity.contact;
      await payment.save();

      console.log(`Payment authorized: ${paymentEntity.id}`);
    }
  } catch (error) {
    console.error('Handle payment authorized error:', error);
  }
}

/**
 * Handle payment.captured event
 */
async function handlePaymentCaptured(paymentEntity) {
  try {
    const payment = await Payment.findOne({
      razorpay_order_id: paymentEntity.order_id,
    });

    if (payment) {
      payment.razorpay_payment_id = paymentEntity.id;
      payment.status = 'captured';
      payment.payment_method = paymentEntity.method;
      payment.payment_email = paymentEntity.email;
      payment.payment_contact = paymentEntity.contact;
      await payment.save();

      // Update order
      await Order.findByIdAndUpdate(payment.order_id, {
        payment_status: 'paid',
        status: 'processing',
        paid_at: new Date(),
      });

      console.log(`Payment captured: ${paymentEntity.id}`);
    }
  } catch (error) {
    console.error('Handle payment captured error:', error);
  }
}

/**
 * Handle payment.failed event
 */
async function handlePaymentFailed(paymentEntity) {
  try {
    const payment = await Payment.findOne({
      razorpay_order_id: paymentEntity.order_id,
    });

    if (payment) {
      payment.razorpay_payment_id = paymentEntity.id;
      payment.status = 'failed';
      payment.error_code = paymentEntity.error_code;
      payment.error_description = paymentEntity.error_description;
      await payment.save();

      // Update order
      await Order.findByIdAndUpdate(payment.order_id, {
        payment_status: 'failed',
      });

      console.log(`Payment failed: ${paymentEntity.id}`);
    }
  } catch (error) {
    console.error('Handle payment failed error:', error);
  }
}

/**
 * Handle refund.created event
 */
async function handleRefundCreated(refundEntity) {
  try {
    const payment = await Payment.findOne({
      razorpay_payment_id: refundEntity.payment_id,
    });

    if (payment) {
      payment.refund_id = refundEntity.id;
      payment.refund_status = 'pending';
      await payment.save();

      console.log(`Refund created: ${refundEntity.id}`);
    }
  } catch (error) {
    console.error('Handle refund created error:', error);
  }
}

/**
 * Handle refund.processed event
 */
async function handleRefundProcessed(refundEntity) {
  try {
    const payment = await Payment.findOne({
      razorpay_payment_id: refundEntity.payment_id,
    });

    if (payment) {
      payment.refund_id = refundEntity.id;
      payment.refund_amount = refundEntity.amount / 100; // Convert from paise
      payment.refund_status = 'processed';
      payment.status = refundEntity.amount === payment.amount * 100 ? 'refunded' : 'partial_refund';
      await payment.save();

      // Update order
      await Order.findByIdAndUpdate(payment.order_id, {
        payment_status: 'refunded',
        status: 'cancelled',
      });

      console.log(`Refund processed: ${refundEntity.id}`);
    }
  } catch (error) {
    console.error('Handle refund processed error:', error);
  }
}

/**
 * Handle refund.failed event
 */
async function handleRefundFailed(refundEntity) {
  try {
    const payment = await Payment.findOne({
      razorpay_payment_id: refundEntity.payment_id,
    });

    if (payment) {
      payment.refund_status = 'failed';
      await payment.save();

      console.log(`Refund failed: ${refundEntity.id}`);
    }
  } catch (error) {
    console.error('Handle refund failed error:', error);
  }
}

/**
 * Handle order.paid event
 */
async function handleOrderPaid(orderEntity) {
  try {
    const payment = await Payment.findOne({
      razorpay_order_id: orderEntity.id,
    });

    if (payment && payment.status !== 'captured') {
      payment.status = 'captured';
      await payment.save();

      await Order.findByIdAndUpdate(payment.order_id, {
        payment_status: 'paid',
        status: 'processing',
        paid_at: new Date(),
      });

      console.log(`Order paid: ${orderEntity.id}`);
    }
  } catch (error) {
    console.error('Handle order paid error:', error);
  }
}

// Exports are already defined above using exports.functionName
// No need for module.exports object at the end
