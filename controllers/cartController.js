const CartItem = require('../models/CartItem');
const Product = require('../models/Product');
 
/**
* Get all cart items for a user with product details
* Matches Supabase getCartItems function
*/

exports.getCartItems = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const items = await CartItem.find({ user_id: userId })
      .populate({
        path: 'product_id',
        select: 'name price images in_stock description category createdAt updatedAt',
      })
      .sort({ created_at: -1 })
      .lean();

    // Filter out orphans (where product was deleted)
    const valid = items.filter(it => it.product_id);
    const orphans = items.filter(it => !it.product_id).map(it => it._id);
    if (orphans.length) {
      // Fire-and-forget cleanup
      CartItem.deleteMany({ _id: { $in: orphans } }).catch(() => {});
    }

    const data = valid.map(it => ({
      id: it._id.toString(),
      user_id: it.user_id.toString(),
      product_id: it.product_id._id.toString(),
      quantity: it.quantity,
      created_at: it.created_at, // if your schema uses created_at, keep this
      product: {
        id: it.product_id._id.toString(),
        name: it.product_id.name,
        price: it.product_id.price,
        images: it.product_id.images,
        in_stock: it.product_id.in_stock,
        description: it.product_id.description,
        category: it.product_id.category,
        created_at: it.product_id.createdAt,
        updated_at: it.product_id.updatedAt,
      },
    }));

    return res.status(200).json({ success: true, count: data.length, data });
  } catch (err) {
    next(err);
  }
};
/**
* Add item to cart or update quantity if exists
* Matches Supabase addToCart function
*/
exports.addToCart = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { product_id, quantity = 1 } = req.body;
 
    // Validate product exists
    const product = await Product.findById(product_id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }
 
    // Check if item already exists in cart
    let cartItem = await CartItem.findOne({
      user_id: userId,
      product_id: product_id,
    });
 
    if (cartItem) {
      // Update quantity if item exists
      cartItem.quantity += quantity;
      await cartItem.save();
      
      // Populate product details
      await cartItem.populate({
        path: 'product_id',
        select: 'name price images in_stock description category createdAt updatedAt',
      });
    } else {
      // Create new cart item
      cartItem = await CartItem.create({
        user_id: userId,
        product_id: product_id,
        quantity: quantity,
      });
      
      // Populate product details
      await cartItem.populate({
        path: 'product_id',
        select: 'name price images in_stock description category createdAt updatedAt',
      });
    }
 
    // Format response to match Supabase structure
    const itemObj = cartItem.toObject();
    const formattedItem = {
      id: itemObj.id,
      user_id: itemObj.user_id,
      product_id: itemObj.product_id.id,
      quantity: itemObj.quantity,
      created_at: itemObj.created_at,
      updated_at: itemObj.updated_at,
      product: itemObj.product_id,
    };
 
    res.status(201).json({
      success: true,
      data: formattedItem,
    });
  } catch (error) {
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
* Update cart item quantity
* Matches Supabase updateCartItemQuantity function
*/
exports.updateCartItemQuantity = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { quantity } = req.body;
 
    if (!quantity || quantity < 1) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be at least 1',
      });
    }
 
    // Find cart item and ensure it belongs to the user
    const cartItem = await CartItem.findOne({
      _id: req.params.id,
      user_id: userId,
    });
 
    if (!cartItem) {
      return res.status(404).json({
        success: false,
        message: 'Cart item not found',
      });
    }
 
    cartItem.quantity = quantity;
    await cartItem.save();
    await cartItem.populate({
      path: 'product_id',
      select: 'name price images in_stock description category createdAt updatedAt',
    });
 
    // Format response
    const itemObj = cartItem.toObject();
    const formattedItem = {
      id: itemObj.id,
      user_id: itemObj.user_id,
      product_id: itemObj.product_id.id,
      quantity: itemObj.quantity,
      created_at: itemObj.created_at,
      updated_at: itemObj.updated_at,
      product: itemObj.product_id,
    };
 
    res.status(200).json({
      success: true,
      data: formattedItem,
    });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Cart item not found',
      });
    }
    next(error);
  }
};
 
/**
* Remove item from cart
* Matches Supabase removeFromCart function
*/
exports.removeFromCart = async (req, res, next) => {
  try {
    const userId = req.user._id;
 
    const cartItem = await CartItem.findOneAndDelete({
      _id: req.params.id,
      user_id: userId,
    });
 
    if (!cartItem) {
      return res.status(404).json({
        success: false,
        message: 'Cart item not found',
      });
    }
 
    res.status(200).json({
      success: true,
      message: 'Item removed from cart',
      data: {},
    });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Cart item not found',
      });
    }
    next(error);
  }
};
 
/**
* Clear all cart items for a user
* Matches Supabase clearCart function
*/
exports.clearCart = async (req, res, next) => {
  try {
    const userId = req.user._id;
 
    await CartItem.deleteMany({ user_id: userId });
 
    res.status(200).json({
      success: true,
      message: 'Cart cleared successfully',
      data: {},
    });
  } catch (error) {
    next(error);
  }
};
 
/**
* Get cart summary (total items, total price)
*/
exports.getCartSummary = async (req, res, next) => {
  try {
    const userId = req.user._id;
 
    const cartItems = await CartItem.find({ user_id: userId }).populate({
      path: 'product_id',
      select: 'name price images in_stock description category createdAt updatedAt',
    });
 
    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = cartItems.reduce((sum, item) => {
      return sum + item.product_id.price * item.quantity;
    }, 0);
 
    res.status(200).json({
      success: true,
      data: {
        totalItems,
        totalPrice: parseFloat(totalPrice.toFixed(2)),
        itemCount: cartItems.length,
      },
    });
  } catch (error) {
    next(error);
  }
};