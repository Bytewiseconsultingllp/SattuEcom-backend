const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema(
  {
    // ✅ STANDARDIZED: snake_case for all main fields
    invoice_number: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    order_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    
    // Invoice Items
    items: [
      {
        product_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
        },
        name: String,
        description: String,
        quantity: Number,
        price: Number,
        amount: Number,
      },
    ],
    
    // Amounts - All snake_case
    subtotal: {
      type: Number,
      required: true,
      default: 0,
    },
    discount_amount: {
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
    delivery_charges: {
      type: Number,
      default: 0,
    },
    tax_amount: {
      type: Number,
      default: 0,
    },
    total_amount: {
      type: Number,
      required: true,
    },
    
    // Dates
    issue_date: {
      type: Date,
      default: Date.now,
    },
    due_date: {
      type: Date,
    },
    
    // Payment Info
    payment_status: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
      index: true,
    },
    payment_method: {
      type: String,
      default: 'UPI',
    },
    payment_date: {
      type: Date,
    },
    
    // Razorpay Info (for online payments)
    razorpay_payment_id: {
      type: String,
      index: true,
    },
    razorpay_order_id: {
      type: String,
    },
    
    // Sale Type - REQUIRED
    sale_type: {
      type: String,
      enum: ['online', 'offline'],
      required: true,
      default: 'online',
      index: true,
    },
    
    // UPI Details (for offline sales)
    upi_qr_code: {
      type: String, // Base64 encoded QR code
    },
    upi_id: {
      type: String,
    },
    
    // Addresses
    billing_address: {
      full_name: String,
      phone: String,
      email: String,
      address_line1: String,
      address_line2: String,
      city: String,
      state: String,
      postal_code: String,
      country: String,
    },
    shipping_address: {
      full_name: String,
      phone: String,
      email: String,
      address_line1: String,
      address_line2: String,
      city: String,
      state: String,
      postal_code: String,
      country: String,
    },
    
    // Additional Info
    notes: {
      type: String,
    },
    terms: {
      type: String,
      default: 'Payment due within 30 days. All sales are final.',
    },
    
    // PDF URL (if stored)
    pdf_url: {
      type: String,
    },
    
    // Status
    status: {
      type: String,
      enum: ['draft', 'issued', 'paid', 'overdue', 'cancelled'],
      default: 'issued',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
invoiceSchema.index({ user_id: 1, createdAt: -1 });
invoiceSchema.index({ order_id: 1 });
invoiceSchema.index({ sale_type: 1 });
invoiceSchema.index({ payment_status: 1 });
invoiceSchema.index({ createdAt: -1 });

// Static method to generate next invoice number
invoiceSchema.statics.generateInvoiceNumber = async function () {
  try {
    const latestInvoice = await this.findOne({}, { invoice_number: 1 })
      .sort({ createdAt: -1 })
      .lean();

    let nextNumber = 1;

    if (latestInvoice && latestInvoice.invoice_number) {
      // Extract the last numeric chunk from the invoice number
      const str = String(latestInvoice.invoice_number);
      const digitMatches = str.match(/(\d+)/g);
      if (digitMatches && digitMatches.length > 0) {
        const lastDigits = digitMatches[digitMatches.length - 1];
        const parsed = parseInt(lastDigits, 10);
        if (Number.isFinite(parsed) && parsed > 0) {
          nextNumber = parsed + 1;
        }
      }
    }

    return `INV-GF-${nextNumber}`;
  } catch (error) {
    console.error('Error generating invoice number:', error);
    return `INV-GF-${Date.now()}`;
  }
};

// Method to check if invoice is overdue
invoiceSchema.methods.isOverdue = function () {
  if (this.payment_status === 'paid' || !this.due_date) {
    return false;
  }
  return new Date() > this.due_date;
};

// Virtual for formatted invoice number
invoiceSchema.virtual('formattedInvoiceNumber').get(function () {
  return this.invoice_number;
});

// Ensure virtuals are included in JSON
invoiceSchema.set('toJSON', { virtuals: true });
invoiceSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Invoice', invoiceSchema);
