const mongoose = require('mongoose');

const giftDesignSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: String,
  type: { type: String, enum: ['single_product', 'combo'], required: true },
  price: { type: Number, required: true, min: 0 },
  
  // For single product gifts
  product_id: mongoose.Schema.Types.ObjectId,
  product_quantity: { type: Number, default: 1 },
  
  // For combo gifts - array of products with quantities
  combo_items: [{
    product_id: mongoose.Schema.Types.ObjectId,
    quantity: { type: Number, default: 1 }
  }],
  
  // Design details
  image_url: String,
  wrapping_style: String, // e.g., "premium", "standard", "eco-friendly"
  includes_card: { type: Boolean, default: true },
  card_message_template: String,
  
  // Availability
  is_active: { type: Boolean, default: true, index: true },
  stock_available: { type: Number, default: -1 }, // -1 = unlimited
  
  // Metadata
  created_by: mongoose.Schema.Types.ObjectId, // admin user
  tags: [String],
  
  // Category - visible for all products regardless of combo or single product
  category: { type: String, enum: ['birthday', 'anniversary', 'wedding', 'corporate', 'thank-you', 'congratulations', 'get-well', 'general'], default: 'general' },
  
}, { timestamps: true });

// Indexes for performance
giftDesignSchema.index({ is_active: 1, type: 1 });
giftDesignSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('GiftDesign', giftDesignSchema);
