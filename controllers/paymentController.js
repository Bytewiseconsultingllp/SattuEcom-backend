const Payment = require('../models/Payment');
const Order = require('../models/Order');
const {
  createRazorpayOrder,
  verifyPaymentSignature,
  fetchPaymentDetails,
  createRefund,
  fetchRefund,
} = require('../services/razorpayService');

/**
 * Create Razorpay order for payment
 * POST /api/payments/create-order
 */
exports.createPaymentOrder = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { order_id } = req.body;

    if (!order_id) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required',
      });
    }

    // Find the order
    const order = await Order.findOne({ _id: order_id, user_id: userId });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Check if order is already paid
    if (order.payment_status === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Order is already paid',
      });
    }

    // Check if payment already exists for this order
    const existingPayment = await Payment.findOne({
      order_id: order._id,
      status: { $in: ['created', 'authorized', 'captured'] },
    });

    if (existingPayment) {
      return res.status(200).json({
        success: true,
        data: {
          razorpay_order_id: existingPayment.razorpay_order_id,
          amount: existingPayment.amount,
          currency: existingPayment.currency,
          key_id: process.env.RAZORPAY_KEY_ID,
        },
        message: 'Payment order already exists',
      });
    }

    // Create Razorpay order
    const razorpayOrder = await createRazorpayOrder(
      order.total_amount,
      'INR',
      `order_${order._id}`,
      {
        order_id: order._id.toString(),
        user_id: userId.toString(),
      }
    );

    // Save payment record
    const payment = await Payment.create({
      order_id: order._id,
      user_id: userId,
      razorpay_order_id: razorpayOrder.id,
      amount: order.total_amount,
      currency: 'INR',
      status: 'created',
    });

    // Update order payment status
    order.payment_status = 'pending';
    order.razorpay_order_id = razorpayOrder.id;
    await order.save();

    res.status(201).json({
      success: true,
      data: {
        razorpay_order_id: razorpayOrder.id,
        amount: order.total_amount,
        currency: 'INR',
        key_id: process.env.RAZORPAY_KEY_ID,
        order_id: order._id,
        payment_id: payment._id,
      },
      message: 'Payment order created successfully',
    });
  } catch (error) {
    console.error('Create payment order error:', error);
    next(error);
  }
};

/**
 * Verify payment after Razorpay checkout
 * POST /api/payments/verify
 */
exports.verifyPayment = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      order_id,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing payment verification details',
      });
    }

    // Verify signature
    const isValid = verifyPaymentSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValid) {
      // Update payment as failed
      await Payment.findOneAndUpdate(
        { razorpay_order_id, user_id: userId },
        {
          status: 'failed',
          error_description: 'Invalid payment signature',
        }
      );

      return res.status(400).json({
        success: false,
        message: 'Payment verification failed',
      });
    }

    // Fetch payment details from Razorpay
    const paymentDetails = await fetchPaymentDetails(razorpay_payment_id);

    // Update payment record
    const payment = await Payment.findOneAndUpdate(
      { razorpay_order_id, user_id: userId },
      {
        razorpay_payment_id,
        razorpay_signature,
        status: paymentDetails.status === 'captured' ? 'captured' : 'authorized',
        payment_method: paymentDetails.method,
        payment_email: paymentDetails.email,
        payment_contact: paymentDetails.contact,
        metadata: {
          card_id: paymentDetails.card_id,
          bank: paymentDetails.bank,
          wallet: paymentDetails.wallet,
          vpa: paymentDetails.vpa,
        },
      },
      { new: true }
    );

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found',
      });
    }

    // Update order
    const order = await Order.findOneAndUpdate(
      { _id: payment.order_id, user_id: userId },
      {
        payment_status: 'paid',
        status: 'processing',
        paid_at: new Date(),
      },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        payment_id: payment._id,
        order_id: order._id,
        status: payment.status,
        amount: payment.amount,
      },
      message: 'Payment verified successfully',
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    next(error);
  }
};

/**
 * Handle payment failure
 * POST /api/payments/failed
 */
exports.handlePaymentFailure = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { razorpay_order_id, error } = req.body;

    if (!razorpay_order_id) {
      return res.status(400).json({
        success: false,
        message: 'Razorpay order ID is required',
      });
    }

    // Update payment record
    const payment = await Payment.findOneAndUpdate(
      { razorpay_order_id, user_id: userId },
      {
        status: 'failed',
        error_code: error?.code,
        error_description: error?.description || 'Payment failed',
      },
      { new: true }
    );

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found',
      });
    }

    // Update order
    await Order.findOneAndUpdate(
      { _id: payment.order_id },
      {
        payment_status: 'failed',
      }
    );

    res.status(200).json({
      success: true,
      message: 'Payment failure recorded',
    });
  } catch (error) {
    console.error('Handle payment failure error:', error);
    next(error);
  }
};

/**
 * Get payment details
 * GET /api/payments/:id
 */
exports.getPaymentById = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const paymentId = req.params.id;

    const payment = await Payment.findOne({
      _id: paymentId,
      user_id: userId,
    })
      .populate('order_id')
      .lean();

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
      });
    }

    // Format response
    const formattedPayment = {
      id: payment._id.toString(),
      order_id: payment.order_id._id.toString(),
      razorpay_order_id: payment.razorpay_order_id,
      razorpay_payment_id: payment.razorpay_payment_id,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      payment_method: payment.payment_method,
      payment_email: payment.payment_email,
      payment_contact: payment.payment_contact,
      refund_amount: payment.refund_amount,
      refund_status: payment.refund_status,
      created_at: payment.createdAt,
      updated_at: payment.updatedAt,
    };

    res.status(200).json({
      success: true,
      data: formattedPayment,
    });
  } catch (error) {
    console.error('Get payment error:', error);
    next(error);
  }
};

/**
 * Get user's payment history
 * GET /api/payments/my-payments
 */
exports.getMyPayments = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const status = req.query.status;

    const query = { user_id: userId };
    if (status) {
      query.status = status;
    }

    const [payments, total] = await Promise.all([
      Payment.find(query)
        .populate('order_id', 'total_amount status')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Payment.countDocuments(query),
    ]);

    const formattedPayments = payments.map((payment) => ({
      id: payment._id.toString(),
      order_id: payment.order_id?._id?.toString(),
      razorpay_order_id: payment.razorpay_order_id,
      razorpay_payment_id: payment.razorpay_payment_id,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      payment_method: payment.payment_method,
      refund_amount: payment.refund_amount,
      refund_status: payment.refund_status,
      created_at: payment.createdAt,
      updated_at: payment.updatedAt,
      order: payment.order_id
        ? {
            total_amount: payment.order_id.total_amount,
            status: payment.order_id.status,
          }
        : null,
    }));

    res.status(200).json({
      success: true,
      count: formattedPayments.length,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: formattedPayments,
    });
  } catch (error) {
    console.error('Get my payments error:', error);
    next(error);
  }
};

/**
 * Request refund
 * POST /api/payments/:id/refund
 */
exports.requestRefund = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const paymentId = req.params.id;
    const { amount, reason } = req.body;

    // Find payment
    const payment = await Payment.findOne({
      _id: paymentId,
      user_id: userId,
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
      });
    }

    // Check if payment is captured
    if (payment.status !== 'captured') {
      return res.status(400).json({
        success: false,
        message: 'Only captured payments can be refunded',
      });
    }

    // Check if already refunded
    if (payment.refund_status === 'processed') {
      return res.status(400).json({
        success: false,
        message: 'Payment already refunded',
      });
    }

    // Validate refund amount
    const maxRefundAmount = payment.amount - payment.refund_amount;
    const refundAmount = amount ? Math.min(amount, maxRefundAmount) : maxRefundAmount;

    if (refundAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid refund amount',
      });
    }

    // Create refund in Razorpay
    const refund = await createRefund(
      payment.razorpay_payment_id,
      refundAmount,
      { reason: reason || 'Customer request', user_id: userId.toString() }
    );

    // Update payment record
    payment.refund_id = refund.id;
    payment.refund_amount += refundAmount;
    payment.refund_status = 'processed';
    payment.status = refundAmount === payment.amount ? 'refunded' : 'partial_refund';
    await payment.save();

    // Update order
    await Order.findByIdAndUpdate(payment.order_id, {
      payment_status: 'refunded',
      status: 'cancelled',
    });

    res.status(200).json({
      success: true,
      data: {
        refund_id: refund.id,
        amount: refundAmount,
        status: refund.status,
      },
      message: 'Refund processed successfully',
    });
  } catch (error) {
    console.error('Request refund error:', error);
    next(error);
  }
};

// Exports are already defined above using exports.functionName
// No need for module.exports object at the end
