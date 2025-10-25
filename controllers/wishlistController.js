const WishlistItem = require('../models/WishlistItem');
const Product = require('../models/Product');
 
/**
* Get all wishlist items for a user with product details
* Matches Supabase getWishlistItems function
*/
exports.getWishlistItems = async (req, res, next) => {
  try {
    const userId = req.user._id;
 
    const wishlistItems = await WishlistItem.find({ user_id: userId })
      .populate('product_id')
      .sort({ created_at: -1 })
      .lean();
 
    // Format to match Supabase structure
    const formattedItems = wishlistItems.map((item) => ({
      id: item._id.toString(),
      user_id: item.user_id.toString(),
      product_id: item.product_id._id.toString(),
      created_at: item.created_at,
      product: {
        id: item.product_id._id.toString(),
        name: item.product_id.name,
        description: item.product_id.description,
        price: item.product_id.price,
        original_price: item.product_id.original_price,
        category: item.product_id.category,
        image_url: item.product_id.image_url,
        in_stock: item.product_id.in_stock,
        rating: item.product_id.rating,
        reviews_count: item.product_id.reviews_count,
        benefits: item.product_id.benefits,
        ingredients: item.product_id.ingredients,
        usage: item.product_id.usage,
        created_at: item.product_id.createdAt,
        updated_at: item.product_id.updatedAt,
      },
    }));
 
    res.status(200).json({
      success: true,
      count: formattedItems.length,
      data: formattedItems,
    });
  } catch (error) {
    next(error);
  }
};
 
/**
* Add product to wishlist
* Matches Supabase addToWishlist function
*/
exports.addToWishlist = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { product_id } = req.body;
 
    if (!product_id) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required',
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
 
    // Check if already in wishlist
    const existingItem = await WishlistItem.findOne({
      user_id: userId,
      product_id: product_id,
    });
 
    if (existingItem) {
      return res.status(400).json({
        success: false,
        message: 'Product already in wishlist',
      });
    }
 
    // Add to wishlist
    const wishlistItem = await WishlistItem.create({
      user_id: userId,
      product_id: product_id,
    });
 
    // Populate product details
    await wishlistItem.populate('product_id');
 
    // Format response
    const formattedItem = {
      id: wishlistItem._id.toString(),
      user_id: wishlistItem.user_id.toString(),
      product_id: wishlistItem.product_id._id.toString(),
      created_at: wishlistItem.created_at,
      product: {
        id: wishlistItem.product_id._id.toString(),
        name: wishlistItem.product_id.name,
        description: wishlistItem.product_id.description,
        price: wishlistItem.product_id.price,
        original_price: wishlistItem.product_id.original_price,
        category: wishlistItem.product_id.category,
        image_url: wishlistItem.product_id.image_url,
        in_stock: wishlistItem.product_id.in_stock,
        rating: wishlistItem.product_id.rating,
        reviews_count: wishlistItem.product_id.reviews_count,
        benefits: wishlistItem.product_id.benefits,
        ingredients: wishlistItem.product_id.ingredients,
        usage: wishlistItem.product_id.usage,
        created_at: wishlistItem.product_id.createdAt,
        updated_at: wishlistItem.product_id.updatedAt,
      },
    };
 
    res.status(201).json({
      success: true,
      data: formattedItem,
      message: 'Product added to wishlist',
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Product already in wishlist',
      });
    }
    next(error);
  }
};
 
/**
* Remove item from wishlist
* Matches Supabase removeFromWishlist function
*/
exports.removeFromWishlist = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const itemId = req.params.id;
 
    const wishlistItem = await WishlistItem.findOneAndDelete({
      _id: itemId,
      user_id: userId,
    });
 
    if (!wishlistItem) {
      return res.status(404).json({
        success: false,
        message: 'Wishlist item not found',
      });
    }
 
    res.status(200).json({
      success: true,
      message: 'Product removed from wishlist',
      data: {},
    });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Wishlist item not found',
      });
    }
    next(error);
  }
};
 
/**
* Check if product is in user's wishlist
* Matches Supabase isInWishlist function
*/
exports.isInWishlist = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { product_id } = req.query;
 
    if (!product_id) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required',
      });
    }
 
    const wishlistItem = await WishlistItem.findOne({
      user_id: userId,
      product_id: product_id,
    });
 
    res.status(200).json({
      success: true,
      data: {
        inWishlist: !!wishlistItem,
        itemId: wishlistItem ? wishlistItem._id.toString() : null,
      },
    });
  } catch (error) {
    next(error);
  }
};
 
/**
* Clear entire wishlist for a user
*/
exports.clearWishlist = async (req, res, next) => {
  try {
    const userId = req.user._id;
 
    await WishlistItem.deleteMany({ user_id: userId });
 
    res.status(200).json({
      success: true,
      message: 'Wishlist cleared successfully',
      data: {},
    });
  } catch (error) {
    next(error);
  }
};