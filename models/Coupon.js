const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
  type: { type: String, required: true, enum: ['percentage', 'fixed', 'buy_x_get_y', 'free_shipping'] },
  description: String,
  // Optional: required only for percentage/fixed (validated at controller/UI level)
  discount_value: { type: Number, min: 0 },
  min_purchase_amount: { type: Number, default: 0 },
  max_discount_amount: Number,
  buy_quantity: Number,
  get_quantity: Number,
  applicable_products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  applicable_categories: [String],
  start_date: Date,
  end_date: Date,
  usage_limit: { type: Number, default: 0 }, // 0 = unlimited
  usage_count: { type: Number, default: 0 },
  is_active: { type: Boolean, default: true, index: true },
}, { timestamps: true });

// Indexes for performance
couponSchema.index({ code: 1, is_active: 1 });
couponSchema.index({ is_active: 1, start_date: 1, end_date: 1 });
couponSchema.index({ usage_count: 1, usage_limit: 1 });

module.exports = mongoose.model('Coupon', couponSchema);