const Coupon = require('../models/Coupon');
const { isUsable, computeDiscount } = require('../utils/coupon');

/**
 * Get all active and usable coupons (not expired, not limit reached, active)
 */
exports.getActiveCoupons = async (req, res, next) => {
  try {
    const coupons = await Coupon.find({ is_active: true }).lean();
    
    // Filter out expired/limit-reached coupons on server
    const usable = coupons.filter(isUsable);
    
    res.json({ 
      success: true, 
      data: usable.map(c => ({ 
        ...c, 
        id: c._id.toString(),
        _id: undefined 
      })) 
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Validate coupon without incrementing usage (quick check)
 */
exports.validateCoupon = async (req, res, next) => {
  try {
    const { code, cart_total } = req.body;
    const coupon = await Coupon.findOne({ code: String(code || '').toUpperCase().trim() });
    
    if (!coupon || !isUsable(coupon)) {
      return res.json({ 
        success: true, 
        data: { 
          valid: false, 
          message: 'Invalid or unavailable coupon' 
        } 
      });
    }
    
    // Check minimum purchase amount
    if (coupon.min_purchase_amount && Number(cart_total) < coupon.min_purchase_amount) {
      return res.json({ 
        success: true, 
        data: { 
          valid: false, 
          message: `Minimum ₹${coupon.min_purchase_amount} required` 
        } 
      });
    }
    
    res.json({ 
      success: true, 
      data: { 
        valid: true, 
        coupon: { ...coupon.toObject(), id: coupon._id.toString(), _id: undefined },
        message: 'Coupon is valid' 
      } 
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Apply coupon and compute discount (does NOT increment usage; that happens on order creation)
 */
exports.applyCoupon = async (req, res, next) => {
  try {
    const { code, cart_items } = req.body;
    
    if (!Array.isArray(cart_items) || cart_items.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cart items are required' 
      });
    }

    const coupon = await Coupon.findOne({ code: String(code || '').toUpperCase().trim() });
    
    if (!coupon || !isUsable(coupon)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid or unavailable coupon' 
      });
    }
    
    // Check for buy_x_get_y coupon: ensure at least one cart item has quantity >= buy_quantity + get_quantity
    if (coupon.type === 'buy_x_get_y') {
      const minRequired = (coupon.buy_quantity || 0) + (coupon.get_quantity || 0);
      
      // Check if ANY single cart item (any product) has at least the minimum required quantity
      const hasEnoughQuantity = cart_items.some(item => Number(item.quantity || 0) >= minRequired);
      
      if (!hasEnoughQuantity) {
        return res.status(400).json({ 
          success: false, 
          message: `This coupon requires at least ${minRequired} quantity of any product in your cart` 
        });
      }
    }
    
    const cart_total = cart_items.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);
    
    // Check minimum purchase amount
    if (coupon.min_purchase_amount && cart_total < coupon.min_purchase_amount) {
      return res.status(400).json({ 
        success: false, 
        message: `Minimum ₹${coupon.min_purchase_amount} required` 
      });
    }
    
    // Compute discount using utility function
    const discount_amount = computeDiscount(cart_items, coupon);
    const final_amount = Math.max(0, cart_total - discount_amount);
    
    res.json({ 
      success: true, 
      data: { 
        coupon: { ...coupon.toObject(), id: coupon._id.toString(), _id: undefined },
        discount_amount, 
        final_amount 
      } 
    });
  } catch (error) {
    next(error);
  }
};