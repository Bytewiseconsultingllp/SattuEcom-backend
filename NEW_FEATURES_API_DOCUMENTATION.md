# 🎉 New Features API Documentation

## Complete Backend Support for Banners, Offline Sales, Expenses, Company Settings & Contact Management

---

## 📋 Table of Contents

1. [Banners API](#banners-api)
2. [Offline Sales API](#offline-sales-api)
3. [Expenses API](#expenses-api)
4. [Company Settings API](#company-settings-api)
5. [Contact Queries API](#contact-queries-api)

---

## 🎨 Banners API

### **Models & Database**

**Banner Model** (`models/Banner.js`)
```javascript
{
  title: String (required),
  description: String (required),
  imageUrl: String (required),
  linkUrl: String (default: '/'),
  season: String (enum: ['general', 'diwali', 'holi', 'christmas', 'new-year', 'summer', 'monsoon']),
  startDate: Date (required),
  endDate: Date (required),
  isActive: Boolean (default: true),
  position: Number (default: 1),
  created_at: Date,
  updated_at: Date
}
```

### **Endpoints**

#### **GET /api/banners**
Get all banners with optional filters

**Query Parameters:**
- `isActive` (boolean) - Filter by active status
- `season` (string) - Filter by season

**Response:**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "id": "...",
      "title": "Diwali Sale 2024",
      "description": "Get up to 50% off",
      "imageUrl": "/images/banner.jpg",
      "linkUrl": "/products",
      "season": "diwali",
      "startDate": "2024-10-20",
      "endDate": "2024-11-05",
      "isActive": true,
      "position": 1,
      "created_at": "2024-11-02T...",
      "updated_at": "2024-11-02T..."
    }
  ]
}
```

#### **GET /api/banners/:id**
Get single banner by ID

**Response:**
```json
{
  "success": true,
  "data": { /* banner object */ }
}
```

#### **POST /api/banners** (Admin Only)
Create new banner

**Request Body:**
```json
{
  "title": "Diwali Sale 2024",
  "description": "Get up to 50% off on all products",
  "imageUrl": "/images/banner.jpg",
  "linkUrl": "/products",
  "season": "diwali",
  "startDate": "2024-10-20",
  "endDate": "2024-11-05",
  "isActive": true,
  "position": 1
}
```

#### **PUT /api/banners/:id** (Admin Only)
Update banner

**Request Body:** (all fields optional)
```json
{
  "title": "Updated Title",
  "isActive": false,
  "position": 2
}
```

#### **DELETE /api/banners/:id** (Admin Only)
Delete banner

---

## 🛒 Offline Sales API

### **Models & Database**

**OfflineSale Model** (`models/OfflineSale.js`)
```javascript
{
  date: Date (required, default: now),
  customerName: String (required),
  customerPhone: String (required),
  items: [
    {
      product: String (required),
      quantity: Number (required, min: 1),
      price: Number (required, min: 0)
    }
  ],
  totalAmount: Number (required, min: 0),
  paymentMethod: String (enum: ['cash', 'card', 'upi', 'cheque', 'bank-transfer']),
  notes: String,
  created_at: Date,
  updated_at: Date
}
```

### **Endpoints**

#### **GET /api/admin/offline-sales** (Admin Only)
Get all offline sales

**Query Parameters:**
- `startDate` (date) - Filter by start date
- `endDate` (date) - Filter by end date
- `paymentMethod` (string) - Filter by payment method

**Response:**
```json
{
  "success": true,
  "count": 10,
  "data": [
    {
      "id": "...",
      "date": "2024-11-02",
      "customerName": "John Doe",
      "customerPhone": "+91 98765 43210",
      "items": [
        {
          "product": "Premium Sattu Powder",
          "quantity": 2,
          "price": 299
        }
      ],
      "totalAmount": 598,
      "paymentMethod": "cash",
      "notes": "Bulk order",
      "created_at": "2024-11-02T...",
      "updated_at": "2024-11-02T..."
    }
  ]
}
```

#### **GET /api/admin/offline-sales/stats** (Admin Only)
Get offline sales statistics

**Response:**
```json
{
  "success": true,
  "data": {
    "totalSales": 45,
    "totalRevenue": 25000,
    "averageOrderValue": 555.56,
    "paymentMethodBreakdown": {
      "cash": 15000,
      "card": 7000,
      "upi": 3000
    }
  }
}
```

#### **GET /api/admin/offline-sales/:id** (Admin Only)
Get single offline sale

#### **POST /api/admin/offline-sales** (Admin Only)
Create new offline sale

**Request Body:**
```json
{
  "date": "2024-11-02",
  "customerName": "John Doe",
  "customerPhone": "+91 98765 43210",
  "items": [
    {
      "product": "Premium Sattu Powder",
      "quantity": 2,
      "price": 299
    }
  ],
  "totalAmount": 598,
  "paymentMethod": "cash",
  "notes": "Bulk order"
}
```

#### **PUT /api/admin/offline-sales/:id** (Admin Only)
Update offline sale

#### **DELETE /api/admin/offline-sales/:id** (Admin Only)
Delete offline sale

---

## 💰 Expenses API

### **Models & Database**

**Expense Model** (`models/Expense.js`)
```javascript
{
  date: Date (required, default: now),
  category: String (enum: ['delivery', 'packaging', 'maintenance', 'utilities', 'marketing', 'salaries', 'rent', 'other'], required),
  description: String (required),
  amount: Number (required, min: 0),
  paymentMethod: String (enum: ['cash', 'card', 'upi', 'cheque', 'bank-transfer']),
  vendor: String (required),
  invoiceNumber: String,
  notes: String,
  created_at: Date,
  updated_at: Date
}
```

### **Endpoints**

#### **GET /api/admin/expenses** (Admin Only)
Get all expenses

**Query Parameters:**
- `category` (string) - Filter by category
- `startDate` (date) - Filter by start date
- `endDate` (date) - Filter by end date
- `vendor` (string) - Search by vendor name

**Response:**
```json
{
  "success": true,
  "count": 25,
  "data": [
    {
      "id": "...",
      "date": "2024-11-01",
      "category": "delivery",
      "description": "Delivery charges for November orders",
      "amount": 5000,
      "paymentMethod": "cash",
      "vendor": "Local Courier",
      "invoiceNumber": "INV-001",
      "notes": "",
      "created_at": "2024-11-01T...",
      "updated_at": "2024-11-01T..."
    }
  ]
}
```

#### **GET /api/admin/expenses/stats** (Admin Only)
Get expense statistics

**Response:**
```json
{
  "success": true,
  "data": {
    "totalExpenses": 50000,
    "expenseCount": 25,
    "averageExpense": 2000,
    "categoryBreakdown": {
      "delivery": 15000,
      "packaging": 10000,
      "marketing": 8000,
      "utilities": 5000,
      "other": 12000
    }
  }
}
```

#### **GET /api/admin/expenses/:id** (Admin Only)
Get single expense

#### **POST /api/admin/expenses** (Admin Only)
Create new expense

**Request Body:**
```json
{
  "date": "2024-11-01",
  "category": "delivery",
  "description": "Delivery charges",
  "amount": 5000,
  "paymentMethod": "cash",
  "vendor": "Local Courier",
  "invoiceNumber": "INV-001",
  "notes": "Monthly charges"
}
```

#### **PUT /api/admin/expenses/:id** (Admin Only)
Update expense

#### **DELETE /api/admin/expenses/:id** (Admin Only)
Delete expense

---

## 🏢 Company Settings API

### **Models & Database**

**CompanySettings Model** (`models/CompanySettings.js`)
```javascript
{
  companyName: String (required),
  description: String,
  email: String (required, valid email),
  phone: String (required),
  address: String (required),
  gstNumber: String,
  panNumber: String,
  bankName: String,
  accountNumber: String,
  ifscCode: String,
  accountHolderName: String,
  logo: String,
  signature: String,
  created_at: Date,
  updated_at: Date
}
```

### **Endpoints**

#### **GET /api/company-settings**
Get company settings (Public)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "companyName": "Sattu Store",
    "description": "Premium quality sattu products",
    "email": "info@sattustore.com",
    "phone": "+91 98765 43210",
    "address": "123 Main Street, City, State - 123456",
    "gstNumber": "27AABCU9603R1ZM",
    "panNumber": "AABCU9603R",
    "bankName": "State Bank of India",
    "accountNumber": "1234567890",
    "ifscCode": "SBIN0001234",
    "accountHolderName": "Sattu Store Pvt Ltd",
    "logo": "/images/logo.png",
    "signature": "/images/signature.png",
    "created_at": "2024-11-01T...",
    "updated_at": "2024-11-02T..."
  }
}
```

#### **PUT /api/company-settings** (Admin Only)
Update company settings

**Request Body:** (all fields optional)
```json
{
  "companyName": "Sattu Store",
  "email": "info@sattustore.com",
  "phone": "+91 98765 43210",
  "address": "123 Main Street, City, State - 123456",
  "gstNumber": "27AABCU9603R1ZM",
  "panNumber": "AABCU9603R",
  "bankName": "State Bank of India",
  "accountNumber": "1234567890",
  "ifscCode": "SBIN0001234",
  "accountHolderName": "Sattu Store Pvt Ltd",
  "logo": "/images/logo.png",
  "signature": "/images/signature.png"
}
```

---

## 📧 Contact Queries API

### **Models & Database**

**ContactQuery Model** (`models/ContactQuery.js`)
```javascript
{
  name: String (required),
  email: String (required, valid email),
  phone: String (required),
  subject: String (required),
  message: String (required),
  status: String (enum: ['new', 'in-progress', 'resolved', 'closed'], default: 'new'),
  priority: String (enum: ['low', 'medium', 'high'], default: 'medium'),
  response: String,
  respondedBy: ObjectId (ref: 'User'),
  respondedAt: Date,
  created_at: Date,
  updated_at: Date
}
```

### **Endpoints**

#### **GET /api/contact-queries** (Admin Only)
Get all contact queries

**Query Parameters:**
- `status` (string) - Filter by status
- `priority` (string) - Filter by priority
- `searchQuery` (string) - Search by name, email, or subject

**Response:**
```json
{
  "success": true,
  "count": 15,
  "data": [
    {
      "id": "...",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+91 98765 43210",
      "subject": "Product inquiry",
      "message": "I want to know more about your sattu products...",
      "status": "new",
      "priority": "medium",
      "response": "",
      "respondedBy": null,
      "respondedAt": null,
      "created_at": "2024-11-01T10:30:00",
      "updated_at": "2024-11-01T10:30:00"
    }
  ]
}
```

#### **GET /api/contact-queries/stats** (Admin Only)
Get contact query statistics

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 50,
    "new": 15,
    "inProgress": 10,
    "resolved": 20,
    "closed": 5,
    "highPriority": 8
  }
}
```

#### **GET /api/contact-queries/:id** (Admin Only)
Get single contact query with responder details

#### **POST /api/contact-queries**
Create new contact query (Public)

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+91 98765 43210",
  "subject": "Product inquiry",
  "message": "I want to know more about your sattu products..."
}
```

**Response:**
```json
{
  "success": true,
  "data": { /* contact query object */ },
  "message": "Your message has been received. We will respond soon."
}
```

#### **PUT /api/contact-queries/:id** (Admin Only)
Update contact query status and add response

**Request Body:**
```json
{
  "status": "in-progress",
  "priority": "high",
  "response": "Thank you for your inquiry. We will get back to you soon."
}
```

#### **DELETE /api/contact-queries/:id** (Admin Only)
Delete contact query

---

## 📊 Database Collections Summary

| Collection | Purpose | Records |
|-----------|---------|---------|
| `banners` | Store promotional banners | ~10-20 |
| `offlinesales` | Track offline sales | ~100+ |
| `expenses` | Track business expenses | ~50+ |
| `companysettings` | Store company info | 1 |
| `contactqueries` | Store customer inquiries | ~100+ |

---

## 🔐 Authentication & Authorization

### **Public Endpoints:**
- `GET /api/banners` - Get all banners
- `GET /api/banners/:id` - Get single banner
- `GET /api/company-settings` - Get company settings
- `POST /api/contact-queries` - Submit contact form

### **Admin Only Endpoints:**
- All POST, PUT, DELETE operations on banners
- All operations on offline sales
- All operations on expenses
- PUT operations on company settings
- All operations on contact queries (except create)

**Authentication Header:**
```
Authorization: Bearer <jwt_token>
```

---

## 🚀 Integration with Frontend

### **Banners Management Page**
- Uses: `GET /api/banners`, `POST /api/banners`, `PUT /api/banners/:id`, `DELETE /api/banners/:id`

### **Offline Sales Page**
- Uses: `GET /api/admin/offline-sales`, `POST /api/admin/offline-sales`, `PUT /api/admin/offline-sales/:id`, `DELETE /api/admin/offline-sales/:id`

### **Expense Management Page**
- Uses: `GET /api/admin/expenses`, `POST /api/admin/expenses`, `PUT /api/admin/expenses/:id`, `DELETE /api/admin/expenses/:id`

### **Company Settings Page**
- Uses: `GET /api/company-settings`, `PUT /api/company-settings`

### **Contact Management Page**
- Uses: `GET /api/contact-queries`, `PUT /api/contact-queries/:id`, `DELETE /api/contact-queries/:id`

### **Public Contact Form**
- Uses: `POST /api/contact-queries`

---

## 📝 Error Handling

### **Common Error Responses**

**400 Bad Request:**
```json
{
  "success": false,
  "message": "Required fields are missing"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "message": "Resource not found"
}
```

**401 Unauthorized:**
```json
{
  "success": false,
  "message": "Authentication required"
}
```

**403 Forbidden:**
```json
{
  "success": false,
  "message": "Admin access required"
}
```

---

## ✅ Features Implemented

- ✅ **Banners Management** - Create, read, update, delete promotional banners
- ✅ **Offline Sales Tracking** - Record and track offline sales with payment methods
- ✅ **Expense Management** - Track business expenses by category
- ✅ **Company Settings** - Store and manage company information
- ✅ **Contact Query Management** - Handle customer inquiries with status tracking
- ✅ **Statistics Endpoints** - Get analytics for sales and expenses
- ✅ **Admin Authentication** - All sensitive operations protected
- ✅ **Validation** - Input validation on all endpoints
- ✅ **Error Handling** - Comprehensive error messages

---

## 🔄 Data Flow Examples

### **Creating an Offline Sale**
```
Frontend Form → POST /api/admin/offline-sales
→ Controller validates data
→ Creates OfflineSale document
→ Returns created sale with ID
→ Frontend updates list
```

### **Submitting Contact Form**
```
Public Form → POST /api/contact-queries
→ Controller validates data
→ Creates ContactQuery document
→ Returns success message
→ Admin sees new query in dashboard
```

### **Updating Company Settings**
```
Admin Form → PUT /api/company-settings
→ Controller finds existing settings
→ Updates fields
→ Returns updated settings
→ Frontend displays confirmation
```

---

## 📞 Support

For API issues or questions, check:
1. Request/Response format in examples above
2. Authentication headers are included
3. User has admin role for protected endpoints
4. Required fields are provided

---

**Last Updated:** November 2, 2025
**Version:** 1.0.0
**Status:** ✅ PRODUCTION READY
