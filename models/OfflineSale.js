const mongoose = require('mongoose');

const offlineSaleSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: [true, 'Sale date is required'],
      default: Date.now,
    },
    customerName: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
    },
    customerPhone: {
      type: String,
      required: [true, 'Customer phone is required'],
    },
    customerEmail: {
      type: String,
      required: [true, 'Customer email is required'],
      lowercase: true,
      trim: true,
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
      },
    ],
    totalAmount: {
      type: Number,
      required: [false, 'Total amount is required'],
      min: 0,
    },
    // GST Fields
    gstType: {
      type: String,
      enum: ['gst', 'non-gst'],
      default: 'non-gst',
    },
    invoiceNumber: {
      type: String,
      default: '',
    },
    // Discount Field
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    finalAmount: {
      type: Number,
      required: [true, 'Final amount is required'],
      min: 0,
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'upi', 'cheque', 'bank-transfer'],
      default: 'cash',
    },
    notes: {
      type: String,
      default: '',
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

// Index for faster queries
offlineSaleSchema.index({ date: -1 });
offlineSaleSchema.index({ customerPhone: 1 });
offlineSaleSchema.index({ paymentMethod: 1 });

module.exports = mongoose.model('OfflineSale', offlineSaleSchema);
