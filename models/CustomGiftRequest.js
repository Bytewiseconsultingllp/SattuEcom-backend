const mongoose = require('mongoose');

const customGiftRequestSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Request details
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  budget_min: { type: Number, min: 0 },
  budget_max: { type: Number, min: 0 },
  
  // Recipient details
  recipient_name: String,
  occasion: String, // e.g., "birthday", "anniversary", "wedding", "corporate"
  recipient_preferences: String,
  
  // Files/attachments
  design_images: [String], // URLs of uploaded design images
  reference_links: [String],
  
  // Status tracking
  status: {
    type: String,
    enum: ['pending', 'under_review', 'approved', 'rejected', 'completed'],
    default: 'pending',
    index: true
  },
  
  // Admin response
  admin_notes: String,
  estimated_price: Number,
  estimated_completion_date: Date,
  
  // Timeline
  submitted_at: { type: Date, default: Date.now },
  reviewed_at: Date,
  completed_at: Date,
  
}, { timestamps: true });

// Indexes for performance
customGiftRequestSchema.index({ user_id: 1, status: 1 });
customGiftRequestSchema.index({ status: 1 });
customGiftRequestSchema.index({ created_at: -1 });

module.exports = mongoose.model('CustomGiftRequest', customGiftRequestSchema);
