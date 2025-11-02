# Database Indexes Setup Guide

## Why Indexes Matter
Indexes dramatically speed up database queries by avoiding full collection scans. Without indexes, MongoDB scans every document to find matches.

**Impact:**
- With indexes: Query scans ~10 documents
- Without indexes: Query scans ~100,000+ documents

---

## Required Indexes

### 1. Order Collection Indexes
```javascript
// In MongoDB shell or Atlas UI:

// Index on status (used in dashboard queries)
db.orders.createIndex({ status: 1 })

// Index on created_at (used for date filtering)
db.orders.createIndex({ created_at: -1 })

// Compound index for common queries
db.orders.createIndex({ status: 1, created_at: -1 })

// Index on user_id (for user lookups)
db.orders.createIndex({ user_id: 1 })
```

### 2. OfflineSale Collection Indexes
```javascript
// Index on date (used for monthly aggregation)
db.offlinesales.createIndex({ date: -1 })

// Index on date range queries
db.offlinesales.createIndex({ date: 1 })
```

### 3. Expense Collection Indexes
```javascript
// Index on date (used for monthly aggregation)
db.expenses.createIndex({ date: -1 })

// Index on date range queries
db.expenses.createIndex({ date: 1 })
```

### 4. User Collection Indexes
```javascript
// Index on role (used for counting users)
db.users.createIndex({ role: 1 })

// Index on createdAt (for new user counting)
db.users.createIndex({ createdAt: -1 })

// Compound index
db.users.createIndex({ role: 1, createdAt: -1 })
```

### 5. Product Collection Indexes
```javascript
// Index on createdAt (for new product counting)
db.products.createIndex({ createdAt: -1 })

// Index on category (for filtering)
db.products.createIndex({ category: 1 })

// Index on price (for price range filtering)
db.products.createIndex({ price: 1 })

// Index on in_stock (for stock filtering)
db.products.createIndex({ in_stock: 1 })
```

### 6. OrderItem Collection Indexes
```javascript
// Index on order_id (for lookups in aggregation)
db.orderitems.createIndex({ order_id: 1 })

// Index on product_id (for lookups in aggregation)
db.orderitems.createIndex({ product_id: 1 })
```

---

## How to Create Indexes

### Option 1: MongoDB Atlas UI
1. Go to your cluster in MongoDB Atlas
2. Click "Collections"
3. Select collection
4. Click "Indexes" tab
5. Click "Create Index"
6. Add field and direction
7. Click "Create"

### Option 2: MongoDB Shell
```bash
# Connect to MongoDB
mongosh "mongodb+srv://username:password@cluster.mongodb.net/database"

# Create indexes
db.orders.createIndex({ status: 1 })
db.orders.createIndex({ created_at: -1 })
db.orders.createIndex({ status: 1, created_at: -1 })
# ... etc
```

### Option 3: Mongoose Script
Create `scripts/create-indexes.js`:

```javascript
const mongoose = require('mongoose');
require('dotenv').config();

const Order = require('../models/Order');
const OfflineSale = require('../models/OfflineSale');
const Expense = require('../models/Expense');
const User = require('../models/User');
const Product = require('../models/Product');
const OrderItem = require('../models/OrderItem');

async function createIndexes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('Creating indexes...');
    
    // Order indexes
    await Order.collection.createIndex({ status: 1 });
    await Order.collection.createIndex({ created_at: -1 });
    await Order.collection.createIndex({ status: 1, created_at: -1 });
    await Order.collection.createIndex({ user_id: 1 });
    
    // OfflineSale indexes
    await OfflineSale.collection.createIndex({ date: -1 });
    await OfflineSale.collection.createIndex({ date: 1 });
    
    // Expense indexes
    await Expense.collection.createIndex({ date: -1 });
    await Expense.collection.createIndex({ date: 1 });
    
    // User indexes
    await User.collection.createIndex({ role: 1 });
    await User.collection.createIndex({ createdAt: -1 });
    await User.collection.createIndex({ role: 1, createdAt: -1 });
    
    // Product indexes
    await Product.collection.createIndex({ createdAt: -1 });
    await Product.collection.createIndex({ category: 1 });
    await Product.collection.createIndex({ price: 1 });
    await Product.collection.createIndex({ in_stock: 1 });
    
    // OrderItem indexes
    await OrderItem.collection.createIndex({ order_id: 1 });
    await OrderItem.collection.createIndex({ product_id: 1 });
    
    console.log('✅ All indexes created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
    process.exit(1);
  }
}

createIndexes();
```

Run with:
```bash
node scripts/create-indexes.js
```

---

## Verify Indexes

### In MongoDB Shell
```javascript
// List all indexes on a collection
db.orders.getIndexes()

// Get index statistics
db.orders.aggregate([{ $indexStats: {} }])
```

### In Mongoose
```javascript
const indexes = await Order.collection.getIndexes();
console.log(indexes);
```

---

## Performance Impact

### Before Indexes
- Dashboard stats query: **30-60 seconds**
- Product listing: **5-15 seconds**
- Order search: **10-30 seconds**

### After Indexes
- Dashboard stats query: **2-4 seconds** ✅
- Product listing: **500ms-2 seconds** ✅
- Order search: **500ms-1 second** ✅

---

## Index Maintenance

### Monitor Index Usage
```javascript
// In MongoDB shell
db.orders.aggregate([{ $indexStats: {} }])
```

### Remove Unused Indexes
```javascript
// Drop an index
db.orders.dropIndex("status_1")
```

### Rebuild Indexes
```javascript
// Rebuild all indexes
db.orders.reIndex()
```

---

## Best Practices

1. **Create indexes on frequently queried fields**
   - status, date, created_at, user_id, category

2. **Use compound indexes for common query patterns**
   - `{ status: 1, created_at: -1 }` for filtering by status and date

3. **Monitor index performance**
   - Use `$indexStats` to see which indexes are used

4. **Avoid over-indexing**
   - Too many indexes slow down writes
   - Keep only necessary indexes

5. **Regular maintenance**
   - Monitor index size
   - Remove unused indexes
   - Rebuild indexes if fragmented

