const Review = require('../models/Review');
const Product = require('../models/Product');
const mongoose = require('mongoose');
 
const updateProductRating = async (productId) => {
  try {
    const pid = new mongoose.Types.ObjectId(productId);
    
    // Only count non-hidden reviews
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

exports.getProductReviews = async (req, res, next) => {
  try {
    const productId = req.params.productId;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const ratingFilter = req.query.rating ? parseInt(req.query.rating, 10) : undefined;

    const query = { product_id: productId, is_hidden: false };
    if ([1,2,3,4,5].includes(ratingFilter)) query.rating = ratingFilter;

    const [reviews, total] = await Promise.all([
      Review.find(query)
        .populate('user_id', 'name email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Review.countDocuments(query),
    ]);

    // Filter out reviews with deleted users and format
    const formattedReviews = reviews
      .filter(review => review.user_id) // Skip if user was deleted
      .map((review) => ({
        id: review._id.toString(),
        user_id: review.user_id._id.toString(),
        product_id: review.product_id.toString(),
        rating: review.rating,
        comment: review.comment,
        images: review.images || [],
        is_hidden: review.is_hidden || false,
        created_at: review.createdAt,
        updated_at: review.updatedAt,
        user: { 
          full_name: review.user_id.name || 'Unknown User',
          email: review.user_id.email || ''
        },
      }));

    res.status(200).json({ 
      success: true, 
      count: formattedReviews.length, 
      total,
      page, 
      limit,
      totalPages: Math.ceil(total / limit),
      data: formattedReviews 
    });
  } catch (error) {
    console.error('getProductReviews error:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    next(error);
  }
};

exports.getUserReviews = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);

    const [reviews, total] = await Promise.all([
      Review.find({ user_id: userId })
        .populate('product_id', 'name images')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Review.countDocuments({ user_id: userId }),
    ]);

    // Filter out reviews with deleted products
    const formattedReviews = reviews
      .filter(review => review.product_id) // Skip if product was deleted
      .map((review) => ({
        id: review._id.toString(),
        user_id: review.user_id.toString(),
        product_id: review.product_id._id.toString(),
        rating: review.rating,
        comment: review.comment,
        images: review.images || [],
        is_hidden: review.is_hidden || false,
        created_at: review.createdAt,
        updated_at: review.updatedAt,
        product: {
          name: review.product_id.name || 'Unknown Product',
          images: review.product_id.images || [],
        },
      }));

    res.status(200).json({
      success: true,
      count: formattedReviews.length,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: formattedReviews,
    });
  } catch (error) {
    console.error('getUserReviews error:', error);
    next(error);
  }
};

//   try {
//     const userId = req.user._id;
//     const { product_id, rating, comment } = req.body;
 
//     if (!product_id || !rating) {
//       return res.status(400).json({
//         success: false,
//         message: 'Product ID and rating are required',
//       });
//     }
 
//     // Verify product exists
//     const product = await Product.findById(product_id);
//     if (!product) {
//       return res.status(404).json({
//         success: false,
//         message: 'Product not found',
//       });
//     }
 
//     // Check if user already reviewed this product
//     const existingReview = await Review.findOne({
//       user_id: userId,
//       product_id: product_id,
//     });
 
//     if (existingReview) {
//       return res.status(400).json({
//         success: false,
//         message: 'You have already reviewed this product',
//       });
//     }
 
//     // Create review
//     const review = await Review.create({
//       user_id: userId,
//       product_id,
//       rating,
//       comment,
//     });
 
//     // Update product rating
//     await updateProductRating(product_id);
 
//     // Populate user details
//     await review.populate('user_id', 'name');
 
//     // Format response
//     const formattedReview = {
//       id: review._id.toString(),
//       user_id: review.user_id._id.toString(),
//       product_id: review.product_id.toString(),
//       rating: review.rating,
//       comment: review.comment,
//       created_at: review.createdAt,
//       updated_at: review.updatedAt,
//       user: {
//         full_name: review.user_id.name,
//       },
//     };
 
//     res.status(201).json({
//       success: true,
//       data: formattedReview,
//       message: 'Review created successfully',
//     });
//   } catch (error) {
//     if (error.code === 11000) {
//       return res.status(400).json({
//         success: false,
//         message: 'You have already reviewed this product',
//       });
//     }
//     if (error.name === 'ValidationError') {
//       const messages = Object.values(error.errors).map((err) => err.message);
//       return res.status(400).json({
//         success: false,
//         message: messages.join(', '),
//       });
//     }
//     next(error);
//   }
// };
function isValidBase64Image(s) {
  return typeof s === 'string' && s.startsWith('data:image/') && s.includes(';base64,');
}

exports.createReview = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { product_id, rating, comment, images } = req.body;

    if (!product_id || rating == null) {
      return res.status(400).json({ success: false, message: 'Product ID and rating are required' });
    }

    // optional hardening
    const ratingNum = Number(rating);
    if (![1,2,3,4,5].includes(ratingNum)) {
      return res.status(400).json({ success: false, message: 'Rating must be an integer 1-5' });
    }

    const product = await Product.findById(product_id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    const existingReview = await Review.findOne({ user_id: userId, product_id });
    if (existingReview) return res.status(400).json({ success: false, message: 'You have already reviewed this product' });

    const MAX_IMAGES = 6;
    const imgs = Array.isArray(images) ? images : [];
    const validImages = imgs.filter(isValidBase64Image).slice(0, MAX_IMAGES);

    console.log("about to create the review ")
    const review = await Review.create({
      user_id: userId,
      product_id,
      rating: ratingNum,
      comment,
      images: validImages,
    });

    console.log("created the review ")
    console.log("about to update the rating  ")
    await updateProductRating(product_id);
    await review.populate('user_id', 'name');

    const data = {
      id: review._id.toString(),
      user_id: review.user_id._id.toString(),
      product_id: review.product_id.toString(),
      rating: review.rating,
      comment: review.comment,
      images: review.images || [],
      created_at: review.createdAt,
      updated_at: review.updatedAt,
      user: { full_name: review.user_id.name },
    };

    res.status(201).json({ success: true, data, message: 'Review created successfully' });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ success: false, message: 'You have already reviewed this product' });
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    next(error);
  }
};

exports.updateReview = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const reviewId = req.params.id;
    const { rating, comment, images, image_action } = req.body;

    const review = await Review.findOne({ _id: reviewId, user_id: userId });
    if (!review) return res.status(404).json({ success: false, message: 'Review not found' });

    if (rating !== undefined) review.rating = rating;
    if (comment !== undefined) review.comment = comment;

    const MAX_IMAGES = 6;
    if (Array.isArray(images)) {
      const validImages = images.filter(isValidBase64Image);
      if (image_action === 'append') {
        const combined = [...(review.images || []), ...validImages];
        review.images = combined.slice(0, MAX_IMAGES);
      } else {
        review.images = validImages.slice(0, MAX_IMAGES); // default replace
      }
    }

    await review.save();
    await updateProductRating(review.product_id);
    await review.populate('user_id', 'name');

    const data = {
      id: review._id.toString(),
      user_id: review.user_id._id.toString(),
      product_id: review.product_id.toString(),
      rating: review.rating,
      comment: review.comment,
      images: review.images || [],
      created_at: review.createdAt,
      updated_at: review.updatedAt,
      user: { full_name: review.user_id.name },
    };

    res.status(200).json({ success: true, data, message: 'Review updated successfully' });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    if (error.kind === 'ObjectId') return res.status(404).json({ success: false, message: 'Review not found' });
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
exports.getProductReviewSummary = async (req, res, next) => {
  try {
    const productId = req.params.productId;
    const pid = new mongoose.Types.ObjectId(productId);

    const grouped = await Review.aggregate([
      { $match: { product_id: pid } },
      { $group: { _id: '$rating', count: { $sum: 1 } } },
    ]);

    const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let total = 0, weighted = 0;
    for (const g of grouped) {
      breakdown[g._id] = g.count;
      total += g.count;
      weighted += g._id * g.count;
    }
    const average = total ? Number((weighted / total).toFixed(1)) : 0;

    res.status(200).json({ success: true, data: { average, count: total, breakdown } });
  } catch (error) {
    if (error.kind === 'ObjectId') return res.status(404).json({ success: false, message: 'Product not found' });
    next(error);
  }
};