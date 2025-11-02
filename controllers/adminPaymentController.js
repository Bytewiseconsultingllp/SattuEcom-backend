const Payment = require('../models/Payment');
const Order = require('../models/Order');
const { createRefund, fetchPaymentDetails } = require('../services/razorpayService');

/**
 * Get all payments (Admin)
 * GET /api/admin/payments
 */
exports.getAllPayments = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const status = req.query.status;
    const search = req.query.search;

    const query = {};
    if (status) {
      query.status = status;
    }

    // Search by razorpay IDs or email
    if (search) {
      query.$or = [
        { razorpay_order_id: { $regex: search, $options: 'i' } },
        { razorpay_payment_id: { $regex: search, $options: 'i' } },
        { payment_email: { $regex: search, $options: 'i' } },
      ];
    }

    const [payments, total] = await Promise.all([
      Payment.find(query)
        .populate('user_id', 'name email')
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
      user_id: payment.user_id?._id?.toString(),
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
      error_description: payment.error_description,
      created_at: payment.createdAt,
      updated_at: payment.updatedAt,
      user: payment.user_id
        ? {
            name: payment.user_id.name,
            email: payment.user_id.email,
          }
        : null,
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
      data: formattedPayments,
    });
  } catch (error) {
    console.error('Get all payments error:', error);
    next(error);
  }
};

/**
 * Get payment by ID (Admin)
 * GET /api/admin/payments/:id
 */
exports.getPaymentById = async (req, res, next) => {
  try {
    const paymentId = req.params.id;

    const payment = await Payment.findById(paymentId)
      .populate('user_id', 'name email phone')
      .populate('order_id')
      .lean();

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
      });
    }

    // Fetch latest details from Razorpay if payment_id exists
    let razorpayDetails = null;
    if (payment.razorpay_payment_id) {
      try {
        razorpayDetails = await fetchPaymentDetails(payment.razorpay_payment_id);
      } catch (error) {
        console.error('Failed to fetch Razorpay details:', error);
      }
    }

    const formattedPayment = {
      id: payment._id.toString(),
      order_id: payment.order_id?._id?.toString(),
      user_id: payment.user_id?._id?.toString(),
      razorpay_order_id: payment.razorpay_order_id,
      razorpay_payment_id: payment.razorpay_payment_id,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      payment_method: payment.payment_method,
      payment_email: payment.payment_email,
      payment_contact: payment.payment_contact,
      refund_id: payment.refund_id,
      refund_amount: payment.refund_amount,
      refund_status: payment.refund_status,
      error_code: payment.error_code,
      error_description: payment.error_description,
      metadata: payment.metadata,
      created_at: payment.createdAt,
      updated_at: payment.updatedAt,
      user: payment.user_id
        ? {
            name: payment.user_id.name,
            email: payment.user_id.email,
            phone: payment.user_id.phone,
          }
        : null,
      order: payment.order_id || null,
      razorpay_details: razorpayDetails,
    };

    res.status(200).json({
      success: true,
      data: formattedPayment,
    });
  } catch (error) {
    console.error('Get payment by ID error:', error);
    next(error);
  }
};

/**
 * Process refund (Admin)
 * POST /api/admin/payments/:id/refund
 */
exports.processRefund = async (req, res, next) => {
  try {
    const paymentId = req.params.id;
    const { amount, reason } = req.body;

    // Find payment
    const payment = await Payment.findById(paymentId);

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

    // Validate refund amount
    const maxRefundAmount = payment.amount - payment.refund_amount;
    const refundAmount = amount ? Math.min(amount, maxRefundAmount) : maxRefundAmount;

    if (refundAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid refund amount or payment already fully refunded',
      });
    }

    // Create refund in Razorpay
    const refund = await createRefund(
      payment.razorpay_payment_id,
      refundAmount,
      {
        reason: reason || 'Admin initiated refund',
        admin_id: req.user._id.toString(),
      }
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
        payment_status: payment.status,
      },
      message: 'Refund processed successfully',
    });
  } catch (error) {
    console.error('Process refund error:', error);
    next(error);
  }
};

/**
 * Get payment statistics (Admin)
 * GET /api/admin/payments/stats
 */
exports.getPaymentStats = async (req, res, next) => {
  try {
    const stats = await Payment.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          total_amount: { $sum: '$amount' },
        },
      },
    ]);

    const totalPayments = await Payment.countDocuments();
    const totalRevenue = await Payment.aggregate([
      { $match: { status: { $in: ['captured', 'authorized'] } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    const totalRefunds = await Payment.aggregate([
      { $match: { refund_status: 'processed' } },
      { $group: { _id: null, total: { $sum: '$refund_amount' } } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        total_payments: totalPayments,
        total_revenue: totalRevenue[0]?.total || 0,
        total_refunds: totalRefunds[0]?.total || 0,
        by_status: stats,
      },
    });
  } catch (error) {
    console.error('Get payment stats error:', error);
    next(error);
  }
};

// Exports are already defined above using exports.functionName
// No need for module.exports object at the end
