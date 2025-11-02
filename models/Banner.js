const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Banner title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Banner description is required'],
    },
    imageUrl: {
      type: String,
      required: [true, 'Banner image URL is required'],
    },
    linkUrl: {
      type: String,
      default: '/',
    },
    season: {
      type: String,
      enum: ['general', 'diwali', 'holi', 'christmas', 'new-year', 'summer', 'monsoon'],
      default: 'general',
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    position: {
      type: Number,
      default: 1,
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
bannerSchema.index({ isActive: 1, startDate: 1, endDate: 1 });
bannerSchema.index({ season: 1 });
bannerSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Banner', bannerSchema);
