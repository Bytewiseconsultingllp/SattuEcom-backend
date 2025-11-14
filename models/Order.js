const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    total_amount: {
      type: Number,
      required: [true, 'Total amount is required'],
      min: [0, 'Total amount cannot be negative'],
    },
    status: {
      type: String,
      required: [true, 'Order status is required'],
      enum: {
        values: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
        message: '{VALUE} is not a valid status',
      },
      default: 'pending',
    },
    shipping_address_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Address',
      required: [false, 'Shipping address is required'],
    },

    // NEW: cancellation metadata
    cancellation_reason: { type: String, default: '' },
    cancelled_at: { type: Date },
    cancelled_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // Shipment details (for shipped orders)
    shipment: {
      deliveryPartner: {
        type: String,
        default: null,
      },
      trackingNumber: {
        type: String,
        default: null,
      },
      estimatedDelivery: {
        type: String,
        default: null,
      },
      shippedAt: {
        type: Date,
        default: null,
      },
    },

    // Coupon details
    coupon_code: { type: String, default: null },
    discount_amount: { type: Number, default: 0, min: 0 },

    // Delivery details
    delivery_charges: { type: Number, default: 0, min: 0 },
    delivery_type: { type: String, default: 'standard' }, // "standard", "express", etc.

    // Gift wrapping details
    gift_design_id: { type: mongoose.Schema.Types.ObjectId, ref: 'GiftDesign', default: null },
    gift_price: { type: Number, default: 0, min: 0 },
    gift_card_message: String,
    gift_wrapping_type: String, // "single_product" or "combo"

    // Tax details
    tax_amount: { type: Number, default: 0, min: 0 },
    tax_rate: { type: Number, default: 5, min: 0 }, // 5% GST

    // Sale type (online vs offline)
    sale_type: {
      type: String,
      enum: ['online', 'offline'],
      default: 'online',
      index: true,
    },

    // Invoice details
    invoice_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', default: null },
    invoice_number: { type: String, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        ret.created_at = ret.createdAt;
        ret.updated_at = ret.updatedAt;
        delete ret.createdAt;
        delete ret.updatedAt;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        ret.created_at = ret.createdAt;
        ret.updated_at = ret.updatedAt;
        delete ret.createdAt;
        delete ret.updatedAt;
        return ret;
      },
    },
  }
);

// Virtuals
orderSchema.virtual('order_items', {
  ref: 'OrderItem',
  localField: '_id',
  foreignField: 'order_id',
});

orderSchema.virtual('shipping_address', {
  ref: 'Address',
  localField: 'shipping_address_id',
  foreignField: '_id',
  justOne: true,
});

// Indexes
orderSchema.index({ user_id: 1, createdAt: -1 }); // FIX: use createdAt, not created_at
orderSchema.index({ status: 1 });

module.exports = mongoose.model('Order', orderSchema);