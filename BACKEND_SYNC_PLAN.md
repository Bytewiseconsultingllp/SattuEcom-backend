# 🔄 Backend Sync Plan - Frontend Compatibility

## 📋 Required Changes to Support Frontend

### **1. Product Model Changes ✅**
**Issue:** Frontend expects `stock` (number) but backend has `in_stock` (boolean)

**Solution:**
- Add `stock` field (Number) to Product model
- Keep `in_stock` for backward compatibility
- Auto-calculate `in_stock` based on `stock > 0`

### **2. Order Model Changes ✅**
**Issue:** Frontend expects `shipment` object with delivery details

**Solution:**
- Add `shipment` object to Order model with:
  - `deliveryPartner` (String)
  - `trackingNumber` (String)
  - `estimatedDelivery` (Date)
  - `shippedAt` (Date)

### **3. Order Controller Changes ✅**
**Issue:** `updateOrderStatus` doesn't accept shipment details

**Solution:**
- Modify `updateOrderStatus` to accept optional `shipmentDetails`
- When status is "shipped", save shipment details
- Include shipment details in all order responses

### **4. User Model Changes ✅**
**Issue:** Frontend expects `status` field for active customers

**Solution:**
- Add `status` field (enum: ['active', 'inactive'])
- Auto-set to 'active' when user is verified and active

### **5. Product Controller - Missing APIs ✅**
**Issue:** Frontend uses ProductForm but backend might not have all CRUD operations

**Solution:**
- Ensure `createProduct` exists (Admin only)
- Ensure `updateProduct` exists (Admin only)
- Ensure `deleteProduct` exists (Admin only)
- Add proper validation and error handling

---

## 🎯 Implementation Checklist

### Phase 1: Model Updates
- [ ] Update Product model - add `stock` field
- [ ] Update Order model - add `shipment` object
- [ ] Update User model - add `status` field

### Phase 2: Controller Updates
- [ ] Update orderController - modify `updateOrderStatus`
- [ ] Update orderController - include shipment in responses
- [ ] Verify productController has all CRUD operations
- [ ] Verify adminUserController exists

### Phase 3: Route Verification
- [ ] Verify admin product routes
- [ ] Verify admin order routes
- [ ] Verify admin user routes

### Phase 4: Testing
- [ ] Test product CRUD operations
- [ ] Test order status updates with shipment
- [ ] Test customer stats (active, new this month)

---

## 📝 Detailed Changes

### 1. Product Model (`models/Product.js`)

```javascript
// Add stock field
stock: {
  type: Number,
  default: 0,
  min: [0, 'Stock cannot be negative'],
},

// Update in_stock to be calculated
// Add pre-save hook
productSchema.pre('save', function(next) {
  this.in_stock = this.stock > 0;
  next();
});
```

### 2. Order Model (`models/Order.js`)

```javascript
// Add shipment details
shipment: {
  deliveryPartner: {
    type: String,
    default: null,
  },
  trackingNumber: {
    type: String,
    default: null,
  },
  estimatedDelivery: {
    type: Date,
    default: null,
  },
  shippedAt: {
    type: Date,
    default: null,
  },
},
```

### 3. User Model (`models/User.js`)

```javascript
// Add status field
status: {
  type: String,
  enum: ['active', 'inactive'],
  default: 'active',
},

// Add virtual for dynamic status
userSchema.virtual('activeStatus').get(function() {
  return this.isVerified && this.isActive ? 'active' : 'inactive';
});
```

### 4. Order Controller (`controllers/orderController.js`)

```javascript
// Update updateOrderStatus function
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { status, shipmentDetails } = req.body;
    const orderId = req.params.id;

    // Validate status
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${validStatuses.join(', ')}`,
      });
    }

    // Build update object
    const updateData = { status };

    // If status is shipped, require and save shipment details
    if (status === 'shipped') {
      if (!shipmentDetails || !shipmentDetails.deliveryPartner || !shipmentDetails.trackingNumber) {
        return res.status(400).json({
          success: false,
          message: 'Delivery partner and tracking number are required for shipped status',
        });
      }

      updateData.shipment = {
        deliveryPartner: shipmentDetails.deliveryPartner,
        trackingNumber: shipmentDetails.trackingNumber,
        estimatedDelivery: shipmentDetails.estimatedDelivery || null,
        shippedAt: new Date(),
      };
    }

    let query = { _id: orderId };
    if (!req.user.role || req.user.role !== 'admin') {
      query.user_id = req.user._id;
    }

    const order = await Order.findOneAndUpdate(
      query,
      updateData,
      { new: true, runValidators: true }
    ).lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Format and return order
    // ... existing formatting code ...
  } catch (error) {
    next(error);
  }
};
```

---

## 🔍 API Endpoints Verification

### Product APIs (Admin)
- `POST /api/admin/products` - Create product ✅
- `PUT /api/admin/products/:id` - Update product ✅
- `DELETE /api/admin/products/:id` - Delete product ✅
- `GET /api/admin/products` - Get all products ✅

### Order APIs (Admin)
- `GET /api/admin/orders` - Get all orders ✅
- `PUT /api/admin/orders/:id/status` - Update order status ✅ (needs modification)

### User APIs (Admin)
- `GET /api/admin/users` - Get all users ✅

---

## 🚀 Migration Notes

### Database Migration
No migration needed - MongoDB is schemaless. New fields will be added automatically.

### Backward Compatibility
- `in_stock` field maintained for backward compatibility
- Existing orders without shipment details will work fine
- Existing users will default to 'active' status

---

## ✅ Success Criteria

1. Products can be created/updated with stock numbers
2. Orders can be updated with shipment details
3. Customer stats calculate correctly (active, new this month)
4. All existing functionality continues to work
5. Frontend and backend are in sync

---

## 📊 Testing Checklist

### Products
- [ ] Create product with stock
- [ ] Update product stock
- [ ] Delete product
- [ ] Stock stats calculate correctly (in stock, out of stock, low stock)

### Orders
- [ ] Update order to "shipped" with shipment details
- [ ] View order with shipment details
- [ ] Export orders with shipment details
- [ ] Order status updates close dialog

### Customers
- [ ] Active customers count correctly
- [ ] New this month count correctly
- [ ] Customer list displays correctly

---

**Implementation Priority: HIGH**
**Estimated Time: 2-3 hours**
**Risk Level: LOW (backward compatible)**
