const mongoose = require('mongoose');

const offlineSaleSchema = new mongoose.Schema(
  {
    // ✅ STANDARDIZED: snake_case for all fields
    date: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    customer_name: {
      type: String,
      required: true,
      trim: true,
    },
    customer_phone: {
      type: String,
      required: true,
      trim: true,
    },
    customer_email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    items: [
      {
        product: {
          type: String,
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        price: {
          type: Number,
          required: true,
          min: 0,
        },
        description: {
          type: String,
        },
      },
    ],
    total_amount: {
      type: Number,
      required: true,
      min: 0,
    },
    gst_type: {
      type: String,
      enum: ['gst', 'non-gst'],
      default: 'non-gst',
    },
    tax: {
      type: Number,
      default: 0,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    final_amount: {
      type: Number,
      required: true,
      min: 0,
    },
    payment_method: {
      type: String,
      enum: ['cash', 'card', 'upi', 'netbanking', 'other'],
      default: 'cash',
    },
    invoice_number: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
offlineSaleSchema.index({ date: -1 });
offlineSaleSchema.index({ customer_phone: 1 });
offlineSaleSchema.index({ customer_email: 1 });
offlineSaleSchema.index({ payment_method: 1 });
offlineSaleSchema.index({ gst_type: 1 });

module.exports = mongoose.model('OfflineSale', offlineSaleSchema);
