const mongoose = require('mongoose');
 
const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Product description is required'],
    },
    price: {
      type: Number,
      required: [true, 'Product price is required'],
      min: [0, 'Price cannot be negative'],
    },
    original_price: {
      type: Number,
      min: [0, 'Original price cannot be negative'],
    },
    category: {
      type: String,
      required: [true, 'Product category is required'],
      trim: true,
    },
    image_url: {
      type: String,
      required: [true, 'Product image URL is required'],
    },
    images: { type: [String], default: [] }, // NEW
    in_stock: {
      type: Boolean,
      default: true,
    },
    rating: {
      type: Number,
      default: 0,
      min: [0, 'Rating cannot be less than 0'],
      max: [5, 'Rating cannot be more than 5'],
    },
    reviews_count: {
      type: Number,
      default: 0,
      min: [0, 'Reviews count cannot be negative'],
    },
    benefits: {
      type: [String],
      default: [],
    },
    ingredients: {
      type: String,
    },
    usage: {
      type: String,
    },
  },
  {
    timestamps: true, // This creates created_at and updated_at automatically
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        // Convert _id to id to match Supabase format
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        // Rename timestamps to match Supabase format
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
productSchema.index({ category: 1 });
productSchema.index({ price: 1 });
productSchema.index({ in_stock: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ rating: -1 });
productSchema.index({ reviews_count: -1 });
 
module.exports = mongoose.model('Product', productSchema);