# Dashboard API - Quick Setup Guide

## ✅ Implementation Status: COMPLETE

All dashboard API endpoints have been created and integrated into the backend.

---

## 📁 Files Created/Modified

### Created
1. ✅ `controllers/dashboardController.js` - Dashboard statistics controller
2. ✅ `routes/dashboardRoutes.js` - Dashboard API routes

### Modified
1. ✅ `server.js` - Added dashboard routes integration

---

## 🚀 Quick Start

### Step 1: Verify Installation
```bash
# Check if files exist
ls controllers/dashboardController.js
ls routes/dashboardRoutes.js
```

### Step 2: Start Backend Server
```bash
npm run dev
# or
npm start
```

### Step 3: Test Endpoints
```bash
# Get admin token first (from login)
# Then test endpoints:

curl -X GET http://localhost:5000/api/admin/dashboard/stats \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

## 📡 API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/admin/dashboard/stats` | GET | All dashboard statistics |
| `/api/admin/dashboard/online-sales` | GET | Online sales total |
| `/api/admin/dashboard/offline-sales` | GET | Offline sales total |
| `/api/admin/dashboard/expenses` | GET | Expenses total |

---

## 🔐 Authentication

All endpoints require:
- **Authorization Header**: `Bearer {JWT_TOKEN}`
- **User Role**: `admin`

---

## 📊 Revenue Calculation

```
Total Revenue = Online Sales + Offline Sales - Expenses
```

---

## 🧪 Testing

### Option 1: Using cURL
```bash
# Get stats
curl -X GET http://localhost:5000/api/admin/dashboard/stats \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get online sales
curl -X GET http://localhost:5000/api/admin/dashboard/online-sales \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get offline sales
curl -X GET http://localhost:5000/api/admin/dashboard/offline-sales \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get expenses
curl -X GET http://localhost:5000/api/admin/dashboard/expenses \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Option 2: Using Postman
1. Import the endpoints
2. Add Authorization header (Bearer token)
3. Send requests
4. Verify responses

### Option 3: Using Swagger UI
```
http://localhost:5000/api-docs
```

---

## 📈 Response Format

### Success Response
```json
{
  "success": true,
  "data": {
    "total": 245890,
    "count": 1234,
    "average": 199
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description"
}
```

---

## 🔧 Configuration

### Environment Variables
Ensure these are set in `.env`:
```
JWT_SECRET=your_secret_key
JWT_EXPIRE=7d
NODE_ENV=development
PORT=5000
```

---

## 📝 Database Indexes (Recommended)

For optimal performance, create these indexes:

```javascript
// In MongoDB shell or Compass
db.orders.createIndex({ status: 1, created_at: -1 });
db.offlineSales.createIndex({ date: -1 });
db.expenses.createIndex({ date: -1 });
```

---

## 🔗 Frontend Integration

Frontend is already integrated:
- API layer: `src/lib/api/dashboardStats.ts`
- Component: `src/components/admin/DashboardHome.tsx`

Just ensure:
1. Backend is running
2. Frontend has correct API base URL
3. Admin is logged in with valid token

---

## ✅ Verification Checklist

- [ ] Backend server is running
- [ ] Dashboard routes are registered
- [ ] Authentication middleware is working
- [ ] Admin user exists in database
- [ ] Admin user has valid JWT token
- [ ] All 4 endpoints return data
- [ ] Revenue calculation is correct
- [ ] Date filtering works
- [ ] Error handling works
- [ ] Frontend displays data correctly

---

## 🐛 Troubleshooting

### Issue: 401 Unauthorized
**Solution**: 
- Verify JWT token is valid
- Check Authorization header format: `Bearer {token}`
- Ensure token is not expired

### Issue: 403 Forbidden
**Solution**:
- Verify user has admin role
- Check user.role === 'admin' in database

### Issue: Empty Results
**Solution**:
- Check if data exists in database
- Verify date range if using filters
- Check database connection

### Issue: Server Error
**Solution**:
- Check server logs
- Verify database connection
- Check for syntax errors
- Restart server

---

## 📚 Documentation

For detailed information, see:
- `DASHBOARD_API_IMPLEMENTATION.md` - Complete API documentation
- `ADMIN_DASHBOARD_REDESIGN_COMPLETE.md` - Frontend changes
- `BACKEND_IMPLEMENTATION_TEMPLATE.md` - Implementation guide

---

## 🎯 Next Steps

1. ✅ Backend APIs created
2. ✅ Frontend integrated
3. 🔄 Test with real data
4. 🔄 Create database indexes
5. 🔄 Deploy to staging
6. 🔄 Deploy to production

---

## 📞 Quick Reference

### Start Development Server
```bash
npm run dev
```

### Test Single Endpoint
```bash
curl -X GET http://localhost:5000/api/admin/dashboard/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### View API Documentation
```
http://localhost:5000/api-docs
```

### Check Server Status
```
http://localhost:5000/health
```

---

**Status**: ✅ Ready for Testing
**Date**: November 2, 2025
**Version**: 1.0
