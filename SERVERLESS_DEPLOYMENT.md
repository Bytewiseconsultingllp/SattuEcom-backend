# Serverless Deployment Guide

## 🚀 Your Backend is Now Serverless-Ready!

Your backend has been updated to work with both traditional servers and serverless platforms.

---

## ✅ Fixes Applied

### 1. **Export Handler for Serverless**
```javascript
// Auto-detects serverless environment
const isServerless = process.env.LAMBDA_TASK_ROOT || process.env.VERCEL || process.env.NETLIFY;

if (isServerless) {
  // Export app for serverless
  module.exports = app;
  module.exports.handler = app;
} else {
  // Start traditional server
  startServer();
}
```

### 2. **Fixed Session Warning**
```javascript
// Suppress MemoryStore warning in serverless
if (isServerless) {
  sessionConfig.store = null;
}
```

---

## 📋 Platform-Specific Setup

### AWS Lambda (Serverless Framework / SAM)

**1. Install serverless-http:**
```bash
npm install serverless-http
```

**2. Create `lambda.js`:**
```javascript
const serverless = require('serverless-http');
const app = require('./server');

module.exports.handler = serverless(app);
```

**3. Configure `serverless.yml`:**
```yaml
service: sattu-ecom-backend

provider:
  name: aws
  runtime: nodejs18.x
  region: us-east-1
  environment:
    MONGODB_URI: ${env:MONGODB_URI}
    JWT_SECRET: ${env:JWT_SECRET}
    NODE_ENV: production
  timeout: 30

functions:
  api:
    handler: lambda.handler
    events:
      - http:
          path: /{proxy+}
          method: ANY
          cors: true
```

**4. Deploy:**
```bash
serverless deploy
```

---

### Vercel

**1. Create `vercel.json`:**
```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "server.js"
    }
  ],
  "env": {
    "MONGODB_URI": "@mongodb-uri",
    "JWT_SECRET": "@jwt-secret",
    "NODE_ENV": "production"
  }
}
```

**2. Add environment variables:**
```bash
vercel env add MONGODB_URI
vercel env add JWT_SECRET
vercel env add ALLOWED_ORIGINS
```

**3. Deploy:**
```bash
vercel --prod
```

---

### Netlify Functions

**1. Create `netlify.toml`:**
```toml
[build]
  command = "npm install"
  functions = "functions"

[functions]
  node_bundler = "esbuild"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/api/:splat"
  status = 200
```

**2. Create `functions/api.js`:**
```javascript
const serverless = require('serverless-http');
const app = require('../server');

exports.handler = serverless(app);
```

**3. Install dependencies:**
```bash
npm install serverless-http
```

**4. Deploy:**
```bash
netlify deploy --prod
```

---

### Railway / Render (Traditional Hosting)

No changes needed! The server will automatically detect it's not serverless and start normally.

**Deploy command:**
```bash
npm start
```

---

## 🔧 Environment Variables

All platforms need these variables:

```env
# MongoDB
MONGODB_URI=mongodb+srv://admin:admin@software-development.fr9zrj9.mongodb.net/sattuEcomm?retryWrites=true&w=majority

# Server
PORT=4000
NODE_ENV=production

# Frontend
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# JWT
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRE=7d

# Session
SESSION_SECRET=your_session_secret_here

# Email (Optional)
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password

# OAuth (Optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Razorpay (Optional)
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```

---

## 🧪 Testing

### Test Locally (Traditional Server)
```bash
npm start
curl http://localhost:4000/api/health
```

### Test Serverless Locally

**AWS Lambda:**
```bash
serverless invoke local -f api
```

**Vercel:**
```bash
vercel dev
```

**Netlify:**
```bash
netlify dev
```

---

## 📊 Platform Comparison

| Platform | Type | Cold Start | Cost | Best For |
|----------|------|------------|------|----------|
| **Railway** | Traditional | None | $5-20/mo | Simple deployment |
| **Render** | Traditional | None | $7-25/mo | Reliable hosting |
| **AWS Lambda** | Serverless | 1-3s | Pay per use | High traffic |
| **Vercel** | Serverless | <1s | Free tier | Quick deploy |
| **Netlify** | Serverless | <1s | Free tier | Quick deploy |

---

## ⚠️ Serverless Limitations

### 1. **Cold Starts**
- First request after idle takes 1-5 seconds
- Subsequent requests are fast
- Solution: Use warming functions or traditional hosting

### 2. **Execution Timeout**
- AWS Lambda: 30 seconds max
- Vercel: 10-60 seconds (plan dependent)
- Netlify: 10-26 seconds (plan dependent)
- Solution: Optimize long-running operations

### 3. **Memory Limits**
- AWS Lambda: 128MB - 10GB
- Vercel: 1GB (Hobby), 3GB (Pro)
- Netlify: 1GB
- Solution: Optimize memory usage

### 4. **No Persistent Storage**
- File uploads must use external storage (S3, Cloudinary)
- Sessions should use external store (Redis, MongoDB)
- Solution: Use cloud storage services

---

## 🎯 Recommended Deployment

### For Your E-commerce Backend:

**Option 1: Railway (Recommended for Production)**
- ✅ No cold starts
- ✅ Persistent connections
- ✅ Simple deployment
- ✅ Affordable ($5-10/mo)
- ✅ No code changes needed

**Option 2: Vercel (Good for MVP)**
- ✅ Free tier available
- ✅ Fast deployment
- ✅ Good for testing
- ⚠️ Cold starts
- ⚠️ 10s timeout on free tier

**Option 3: AWS Lambda (For Scale)**
- ✅ Pay per use
- ✅ Scales automatically
- ✅ Enterprise-grade
- ⚠️ Cold starts
- ⚠️ More complex setup

---

## 🚀 Quick Deploy to Railway

**1. Install Railway CLI:**
```bash
npm install -g @railway/cli
```

**2. Login:**
```bash
railway login
```

**3. Initialize:**
```bash
railway init
```

**4. Add environment variables:**
```bash
railway variables set MONGODB_URI="mongodb+srv://..."
railway variables set JWT_SECRET="your-secret"
railway variables set NODE_ENV="production"
```

**5. Deploy:**
```bash
railway up
```

**6. Get URL:**
```bash
railway domain
```

Done! Your backend is live at `https://your-app.railway.app`

---

## 🔍 Troubleshooting

### Error: "No exports found in module"
✅ **FIXED** - Server now exports app for serverless platforms

### Error: "MemoryStore warning"
✅ **FIXED** - Session store disabled in serverless environments

### Error: "MongoDB connection timeout"
Check:
1. MongoDB Atlas IP whitelist (add 0.0.0.0/0 for serverless)
2. Connection string in environment variables
3. Cluster is running

### Error: "Function timeout"
Solutions:
1. Increase timeout in platform settings
2. Optimize slow database queries
3. Use traditional hosting for long operations

---

## 📝 Deployment Checklist

- [ ] Environment variables configured
- [ ] MongoDB Atlas IP whitelist updated (0.0.0.0/0 for serverless)
- [ ] ALLOWED_ORIGINS includes production domain
- [ ] JWT_SECRET is strong and unique
- [ ] Code pushed to git repository
- [ ] Platform-specific config file created
- [ ] Deployment successful
- [ ] Health endpoint responding
- [ ] API endpoints tested
- [ ] Frontend connected to production API

---

## 🎉 You're Ready!

Your backend now works with:
- ✅ Traditional servers (Railway, Render, VPS)
- ✅ AWS Lambda
- ✅ Vercel
- ✅ Netlify Functions
- ✅ Any serverless platform

**Choose your platform and deploy! 🚀**
