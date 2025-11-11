const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // Invoice Details
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
        },
        name: String,
        description: String,
        quantity: Number,
        rate: Number,
        amount: Number,
      },
    ],
    subtotal: {
      type: Number,
      required: true,
    },
    tax: {
      type: Number,
      default: 0,
    },
    discount: {
      type: Number,
      default: 0,
    },
    coupon_discount: {
      type: Number,
      default: 0,
    },
    gift_price: {
      type: Number,
      default: 0,
    },
    shippingCharges: {
      type: Number,
      default: 0,
    },
    delivery_charges: {
      type: Number,
      default: 0,
    },
    gst_amount: {
      type: Number,
      default: 0,
    },
    total: {
      type: Number,
      required: true,
    },
    // Dates
    issueDate: {
      type: Date,
      default: Date.now,
    },
    dueDate: {
      type: Date,
    },
    // Payment Info
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
    paymentMethod: {
      type: String,
    },
    paymentDate: {
      type: Date,
    },
    // Razorpay Payment ID (for online payments)
    razorpay_payment_id: {
      type: String,
      index: true,
    },
    razorpay_order_id: {
      type: String,
    },
    // Sale Type
    sale_type: {
      type: String,
      enum: ['online', 'offline'],
      default: 'online',
      index: true,
    },
    // UPI Payment Details (for offline sales)
    upi_qr_code: {
      type: String, // Base64 encoded QR code
    },
    upi_id: {
      type: String,
    },
    // Billing Address
    billingAddress: {
      fullName: String,
      phone: String,
      addressLine1: String,
      addressLine2: String,
      city: String,
      state: String,
      postalCode: String,
      country: String,
    },
    // Shipping Address
    shippingAddress: {
      fullName: String,
      phone: String,
      addressLine1: String,
      addressLine2: String,
      city: String,
      state: String,
      postalCode: String,
      country: String,
    },
    // Additional Info
    notes: {
      type: String,
    },
    terms: {
      type: String,
      default: 'Payment due within 30 days',
    },
    // PDF URL (if stored)
    pdfUrl: {
      type: String,
    },
    // Status
    status: {
      type: String,
      enum: ['draft', 'issued', 'paid', 'overdue', 'cancelled'],
      default: 'issued',
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
invoiceSchema.index({ createdAt: -1 });
invoiceSchema.index({ userId: 1, createdAt: -1 });
invoiceSchema.index({ status: 1 });

// Static method to generate next invoice number
invoiceSchema.statics.generateInvoiceNumber = async function () {
  try {
    // Find the latest invoice
    const latestInvoice = await this.findOne({}, { invoiceNumber: 1 })
      .sort({ createdAt: -1 })
      .lean();

    let nextNumber = 1;

    if (latestInvoice && latestInvoice.invoiceNumber) {
      // Extract number from invoice number (e.g., "INV-GF-00001" -> 1)
      const match = latestInvoice.invoiceNumber.match(/INV-GF-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }

    // Format with leading zeros (5 digits)
    const formattedNumber = nextNumber.toString().padStart(5, '0');
    return `INV-GF-${formattedNumber}`;
  } catch (error) {
    console.error('Error generating invoice number:', error);
    // Fallback to timestamp-based number
    return `INV-GF-${Date.now()}`;
  }
};

// Method to check if invoice is overdue
invoiceSchema.methods.isOverdue = function () {
  if (this.paymentStatus === 'paid' || !this.dueDate) {
    return false;
  }
  return new Date() > this.dueDate;
};

// Virtual for formatted invoice number
invoiceSchema.virtual('formattedInvoiceNumber').get(function () {
  return this.invoiceNumber;
});

// Ensure virtuals are included in JSON
invoiceSchema.set('toJSON', { virtuals: true });
invoiceSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Invoice', invoiceSchema);
