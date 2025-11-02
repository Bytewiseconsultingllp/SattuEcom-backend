const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  type: { type: String, required: true, enum: ['percentage', 'fixed', 'buy_x_get_y', 'free_shipping'] },
  description: String,
  discount_value: Number,
  min_purchase_amount: { type: Number, default: 0 },
  max_discount_amount: Number,
  buy_quantity: Number,
  get_quantity: Number,
  applicable_products: [String],
  applicable_categories: [String],
  start_date: Date,
  end_date: Date,
  usage_limit: { type: Number, default: 0 },
  usage_count: { type: Number, default: 0 },
  is_active: { type: Boolean, default: true },
}, { timestamps: true });

couponSchema.index({ code: 1, is_active: 1 });

module.exports = mongoose.model('Coupon', couponSchema); 