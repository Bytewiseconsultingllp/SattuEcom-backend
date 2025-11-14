const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    order_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    razorpay_order_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    razorpay_payment_id: {
      type: String,
      index: true,
    },
    razorpay_signature: {
      type: String,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    status: {
      type: String,
      enum: ['created', 'authorized', 'captured', 'failed', 'refunded', 'partial_refund'],
      default: 'created',
      index: true,
    },
    payment_method: {
      type: String,
    },
    payment_email: {
      type: String,
    },
    payment_contact: {
      type: String,
    },
    refund_id: {
      type: String,
    },
    refund_amount: {
      type: Number,
      default: 0,
    },
    refund_status: {
      type: String,
      enum: ['none', 'pending', 'processed', 'failed'],
      default: 'none',
    },
    // Sale type for tracking (online/offline)
    sale_type: {
      type: String,
      enum: ['online', 'offline'],
    },
    error_code: {
      type: String,
    },
    error_description: {
      type: String,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
paymentSchema.index({ user_id: 1, createdAt: -1 });
paymentSchema.index({ status: 1, createdAt: -1 });
paymentSchema.index({ razorpay_payment_id: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
