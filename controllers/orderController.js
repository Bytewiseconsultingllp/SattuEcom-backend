const Order = require("../models/Order");
const OrderItem = require("../models/OrderItem");
const Address = require("../models/Address");
const Product = require("../models/Product");
const CartItem = require("../models/CartItem");
const Coupon = require("../models/Coupon");
const Payment = require("../models/Payment");
const { computeDiscount, isUsable } = require("../utils/coupon");
const logger = require("../utils/logger");
const {
  sendOrderCreatedEmail,
  sendOrderCancelledEmail,
} = require("../utils/emailService");
const { createInvoiceFromOrder } = require("./invoiceController");
/**
 * Get all orders for a user with nested order_items, products, and shipping address
 * Matches Supabase getOrders function
 */
// controllers/orderController.js
exports.getOrders = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 100);

    logger.info("orders:getOrders:start", {
      userId,
      page,
      limit,
    });

    const [orders, total] = await Promise.all([
      Order.find({ user_id: userId })
        .populate({ path: "shipping_address_id", model: "Address" })
        .populate({
          path: "order_items",
          populate: {
            path: "product_id",
            select:
              "name description price original_price category images in_stock rating reviews_count benefits ingredients usage createdAt updatedAt",
          },
        })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Order.countDocuments({ user_id: userId }),
    ]);

    const formatted = orders.map((order) => {
      // map items to your shape
      const items = (order.order_items || []).map((item) => ({
        id: item._id.toString(),
        order_id: item.order_id.toString(),
        product_id: item.product_id?._id?.toString(),
        quantity: item.quantity,
        price: item.price,
        created_at: item.createdAt, // Mongoose default
        product: item.product_id
          ? {
              id: item.product_id._id.toString(),
              name: item.product_id.name,
              description: item.product_id.description,
              price: item.product_id.price,
              original_price: item.product_id.original_price,
              category: item.product_id.category,
              images: item.product_id.images,
              in_stock: item.product_id.in_stock,
              rating: item.product_id.rating,
              reviews_count: item.product_id.reviews_count,
              benefits: item.product_id.benefits,
              ingredients: item.product_id.ingredients,
              usage: item.product_id.usage,
              created_at: item.product_id.createdAt,
              updated_at: item.product_id.updatedAt,
            }
          : undefined,
      }));

      // map shipping address
      let shipping_address;
      if (order.shipping_address_id) {
        shipping_address = {
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
      }

      // build normalized order
      const out = {
        ...order,
        id: order._id.toString(),
        user_id: order.user_id.toString(),
        created_at: order.createdAt,
        updated_at: order.updatedAt,
        order_items: items,
      };

      if (shipping_address) out.shipping_address = shipping_address;

      // Include invoice data if available
      if (order.invoice_id) {
        out.invoice_id = order.invoice_id.toString();
        out.invoice_number = order.invoice_number;
      }

      // cleanup mongo internals
      delete out._id;
      delete out.__v;
      delete out.createdAt;
      delete out.updatedAt;
      delete out.shipping_address_id;

      return out;
    });

    logger.info("orders:getOrders:success", {
      userId,
      page,
      limit,
      count: formatted.length,
      total,
    });

    return res.status(200).json({
      success: true,
      count: formatted.length,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: formatted,
    });
  } catch (error) {
    logger.error("orders:getOrders:error", {
      message: error.message,
      stack: error.stack,
      userId: req.user?._id,
    });
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

    logger.info("orders:getOrderById:start", {
      userId,
      orderId,
    });

    const order = await Order.findOne({ _id: orderId, user_id: userId })
      .populate("shipping_address_id")
      .lean();

    if (!order) {
      logger.warn("orders:getOrderById:not_found", {
        userId,
        orderId,
      });
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    const orderItems = await OrderItem.find({ order_id: order._id })
      .populate("product_id")
      .lean();

    order.order_items = orderItems.map((item) => ({
      id: item._id.toString(),
      order_id: item.order_id.toString(),
      product_id: item.product_id._id.toString(),
      quantity: item.quantity,
      price: item.price,
      created_at: item.createdAt, // CHANGED from item.created_at
      product: {
        id: item.product_id._id.toString(),
        name: item.product_id.name,
        description: item.product_id.description,
        price: item.product_id.price,
        original_price: item.product_id.original_price,
        category: item.product_id.category,
        images: item.product_id.images,
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

    order.id = order._id.toString();
    order.user_id = order.user_id.toString();
    order.created_at = order.createdAt;
    order.updated_at = order.updatedAt;

    // Include invoice data if available
    if (order.invoice_id) {
      order.invoice_id = order.invoice_id.toString();
      // invoice_number is already a string, keep it as is
    }

    delete order._id;
    delete order.createdAt;
    delete order.updatedAt;
    delete order.__v;

    logger.info("orders:getOrderById:success", {
      userId,
      orderId,
    });

    return res.status(200).json({ success: true, data: order });
  } catch (error) {
    if (error.kind === "ObjectId") {
      logger.warn("orders:getOrderById:invalid_id", {
        orderId: req.params.id,
      });
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }
    logger.error("orders:getOrderById:error", {
      message: error.message,
      stack: error.stack,
      userId: req.user?._id,
      orderId: req.params.id,
    });
    next(error);
  }
};

/**
 * Get order confirmation with accurate payment summary
 * Returns all payment details for order confirmation page
 */
exports.getOrderConfirmation = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const orderId = req.params.id;

    logger.info("orders:getOrderConfirmation:start", {
      userId,
      orderId,
    });

    // Fetch order with all details
    const order = await Order.findOne({ _id: orderId, user_id: userId })
      .populate("shipping_address_id")
      .lean();

    if (!order) {
      logger.warn("orders:getOrderConfirmation:not_found", {
        userId,
        orderId,
      });
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Fetch order items with product details
    const orderItems = await OrderItem.find({ order_id: order._id })
      .populate("product_id")
      .lean();

    // Calculate subtotal from items
    const subtotal = orderItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    // Get all payment components from order
    const discountAmount = order.discount_amount || 0;
    const couponDiscount = order.discount_amount || 0;
    const giftPrice = order.gift_price || 0;
    const deliveryCharges = order.delivery_charges || 0;
    const taxAmount = order.tax_amount || 0;

    // Calculate subtotal after discounts
    const subtotalAfterDiscount =
      subtotal - discountAmount - couponDiscount + giftPrice;

    // Use stored tax or calculate 5% GST
    let gstAmount = taxAmount;
    if (gstAmount === 0) {
      gstAmount = (subtotalAfterDiscount * 5) / 100;
    }

    // Calculate final total
    const finalTotal = subtotalAfterDiscount + gstAmount + deliveryCharges;

    // Format order items
    const items = orderItems.map((item) => ({
      id: item._id.toString(),
      product_id: item.product_id._id.toString(),
      name: item.product_id.name,
      description: item.product_id.description,
      quantity: item.quantity,
      price: item.price,
      total: item.price * item.quantity,
      images: item.product_id.images,
    }));

    // Format shipping address
    let shippingAddress = null;
    if (order.shipping_address_id) {
      shippingAddress = {
        id: order.shipping_address_id._id.toString(),
        full_name: order.shipping_address_id.full_name,
        phone: order.shipping_address_id.phone,
        address_line1: order.shipping_address_id.address_line1,
        address_line2: order.shipping_address_id.address_line2,
        city: order.shipping_address_id.city,
        state: order.shipping_address_id.state,
        postal_code: order.shipping_address_id.postal_code,
        country: order.shipping_address_id.country,
      };
    }

    // Build confirmation response with accurate payment summary
    const confirmationData = {
      order_id: order._id.toString(),
      order_number: order.order_number || order._id.toString(),
      status: order.status,
      created_at: order.createdAt,

      // Items
      items: items,
      items_count: items.length,
      items_quantity: items.reduce((sum, item) => sum + item.quantity, 0),

      // Payment Summary (Accurate)
      payment_summary: {
        subtotal: subtotal,
        discount: discountAmount,
        coupon_discount: couponDiscount,
        gift_price: giftPrice,
        delivery_charges: deliveryCharges,
        delivery_type: order.delivery_type || "standard",
        tax: gstAmount,
        tax_rate: 5,
        total: finalTotal,
      },

      // Order Details
      coupon_code: order.coupon_code || null,
      gift_design_id: order.gift_design_id?.toString() || null,
      gift_card_message: order.gift_card_message || null,

      // Shipping
      shipping_address: shippingAddress,

      // Invoice
      invoice_id: order.invoice_id?.toString() || null,
      invoice_number: order.invoice_number || null,

      // Payment Status
      payment_status: order.payment_status || "pending",
      payment_method: order.payment_method || null,
    };

    logger.info("orders:getOrderConfirmation:success", {
      userId,
      orderId,
    });

    return res.status(200).json({
      success: true,
      data: confirmationData,
    });
  } catch (error) {
    if (error.kind === "ObjectId") {
      logger.warn("orders:getOrderConfirmation:invalid_id", {
        orderId: req.params.id,
      });
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }
    logger.error("orders:getOrderConfirmation:error", {
      message: error.message,
      stack: error.stack,
      userId: req.user?._id,
      orderId: req.params.id,
    });
    next(error);
  }
};

/**
 * Create order with items
 * Matches Supabase createOrder function
 */
// createOrder (fixed)
exports.createOrder = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const {
      total_amount,
      shipping_address_id,
      items,
      coupon_code,
      gift_design_id,
      gift_price,
      gift_card_message,
      gift_wrapping_type,
      delivery_charges,
      delivery_type,
      tax_amount,
      razorpay_payment_id,
      razorpay_order_id,
      payment_method,
    } = req.body;

    logger.info("createOrder:start", {
      userId,
      total_amount,
      itemsCount: items ? items.length : 0,
      payment_method,
    });

    // Basic validation
    if (!total_amount || !shipping_address_id || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Total amount, shipping address, and items are required",
      });
    }

    // Validate shipping address belongs to user
    const address = await Address.findOne({
      _id: shipping_address_id,
      user_id: userId,
    });
    if (!address) {
      return res
        .status(404)
        .json({ success: false, message: "Shipping address not found" });
    }

    // Validate products exist
    const productIds = items.map((i) => i.product_id);
    const products = await Product.find({ _id: { $in: productIds } });
    if (products.length !== productIds.length) {
      return res
        .status(404)
        .json({ success: false, message: "One or more products not found" });
    }

    // Server-side coupon validation
    let discount_amount = 0;
    let couponUsed = null;
    if (coupon_code) {
      const coupon = await Coupon.findOne({
        code: String(coupon_code).toUpperCase().trim(),
      });
      if (coupon && isUsable(coupon)) {
        discount_amount = computeDiscount(items, coupon); // server computed discount value
        couponUsed = coupon;
      }
    }

    // finalTotal should come from frontend (trusted as final paid), but ensure non-negative
    const finalTotal = Math.max(0, Number(total_amount));

    // Determine sale type explicitly:
    // If razorpay_payment_id present -> online; otherwise offline.
    // Also treat explicit payment_method !== 'cod' as online if you want; keep razorpay primary.
    let sale_type = "online";
    sale_type = payment_method ? "offline" : "online";
    logger.debug("createOrder:sale_type", { sale_type });

    // Create order
    const order = await Order.create({
      user_id: userId,
      total_amount: finalTotal,
      shipping_address_id,
      status: "pending",
      coupon_code: couponUsed ? couponUsed.code : null,
      discount_amount: discount_amount || 0,
      delivery_charges: delivery_charges || 0,
      delivery_type: delivery_type || "standard",
      tax_amount: tax_amount || 0,
      gift_design_id: gift_design_id || null,
      gift_price: gift_price || 0,
      gift_card_message: gift_card_message || undefined,
      gift_wrapping_type: gift_wrapping_type || undefined,
      sale_type,
      razorpay_order_id: razorpay_order_id || undefined,
    });

    logger.info("createOrder:order_created", {
      userId,
      orderId: order._id.toString(),
      sale_type,
      total_amount: finalTotal,
    });

    // Create order items
    const orderItemsData = items.map((i) => ({
      order_id: order._id,
      product_id: i.product_id,
      quantity: i.quantity,
      price: i.price,
    }));
    await OrderItem.insertMany(orderItemsData);

    // Clear cart
    await CartItem.deleteMany({ user_id: userId });

    // Increment coupon usage if used
    if (couponUsed) {
      await Coupon.updateOne(
        { _id: couponUsed._id },
        { $inc: { usage_count: 1 } }
      ).catch((err) => {
        logger.error("createOrder:increment_coupon_usage_failed", {
          message: err?.message || err,
          couponId: couponUsed?._id?.toString(),
        });
      });
    }

    // Re-fetch populated order for response/template
    const populatedOrder = await Order.findById(order._id)
      .populate("shipping_address_id")
      .lean();
    const orderItems = await OrderItem.find({ order_id: order._id })
      .populate("product_id")
      .lean();

    populatedOrder.order_items = orderItems.map((item) => ({
      id: item._id.toString(),
      order_id: item.order_id.toString(),
      product_id: item.product_id._id.toString(),
      quantity: item.quantity,
      price: item.price,
      created_at: item.created_at,
      product: {
        id: item.product_id._id.toString(),
        name: item.product_id.name,
        images: item.product_id.images || [],
        price: item.product_id.price,
      },
    }));

    if (populatedOrder.shipping_address_id) {
      populatedOrder.shipping_address = {
        id: populatedOrder.shipping_address_id._id.toString(),
        user_id: populatedOrder.shipping_address_id.user_id.toString(),
        label: populatedOrder.shipping_address_id.label,
        full_name: populatedOrder.shipping_address_id.full_name,
        phone: populatedOrder.shipping_address_id.phone,
        address_line1: populatedOrder.shipping_address_id.address_line1,
        address_line2: populatedOrder.shipping_address_id.address_line2,
        city: populatedOrder.shipping_address_id.city,
        state: populatedOrder.shipping_address_id.state,
        postal_code: populatedOrder.shipping_address_id.postal_code,
        country: populatedOrder.shipping_address_id.country,
        is_default: populatedOrder.shipping_address_id.is_default,
        created_at: populatedOrder.shipping_address_id.createdAt,
        updated_at: populatedOrder.shipping_address_id.updatedAt,
      };
      delete populatedOrder.shipping_address_id;
    }

    // Normalize ids & timestamps
    populatedOrder.id = populatedOrder._id.toString();
    populatedOrder.created_at = populatedOrder.createdAt;
    populatedOrder.updated_at = populatedOrder.updatedAt;
    delete populatedOrder._id;
    delete populatedOrder.__v;
    delete populatedOrder.createdAt;
    delete populatedOrder.updatedAt;

    // Send order created email (best-effort)
    try {
      await sendOrderCreatedEmail(populatedOrder, req.user.email);
      logger.info("createOrder:order_created_email_sent", {
        userId,
        orderId: populatedOrder.id,
      });
    } catch (e) {
      logger.error("createOrder:send_order_created_email_failed", {
        message: e?.message,
        orderId: populatedOrder.id,
      });
    }

    // Create invoice (with paymentData if available)
    let invoice = null;
    try {
      // Fetch payment record if razorpay_payment_id supplied
      let paymentData = null;
      if (razorpay_payment_id) {
        paymentData = await Payment.findOne({
          razorpay_payment_id: razorpay_payment_id,
        }).lean();
        if (!paymentData) {
          // Minimal placeholder if payment record missing even though id provided
          paymentData = {
            razorpay_payment_id,
            razorpay_order_id,
            status: "captured",
            payment_method: payment_method || "razorpay",
          };
        }
      }

      // Calculate itemsSubtotal server-side (for invoice fields)
      const itemsSubtotal = orderItems.reduce(
        (s, it) => s + parseFloat(it.price) * parseInt(it.quantity || 1),
        0
      );

      // GST: use tax_amount from request or compute 5% on subtotal - discount (only if online)
      let gstAmount = tax_amount || 0;
      if (!gstAmount && sale_type === "online") {
        const taxableBase =
          itemsSubtotal - (discount_amount || 0) + (gift_price || 0);
        gstAmount = (taxableBase * 5) / 100;
      } else if (sale_type === "offline") {
        // offline: GST included in subtotal (no separate GST)
        gstAmount = 0;
      }

      // Build invoiceData with unified field names expected by the PDF
      const invoiceData = {
        user_id: userId,
        items: orderItems.map((item) => ({
          product_id: item.product_id._id,
          name: item.product_id.name,
          description: item.product_id.description,
          quantity: item.quantity,
          price: item.price,
        })),
        subtotal: itemsSubtotal,
        gst_amount: gstAmount,
        tax: gstAmount,
        discount_amount: sale_type === "offline" ? discount_amount : 0, // offline manual discount
        coupon_discount: sale_type === "online" ? discount_amount || 0 : 0, // online coupon discount (we used discount_amount to hold computed coupon)
        gift_price: gift_price || 0,
        delivery_charges: delivery_charges || 0,
        shipping_charges: delivery_charges || 0,
        total_amount: finalTotal,
        total: finalTotal,
        payment_status: paymentData ? "completed" : "pending",
        payment_method: paymentData
          ? paymentData.payment_method || payment_method || "razorpay"
          : payment_method || null,
        sale_type: sale_type,
        billing_address: populatedOrder.shipping_address,
        shipping_address: populatedOrder.shipping_address,
        notes: "Thank you for your order!",
      };

      logger.info("createOrder:creating_invoice", {
        orderId: order._id.toString(),
        sale_type,
        hasPaymentData: !!paymentData,
      });

      // Create invoice using the unified payload; pass paymentData for online orders
      invoice = await createInvoiceFromOrder(
        order._id,
        invoiceData,
        paymentData
      );

      logger.info("createOrder:invoice_created", {
        orderId: order._id.toString(),
        invoiceId: invoice._id.toString(),
        invoiceNumber: invoice.invoiceNumber,
      });

      // Save invoice references on order
      order.invoice_id = invoice._id;
      order.invoice_number = invoice.invoiceNumber;
      await order.save();

      // Add invoice info to populatedOrder for response
      populatedOrder.invoice_id = invoice._id.toString();
      populatedOrder.invoice_number = invoice.invoiceNumber;
    } catch (e) {
      logger.error("createOrder:invoice_creation_failed", {
        message: e?.message,
        stack: e?.stack,
        orderId: order._id?.toString(),
      });
    }

    res.status(201).json({
      success: true,
      data: populatedOrder,
      message: "Order created successfully",
    });
    logger.info("createOrder:success", {
      userId,
      orderId: populatedOrder.id,
      invoice_number: populatedOrder.invoice_number,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      logger.warn("createOrder:validation_error", {
        message: error.message,
      });
      const messages = Object.values(error.errors).map((err) => err.message);
      return res
        .status(400)
        .json({ success: false, message: messages.join(", ") });
    }
    logger.error("createOrder:error", {
      message: error.message,
      stack: error.stack,
    });
    next(error);
  }
};

/**
 * Update order status
 * Matches Supabase updateOrderStatus function
 */
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { status, shipmentDetails } = req.body;
    const orderId = req.params.id;

    logger.info("orders:updateOrderStatus:start", {
      orderId,
      status,
      isAdmin: req.user?.role === "admin",
    });

    // Validate status
    const validStatuses = [
      "pending",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
    ];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${validStatuses.join(", ")}`,
      });
    }

    // Build update object
    const updateData = { status };

    // If status is shipped, handle shipment details
    if (status === "shipped" && shipmentDetails) {
      if (!shipmentDetails.deliveryPartner || !shipmentDetails.trackingNumber) {
        return res.status(400).json({
          success: false,
          message:
            "Delivery partner and tracking number are required for shipped status",
        });
      }

      updateData.shipment = {
        deliveryPartner: shipmentDetails.deliveryPartner,
        trackingNumber: shipmentDetails.trackingNumber,
        estimatedDelivery: shipmentDetails.estimatedDelivery || null,
        shippedAt: new Date(),
      };
    }

    // For regular users, they can only access their own orders
    // For admin route, we'll check if user is admin (implement role-based access)
    let query = { _id: orderId };

    // If not admin, restrict to user's own orders
    if (!req.user.role || req.user.role !== "admin") {
      query.user_id = req.user._id;
    }

    const order = await Order.findOneAndUpdate(query, updateData, {
      new: true,
      runValidators: true,
    }).lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
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

    logger.info("orders:updateOrderStatus:success", {
      orderId,
      status: order.status,
    });

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    if (error.kind === "ObjectId") {
      logger.warn("orders:updateOrderStatus:invalid_id", {
        orderId: req.params.id,
      });
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }
    logger.error("orders:updateOrderStatus:error", {
      message: error.message,
      stack: error.stack,
      orderId: req.params.id,
    });
    next(error);
  }
};

/**
 * Get all orders (Admin only)
 * ✅ OPTIMIZED: Uses aggregation to fetch all data in 1-2 queries instead of N+1
 */
exports.getAllOrders = async (req, res, next) => {
  try {
    logger.info("orders:getAllOrders:start", {
      isAdmin: req.user?.role === "admin",
    });
    // ✅ Use aggregation to fetch orders with order items in a single query
    const orders = await Order.aggregate([
      // Step 1: Sort orders by creation date
      { $sort: { createdAt: -1 } },

      // Step 2: Lookup order items for each order
      {
        $lookup: {
          from: "orderitems",
          localField: "_id",
          foreignField: "order_id",
          as: "order_items",
        },
      },

      // Step 3: Lookup product details for each order item
      {
        $lookup: {
          from: "products",
          localField: "order_items.product_id",
          foreignField: "_id",
          as: "products",
        },
      },

      // Step 4: Lookup user details
      {
        $lookup: {
          from: "users",
          localField: "user_id",
          foreignField: "_id",
          as: "user_details",
        },
      },

      // Step 5: Unwind and restructure order items with product info
      {
        $addFields: {
          order_items: {
            $map: {
              input: "$order_items",
              as: "item",
              in: {
                id: { $toString: "$$item._id" },
                order_id: { $toString: "$$item.order_id" },
                product_id: { $toString: "$$item.product_id" },
                quantity: "$$item.quantity",
                price: "$$item.price",
                created_at: "$$item.created_at",
                product: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: "$products",
                        as: "prod",
                        cond: { $eq: ["$$prod._id", "$$item.product_id"] },
                      },
                    },
                    0,
                  ],
                },
              },
            },
          },
        },
      },

      // Step 6: Format response
      {
        $project: {
          _id: 0,
          id: { $toString: "$_id" },
          user_id: { $toString: "$user_id" },
          total_amount: 1,
          status: 1,
          shipping_address_id: { $toString: "$shipping_address_id" },
          created_at: "$createdAt",
          updated_at: "$updatedAt",
          order_items: {
            $map: {
              input: "$order_items",
              as: "item",
              in: {
                id: "$$item.id",
                order_id: "$$item.order_id",
                product_id: "$$item.product_id",
                quantity: "$$item.quantity",
                price: "$$item.price",
                created_at: "$$item.created_at",
                product: {
                  name: { $ifNull: ["$$item.product.name", "Unknown"] },
                },
              },
            },
          },
          user: {
            full_name: { $arrayElemAt: ["$user_details.name", 0] },
            email: { $arrayElemAt: ["$user_details.email", 0] },
          },
        },
      },
    ]);

    logger.info("orders:getAllOrders:success", {
      count: orders.length,
    });

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    logger.error("orders:getAllOrders:error", {
      message: error.message,
      stack: error.stack,
    });
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
    const reasonRaw = req.body?.reason;
    const reason = typeof reasonRaw === "string" ? reasonRaw.trim() : "";

    logger.info("orders:cancelOrder:start", {
      userId,
      orderId,
    });

    const order = await Order.findOne({ _id: orderId, user_id: userId });
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    if (!["pending", "processing"].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel order with status: ${order.status}`,
      });
    }

    order.status = "cancelled";
    if ("cancellation_reason" in order)
      order.cancellation_reason = reason || "";
    if ("cancelled_at" in order) order.cancelled_at = new Date();
    if ("cancelled_by" in order) order.cancelled_by = userId;
    await order.save();

    // Populate for email/template
    const populatedOrder = await Order.findById(order._id)
      .populate("shipping_address_id")
      .lean();

    const orderItems = await OrderItem.find({ order_id: order._id })
      .populate("product_id")
      .lean();

    populatedOrder.order_items = orderItems.map((item) => ({
      id: item._id.toString(),
      order_id: item.order_id.toString(),
      product_id: item.product_id._id.toString(),
      quantity: item.quantity,
      price: item.price,
      created_at: item.createdAt, // use createdAt (Mongoose default)
      product: {
        id: item.product_id._id.toString(),
        name: item.product_id.name,
        images: item.product_id.images,
        price: item.product_id.price,
      },
    }));

    if (populatedOrder.shipping_address_id) {
      populatedOrder.shipping_address = {
        id: populatedOrder.shipping_address_id._id.toString(),
        user_id: populatedOrder.shipping_address_id.user_id.toString(),
        label: populatedOrder.shipping_address_id.label,
        full_name: populatedOrder.shipping_address_id.full_name,
        phone: populatedOrder.shipping_address_id.phone,
        address_line1: populatedOrder.shipping_address_id.address_line1,
        address_line2: populatedOrder.shipping_address_id.address_line2,
        city: populatedOrder.shipping_address_id.city,
        state: populatedOrder.shipping_address_id.state,
        postal_code: populatedOrder.shipping_address_id.postal_code,
        country: populatedOrder.shipping_address_id.country,
        is_default: populatedOrder.shipping_address_id.is_default,
        created_at: populatedOrder.shipping_address_id.createdAt,
        updated_at: populatedOrder.shipping_address_id.updatedAt,
      };
      delete populatedOrder.shipping_address_id;
    }

    populatedOrder.id = populatedOrder._id.toString();
    populatedOrder.created_at = populatedOrder.createdAt;
    populatedOrder.updated_at = populatedOrder.updatedAt;
    delete populatedOrder._id;
    delete populatedOrder.__v;
    delete populatedOrder.createdAt;
    delete populatedOrder.updatedAt;

    const userEmail = req.user.email || populatedOrder?.user?.email; // fallback if needed

    try {
      await sendOrderCancelledEmail(
        populatedOrder,
        userEmail,
        reason || "No reason provided"
      );
    } catch (e) {
      logger.error("orders:cancelOrder:send_cancelled_email_failed", {
        message: e?.message,
        orderId: order._id.toString(),
      });
    }

    // Response to client (saved order)
    const formattedOrder = order.toObject();
    formattedOrder.id = formattedOrder._id;
    delete formattedOrder._id;
    delete formattedOrder.__v;
    formattedOrder.created_at = formattedOrder.createdAt;
    formattedOrder.updated_at = formattedOrder.updatedAt;
    delete formattedOrder.createdAt;
    delete formattedOrder.updatedAt;

    logger.info("orders:cancelOrder:success", {
      userId,
      orderId: formattedOrder.id,
      status: formattedOrder.status,
    });

    return res.status(200).json({
      success: true,
      data: formattedOrder,
      message: "Order cancelled successfully",
    });
  } catch (error) {
    if (error.kind === "ObjectId") {
      logger.warn("orders:cancelOrder:invalid_id", {
        orderId: req.params.id,
      });
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }
    logger.error("orders:cancelOrder:error", {
      message: error.message,
      stack: error.stack,
      userId: req.user?._id,
      orderId: req.params.id,
    });
    next(error);
  }
};
