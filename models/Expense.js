const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: [true, 'Expense date is required'],
      default: Date.now,
    },
    category: {
      type: String,
      enum: ['delivery', 'packaging', 'maintenance', 'utilities', 'marketing', 'salaries', 'rent', 'other'],
      required: [true, 'Expense category is required'],
    },
    description: {
      type: String,
      required: [true, 'Expense description is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Expense amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'upi', 'cheque', 'bank-transfer'],
      default: 'cash',
    },
    vendor: {
      type: String,
      required: [true, 'Vendor name is required'],
      trim: true,
    },
    invoiceNumber: {
      type: String,
      default: '',
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
expenseSchema.index({ date: -1 });
expenseSchema.index({ category: 1 });
expenseSchema.index({ vendor: 1 });

module.exports = mongoose.model('Expense', expenseSchema);
