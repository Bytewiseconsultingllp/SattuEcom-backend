/**
 * Coupon utility functions for validation and discount calculation
 */

/**
 * Check if coupon is within valid date range
 */
function isWithinDates(coupon) {
  const now = new Date();
  if (coupon.start_date && new Date(coupon.start_date) > now) return false;
  if (coupon.end_date && new Date(coupon.end_date) < now) return false;
  return true;
}

/**
 * Check if coupon is usable (active, within dates, usage limit not reached)
 */
function isUsable(coupon) {
  if (!coupon.is_active) return false;
  if (!isWithinDates(coupon)) return false;
  if (coupon.usage_limit && coupon.usage_limit > 0 && (coupon.usage_count || 0) >= coupon.usage_limit) {
    return false;
  }
  return true;
}

/**
 * Get eligible items from cart based on coupon applicability
 * For buy_x_get_y: only returns items of the same product (not mixed)
 */
function getEligibleItems(cartItems, coupon) {
  // If no restrictions, all items are eligible
  if ((!coupon.applicable_products || coupon.applicable_products.length === 0) &&
      (!coupon.applicable_categories || coupon.applicable_categories.length === 0)) {
    return cartItems;
  }

  const prodIds = new Set((coupon.applicable_products || []).map(id => String(id)));
  const catSet = new Set((coupon.applicable_categories || []).map(x => String(x).toLowerCase()));

  return cartItems.filter(item => {
    const pid = String(item.product_id || '');
    const cat = String(item.category || '').toLowerCase();
    
    const byProd = prodIds.size === 0 ? true : prodIds.has(pid);
    const byCat = catSet.size === 0 ? true : catSet.has(cat);
    
    return byProd && byCat;
  });
}

/**
 * Get items grouped by product_id (for buy_x_get_y coupon)
 * Returns array of groups: [{ product_id, items: [...], totalQty, price }]
 */
function getItemsByProduct(cartItems) {
  const grouped = {};
  
  cartItems.forEach(item => {
    const pid = String(item.product_id || '');
    if (!grouped[pid]) {
      grouped[pid] = {
        product_id: pid,
        items: [],
        totalQty: 0,
        price: item.price,
      };
    }
    grouped[pid].items.push(item);
    grouped[pid].totalQty += item.quantity;
  });
  
  return Object.values(grouped);
}

/**
 * Compute base amount from cart items
 */
function computeBase(cartItems) {
  return cartItems.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);
}

/**
 * Compute discount amount based on coupon type and cart items
 * Returns discount amount (always >= 0)
 */
function computeDiscount(cartItems, coupon) {
  if (!cartItems || cartItems.length === 0) return 0;

  const eligible = getEligibleItems(cartItems, coupon);
  const baseEligible = computeBase(eligible);
  const baseAll = computeBase(cartItems);

  // Check minimum purchase amount on full cart
  if (coupon.min_purchase_amount && baseAll < coupon.min_purchase_amount) {
    return 0;
  }

  // No eligible items for item-wise coupon
  if (eligible.length === 0 && coupon.applicable_products?.length > 0) {
    return 0;
  }

  let discount = 0;

  if (coupon.type === 'fixed') {
    // Fixed amount: discount the eligible base or full base
    const base = eligible.length > 0 ? baseEligible : baseAll;
    discount = Math.min(coupon.discount_value, base);
  } else if (coupon.type === 'percentage') {
    // Percentage: apply to eligible base or full base
    const base = eligible.length > 0 ? baseEligible : baseAll;
    discount = base * (coupon.discount_value / 100);
    
    // Cap with max_discount_amount if specified
    if (coupon.max_discount_amount != null && coupon.max_discount_amount > 0) {
      discount = Math.min(discount, coupon.max_discount_amount);
    }
  } else if (coupon.type === 'buy_x_get_y') {
    // Buy X Get Y Free: only applies to SAME product (not mixed items)
    // Group eligible items by product_id
    const productGroups = getItemsByProduct(eligible);
    
    if (coupon.buy_quantity && coupon.get_quantity) {
      // For each product group, calculate free items
      for (const group of productGroups) {
        const totalQty = group.totalQty;
        const itemPrice = group.price;
        
        // Calculate how many free items for this product
        const freeItemsCount = Math.floor(totalQty / (coupon.buy_quantity + coupon.get_quantity)) * coupon.get_quantity;
        
        // Discount = free items * price
        discount += freeItemsCount * itemPrice;
      }
    }
  }

  return Math.max(0, Math.floor(discount));
}

module.exports = {
  isWithinDates,
  isUsable,
  getEligibleItems,
  getItemsByProduct,
  computeBase,
  computeDiscount,
};
