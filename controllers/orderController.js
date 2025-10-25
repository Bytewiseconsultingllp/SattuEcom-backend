const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const Address = require('../models/Address');
const Product = require('../models/Product');
const CartItem = require('../models/CartItem');
 
/**
* Get all orders for a user with nested order_items, products, and shipping address
* Matches Supabase getOrders function
*/
exports.getOrders = async (req, res, next) => {
  try {
    const userId = req.user._id;
 
    const orders = await Order.find({ user_id: userId })
      .populate({
        path: 'shipping_address_id',
        model: 'Address',
      })
      .sort({ createdAt: -1 })
      .lean();
 
    // Get order items with products for each order
    for (let order of orders) {
      const orderItems = await OrderItem.find({ order_id: order._id })
        .populate('product_id')
        .lean();
 
      // Format order items to match Supabase structure
      order.order_items = orderItems.map((item) => ({
        id: item._id.toString(),
        order_id: item.order_id.toString(),
        product_id: item.product_id._id.toString(),
        quantity: item.quantity,
        price: item.price,
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
 
      // Format shipping address
      if (order.shipping_address_id) {
        order.shipping_address = {
          id: order.shipping_address_id._id.toString(),
          user_id: order.shipping_address_id.user_id.toString(),
          label: order.shipping_address_id.label,
          full_name: order.shipping_address_id.full_name,
          phone: order.shipping_address_id.phone,
          address_line1: order.shipping_address_id.address_line1,
          address_line2: order.shipping_address_id.address_line2,
          city: order.shipping_address_id.city,
          state: order.shipping_address_id.state,
          postal_code: order.shipping_address_id.postal_code,
          country: order.shipping_address_id.country,
          is_default: order.shipping_address_id.is_default,
          created_at: order.shipping_address_id.createdAt,
          updated_at: order.shipping_address_id.updatedAt,
        };
        delete order.shipping_address_id;
      }
 
      // Format order
      order.id = order._id.toString();
      order.user_id = order.user_id.toString();
      order.created_at = order.createdAt;
      order.updated_at = order.updatedAt;
      delete order._id;
      delete order.createdAt;
      delete order.updatedAt;
      delete order.__v;
    }
 
    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    next(error);
  }
};
 
/**
* Get single order by ID with all nested data
* Matches Supabase getOrderById function
*/
exports.getOrderById = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const orderId = req.params.id;
 
    const order = await Order.findOne({ _id: orderId, user_id: userId })
      .populate('shipping_address_id')
      .lean();
 
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }
 
    // Get order items with products
    const orderItems = await OrderItem.find({ order_id: order._id })
      .populate('product_id')
      .lean();
 
    // Format order items
    order.order_items = orderItems.map((item) => ({
      id: item._id.toString(),
      order_id: item.order_id.toString(),
      product_id: item.product_id._id.toString(),
      quantity: item.quantity,
      price: item.price,
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
 
    // Format shipping address
    if (order.shipping_address_id) {
      order.shipping_address = {
        id: order.shipping_address_id._id.toString(),
        user_id: order.shipping_address_id.user_id.toString(),
        label: order.shipping_address_id.label,
        full_name: order.shipping_address_id.full_name,
        phone: order.shipping_address_id.phone,
        address_line1: order.shipping_address_id.address_line1,
        address_line2: order.shipping_address_id.address_line2,
        city: order.shipping_address_id.city,
        state: order.shipping_address_id.state,
        postal_code: order.shipping_address_id.postal_code,
        country: order.shipping_address_id.country,
        is_default: order.shipping_address_id.is_default,
        created_at: order.shipping_address_id.createdAt,
        updated_at: order.shipping_address_id.updatedAt,
      };
      delete order.shipping_address_id;
    }
 
    // Format order
    order.id = order._id.toString();
    order.user_id = order.user_id.toString();
    order.created_at = order.createdAt;
    order.updated_at = order.updatedAt;
    delete order._id;
    delete order.createdAt;
    delete order.updatedAt;
    delete order.__v;
 
    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }
    next(error);
  }
};
 
/**
* Create order with items
* Matches Supabase createOrder function
*/
exports.createOrder = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { total_amount, shipping_address_id, items } = req.body;
 
    // Validate required fields
    if (!total_amount || !shipping_address_id || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Total amount, shipping address, and items are required',
      });
    }
 
    // Validate shipping address belongs to user
    const address = await Address.findOne({
      _id: shipping_address_id,
      user_id: userId,
    });
 
    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Shipping address not found',
      });
    }
 
    // Validate all products exist
    const productIds = items.map((item) => item.product_id);
    const products = await Product.find({ _id: { $in: productIds } });
 
    if (products.length !== productIds.length) {
      return res.status(404).json({
        success: false,
        message: 'One or more products not found',
      });
    }
 
    // Create order
    const order = await Order.create({
      user_id: userId,
      total_amount,
      shipping_address_id,
      status: 'pending',
    });
 
    // Create order items
    const orderItemsData = items.map((item) => ({
      order_id: order._id,
      product_id: item.product_id,
      quantity: item.quantity,
      price: item.price,
    }));
 
    await OrderItem.insertMany(orderItemsData);
 
    // Clear user's cart after successful order
    await CartItem.deleteMany({ user_id: userId });
 
    // Return formatted order
    const formattedOrder = order.toObject();
    formattedOrder.id = formattedOrder._id;
    delete formattedOrder._id;
    delete formattedOrder.__v;
    formattedOrder.created_at = formattedOrder.createdAt;
    formattedOrder.updated_at = formattedOrder.updatedAt;
    delete formattedOrder.createdAt;
    delete formattedOrder.updatedAt;
 
    res.status(201).json({
      success: true,
      data: formattedOrder,
      message: 'Order created successfully',
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
* Update order status
* Matches Supabase updateOrderStatus function
*/
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const orderId = req.params.id;
 
    // Validate status
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${validStatuses.join(', ')}`,
      });
    }
 
    // For regular users, they can only access their own orders
    // For admin route, we'll check if user is admin (implement role-based access)
    let query = { _id: orderId };
    
    // If not admin, restrict to user's own orders
    if (!req.user.role || req.user.role !== 'admin') {
      query.user_id = req.user._id;
    }
 
    const order = await Order.findOneAndUpdate(
      query,
      { status },
      { new: true, runValidators: true }
    ).lean();
 
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }
 
    // Format order
    order.id = order._id.toString();
    order.user_id = order.user_id.toString();
    order.shipping_address_id = order.shipping_address_id.toString();
    order.created_at = order.createdAt;
    order.updated_at = order.updatedAt;
    delete order._id;
    delete order.createdAt;
    delete order.updatedAt;
    delete order.__v;
 
    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }
    next(error);
  }
};
 
/**
* Get all orders (Admin only)
* Matches Supabase getAllOrders function
*/
exports.getAllOrders = async (req, res, next) => {
  try {
    // This should be protected by admin middleware
    const orders = await Order.find()
      .populate('user_id', 'name email')
      .sort({ createdAt: -1 })
      .lean();
 
    // Get order items for each order
    for (let order of orders) {
      const orderItems = await OrderItem.find({ order_id: order._id })
        .populate('product_id', 'name')
        .lean();
 
      order.order_items = orderItems.map((item) => ({
        id: item._id.toString(),
        order_id: item.order_id.toString(),
        product_id: item.product_id._id.toString(),
        quantity: item.quantity,
        price: item.price,
        created_at: item.created_at,
        product: {
          name: item.product_id.name,
        },
      }));
 
      // Format user info
      if (order.user_id) {
        order.user = {
          full_name: order.user_id.name,
          email: order.user_id.email,
        };
        order.user_id = order.user_id._id.toString();
      }
 
      // Format order
      order.id = order._id.toString();
      order.shipping_address_id = order.shipping_address_id.toString();
      order.created_at = order.createdAt;
      order.updated_at = order.updatedAt;
      delete order._id;
      delete order.createdAt;
      delete order.updatedAt;
      delete order.__v;
    }
 
    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    next(error);
  }
};
 
/**
* Cancel order (user can only cancel their own pending orders)
*/
exports.cancelOrder = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const orderId = req.params.id;
 
    const order = await Order.findOne({
      _id: orderId,
      user_id: userId,
    });
 
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }
 
    // Only allow cancellation of pending or processing orders
    if (!['pending', 'processing'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel order with status: ${order.status}`,
      });
    }
 
    order.status = 'cancelled';
    await order.save();
 
    const formattedOrder = order.toObject();
    formattedOrder.id = formattedOrder._id;
    delete formattedOrder._id;
    delete formattedOrder.__v;
    formattedOrder.created_at = formattedOrder.createdAt;
    formattedOrder.updated_at = formattedOrder.updatedAt;
    delete formattedOrder.createdAt;
    delete formattedOrder.updatedAt;
 
    res.status(200).json({
      success: true,
      data: formattedOrder,
      message: 'Order cancelled successfully',
    });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }
    next(error);
  }
};
 