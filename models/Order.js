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
      required: [true, 'Shipping address is required'],
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