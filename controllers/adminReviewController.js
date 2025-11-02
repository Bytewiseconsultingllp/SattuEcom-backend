const Review = require('../models/Review');
const Product = require('../models/Product');
const mongoose = require('mongoose');

// Helper function to update product rating
const updateProductRating = async (productId) => {
  try {
    const pid = new mongoose.Types.ObjectId(productId);
    
    // Only count non-hidden reviews for product rating
    const agg = await Review.aggregate([
      { $match: { product_id: pid, is_hidden: false } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);

    if (agg.length) {
      const avgRating = Number(agg[0].avg.toFixed(1));
      await Product.findByIdAndUpdate(productId, {
        rating: avgRating,
        reviews_count: agg[0].count,
      });
    } else {
      await Product.findByIdAndUpdate(productId, { rating: 0, reviews_count: 0 });
    }
  } catch (error) {
    console.error('Error updating product rating:', error);
  }
};

/**
 * Get all reviews (admin only)
 * Supports filtering by product_id and is_hidden status
 */
exports.getAllReviews = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 100);
    const { product_id, is_hidden } = req.query;

    const query = {};
    if (product_id) query.product_id = product_id;
    if (is_hidden !== undefined) query.is_hidden = is_hidden === 'true';

    const [reviews, total] = await Promise.all([
      Review.find(query)
        .populate('user_id', 'name email')
        .populate('product_id', 'name images')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Review.countDocuments(query),
    ]);

    // Filter out reviews with deleted users or products
    const formattedReviews = reviews
      .filter(review => review.user_id && review.product_id)
      .map((review) => ({
        id: review._id.toString(),
        user_id: review.user_id._id.toString(),
        product_id: review.product_id._id.toString(),
        rating: review.rating,
        comment: review.comment,
        images: review.images || [],
        is_hidden: review.is_hidden || false,
        created_at: review.createdAt,
        updated_at: review.updatedAt,
        user: {
          name: review.user_id.name || 'Unknown User',
          email: review.user_id.email || '',
        },
        product: {
          name: review.product_id.name || 'Unknown Product',
          images: review.product_id.images || [],
        },
      }));

    res.status(200).json({
      success: true,
      count: formattedReviews.length,
      page,
      limit,
      data: formattedReviews,
    });
  } catch (error) {
    console.error('getAllReviews error:', error);
    next(error);
  }
};

/**
 * Toggle review visibility (hide/show)
 */
exports.toggleReviewVisibility = async (req, res, next) => {
  try {
    const reviewId = req.params.id;
    const { is_hidden } = req.body;

    if (typeof is_hidden !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'is_hidden must be a boolean value',
      });
    }

    const review = await Review.findByIdAndUpdate(
      reviewId,
      { is_hidden },
      { new: true }
    )
      .populate('user_id', 'name email')
      .populate('product_id', 'name images');

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    // Update product rating (hidden reviews don't count)
    await updateProductRating(review.product_id._id);

    const formattedReview = {
      id: review._id.toString(),
      user_id: review.user_id._id.toString(),
      product_id: review.product_id._id.toString(),
      rating: review.rating,
      comment: review.comment,
      images: review.images || [],
      is_hidden: review.is_hidden,
      created_at: review.createdAt,
      updated_at: review.updatedAt,
      user: {
        name: review.user_id.name,
        email: review.user_id.email,
      },
      product: {
        name: review.product_id.name,
        images: review.product_id.images || [],
      },
    };

    res.status(200).json({
      success: true,
      data: formattedReview,
      message: `Review ${is_hidden ? 'hidden' : 'shown'} successfully`,
    });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }
    next(error);
  }
};

/**
 * Delete any review (admin only)
 */
exports.deleteReviewAsAdmin = async (req, res, next) => {
  try {
    const reviewId = req.params.id;

    const review = await Review.findByIdAndDelete(reviewId);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    // Update product rating
    await updateProductRating(review.product_id);

    res.status(200).json({
      success: true,
      message: 'Review deleted successfully',
    });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }
    next(error);
  }
};