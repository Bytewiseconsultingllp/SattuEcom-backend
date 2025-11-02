const Coupon = require('../models/Coupon');

exports.getActiveCoupons = async (req, res, next) => {
  try {
    const coupons = await Coupon.find({ is_active: true }).lean();
    res.json({ success: true, data: coupons.map(c => ({ ...c, id: c._id.toString() })) });
  } catch (error) {
    next(error);
  }
};

exports.validateCoupon = async (req, res, next) => {
  try {
    const { code, cart_total } = req.body;
    const coupon = await Coupon.findOne({ code: code.toUpperCase(), is_active: true });
    
    if (!coupon) return res.json({ success: true, data: { valid: false, message: 'Invalid coupon' }});
    
    const now = new Date();
    if (coupon.start_date && now < coupon.start_date) 
      return res.json({ success: true, data: { valid: false, message: 'Coupon not yet active' }});
    if (coupon.end_date && now > coupon.end_date) 
      return res.json({ success: true, data: { valid: false, message: 'Coupon expired' }});
    if (coupon.usage_limit > 0 && coupon.usage_count >= coupon.usage_limit) 
      return res.json({ success: true, data: { valid: false, message: 'Usage limit reached' }});
    if (cart_total < coupon.min_purchase_amount) 
      return res.json({ success: true, data: { valid: false, message: `Min ₹${coupon.min_purchase_amount} required` }});
    
    let discount = 0;
    if (coupon.type === 'percentage') {
      discount = (cart_total * coupon.discount_value) / 100;
      if (coupon.max_discount_amount) discount = Math.min(discount, coupon.max_discount_amount);
    } else if (coupon.type === 'fixed') {
      discount = Math.min(coupon.discount_value, cart_total);
    }
    
    res.json({ success: true, data: { valid: true, coupon, discount_amount: discount }});
  } catch (error) {
    next(error);
  }
};

exports.applyCoupon = async (req, res, next) => {
  try {
    const { code, cart_items } = req.body;
    const coupon = await Coupon.findOne({ code: code.toUpperCase(), is_active: true });
    
    if (!coupon) return res.status(400).json({ success: false, message: 'Invalid coupon' });
    
    const cart_total = cart_items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    let discount = 0;
    if (coupon.type === 'percentage') {
      discount = (cart_total * coupon.discount_value) / 100;
      if (coupon.max_discount_amount) discount = Math.min(discount, coupon.max_discount_amount);
    } else if (coupon.type === 'fixed') {
      discount = Math.min(coupon.discount_value, cart_total);
    } else if (coupon.type === 'buy_x_get_y') {
      const sorted = [...cart_items].sort((a, b) => a.price - b.price);
      const totalQty = cart_items.reduce((sum, item) => sum + item.quantity, 0);
      let freeItems = Math.floor(totalQty / (coupon.buy_quantity + coupon.get_quantity)) * coupon.get_quantity;
      for (const item of sorted) {
        if (freeItems <= 0) break;
        const toDiscount = Math.min(item.quantity, freeItems);
        discount += item.price * toDiscount;
        freeItems -= toDiscount;
      }
    }
    
    coupon.usage_count += 1;
    await coupon.save();
    
    res.json({ success: true, data: { coupon, discount_amount: discount, final_amount: cart_total - discount }});
  } catch (error) {
    next(error);
  }
};