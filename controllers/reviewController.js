const Review = require('../models/Review');
const Product = require('../models/Product');
 
/**
* Helper function to update product rating and review count
* Matches Supabase updateProductRating function
*/
const updateProductRating = async (productId) => {
  try {
    const reviews = await Review.find({ product_id: productId }).select('rating');
 
    if (reviews && reviews.length > 0) {
      const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
 
      await Product.findByIdAndUpdate(productId, {
        rating: Number(avgRating.toFixed(1)),
        reviews_count: reviews.length,
      });
    } else {
      // No reviews, reset rating
      await Product.findByIdAndUpdate(productId, {
        rating: 0,
        reviews_count: 0,
      });
    }
  } catch (error) {
    console.error('Error updating product rating:', error);
  }
};
 
/**
* Get all reviews for a product with user details
* Matches Supabase getProductReviews function
*/
exports.getProductReviews = async (req, res, next) => {
  try {
    const productId = req.params.productId;
 
    const reviews = await Review.find({ product_id: productId })
      .populate('user_id', 'name')
      .sort({ createdAt: -1 })
      .lean();
 
    // Format to match Supabase structure
    const formattedReviews = reviews.map((review) => ({
      id: review._id.toString(),
      user_id: review.user_id._id.toString(),
      product_id: review.product_id.toString(),
      rating: review.rating,
      comment: review.comment,
      created_at: review.createdAt,
      updated_at: review.updatedAt,
      user: {
        full_name: review.user_id.name,
      },
    }));
 
    res.status(200).json({
      success: true,
      count: formattedReviews.length,
      data: formattedReviews,
    });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }
    next(error);
  }
};
 
/**
* Get all reviews by a user
*/
exports.getUserReviews = async (req, res, next) => {
  try {
    const userId = req.user._id;
 
    const reviews = await Review.find({ user_id: userId })
      .populate('product_id', 'name image_url')
      .sort({ createdAt: -1 })
      .lean();
 
    const formattedReviews = reviews.map((review) => ({
      id: review._id.toString(),
      user_id: review.user_id.toString(),
      product_id: review.product_id._id.toString(),
      rating: review.rating,
      comment: review.comment,
      created_at: review.createdAt,
      updated_at: review.updatedAt,
      product: {
        name: review.product_id.name,
        image_url: review.product_id.image_url,
      },
    }));
 
    res.status(200).json({
      success: true,
      count: formattedReviews.length,
      data: formattedReviews,
    });
  } catch (error) {
    next(error);
  }
};
 
/**
* Create a new review
* Matches Supabase createReview function
*/
exports.createReview = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { product_id, rating, comment } = req.body;
 
    if (!product_id || !rating) {
      return res.status(400).json({
        success: false,
        message: 'Product ID and rating are required',
      });
    }
 
    // Verify product exists
    const product = await Product.findById(product_id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }
 
    // Check if user already reviewed this product
    const existingReview = await Review.findOne({
      user_id: userId,
      product_id: product_id,
    });
 
    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this product',
      });
    }
 
    // Create review
    const review = await Review.create({
      user_id: userId,
      product_id,
      rating,
      comment,
    });
 
    // Update product rating
    await updateProductRating(product_id);
 
    // Populate user details
    await review.populate('user_id', 'name');
 
    // Format response
    const formattedReview = {
      id: review._id.toString(),
      user_id: review.user_id._id.toString(),
      product_id: review.product_id.toString(),
      rating: review.rating,
      comment: review.comment,
      created_at: review.createdAt,
      updated_at: review.updatedAt,
      user: {
        full_name: review.user_id.name,
      },
    };
 
    res.status(201).json({
      success: true,
      data: formattedReview,
      message: 'Review created successfully',
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this product',
      });
    }
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', '),
      });
    }
    next(error);
  }
};
 
/**
* Update a review
* Matches Supabase updateReview function
*/
exports.updateReview = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const reviewId = req.params.id;
    const { rating, comment } = req.body;
 
    // Find review and ensure it belongs to user
    const review = await Review.findOne({
      _id: reviewId,
      user_id: userId,
    });
 
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }
 
    // Update fields
    if (rating !== undefined) review.rating = rating;
    if (comment !== undefined) review.comment = comment;
 
    await review.save();
 
    // Update product rating
    await updateProductRating(review.product_id);
 
    // Populate user details
    await review.populate('user_id', 'name');
 
    // Format response
    const formattedReview = {
      id: review._id.toString(),
      user_id: review.user_id._id.toString(),
      product_id: review.product_id.toString(),
      rating: review.rating,
      comment: review.comment,
      created_at: review.createdAt,
      updated_at: review.updatedAt,
      user: {
        full_name: review.user_id.name,
      },
    };
 
    res.status(200).json({
      success: true,
      data: formattedReview,
      message: 'Review updated successfully',
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', '),
      });
    }
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
* Delete a review
* Matches Supabase deleteReview function
*/
exports.deleteReview = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const reviewId = req.params.id;
 
    // Find and delete review (ensure it belongs to user)
    const review = await Review.findOneAndDelete({
      _id: reviewId,
      user_id: userId,
    });
 
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
      data: {},
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
* Check if user has reviewed a product
*/
exports.hasUserReviewed = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { product_id } = req.query;
 
    if (!product_id) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required',
      });
    }
 
    const review = await Review.findOne({
      user_id: userId,
      product_id: product_id,
    });
 
    res.status(200).json({
      success: true,
      data: {
        hasReviewed: !!review,
        reviewId: review ? review._id.toString() : null,
      },
    });
  } catch (error) {
    next(error);
  }
};