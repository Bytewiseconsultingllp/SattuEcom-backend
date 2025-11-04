require("dotenv").config();
const express = require("express");
const cors = require("cors");
const session = require("express-session");
const swaggerUi = require("swagger-ui-express");
const connectDB = require("./config/db");
const swaggerSpec = require("./config/swagger");
const errorHandler = require("./middleware/errorHandler");
const authRoutes = require("./routes/authRoutes");
const oauthRoutes = require("./routes/oauthRoutes");
const productRoutes = require("./routes/productRoutes");
const addressRoutes = require("./routes/addressRoutes");
const cartRoutes = require("./routes/cartRoutes");
const orderRoutes = require("./routes/orderRoutes");
const wishlistRoutes = require("./routes/wishlistRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const healthRoutes = require("./routes/healthRoutes");
const passport = require("./config/passport");
const categoryRoutes = require("./routes/categories");
const usersRouter = require("./routes/userRoutes");
const adminReviewRoutes = require("./routes/adminReviewsRoutes");
const couponRoutes = require("./routes/couponRoutes");
const adminCouponRoutes = require("./routes/adminCouponRoutes");
const paymentRoutes = require('./routes/payments');
const adminPaymentRoutes = require('./routes/adminPayments');
const webhookRoutes = require('./routes/webhooks');
const bannerRoutes = require('./routes/bannerRoutes');
const offlineSaleRoutes = require('./routes/offlineSaleRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const companySettingsRoutes = require('./routes/companySettingsRoutes');
const contactQueryRoutes = require('./routes/contactQueryRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

// Initialize express app
const app = express();

// ✅ Load allowed origins from .env and split into an array
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim())
  : [];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like Postman, mobile apps, etc.)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(
          new Error(`CORS policy: Origin ${origin} not allowed by CORS`)
        );
      }
    },
    credentials: true, // allow cookies/authorization headers
    optionsSuccessStatus: 200,
  })
);

// ✅ Handle preflight requests
app.options("*", cors());

// ⚠️ IMPORTANT: Webhook route MUST come BEFORE express.json() middleware
// Razorpay webhooks need raw body for signature verification
app.use('/api/webhooks', webhookRoutes);

// ✅ Request timeout middleware (45 seconds for all requests)
app.use((req, res, next) => {
  req.setTimeout(45000); // 45 seconds
  res.setTimeout(45000); // 45 seconds
  next();
});

// Body parser middleware
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// Session middleware (required for OAuth)
app.use(
  session({
    secret:
      process.env.SESSION_SECRET || "your-secret-key-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Swagger Documentation
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "E-commerce API Documentation",
  })
);

// Routes
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "E-commerce API is running",
    documentation: `${req.protocol}://${req.get("host")}/api-docs`,
  });
});

// Auth routes
app.use("/api/auth", authRoutes);
app.use("/api/auth", oauthRoutes);

// Product & Category routes
app.use("/api/products", productRoutes);
app.use("/api", categoryRoutes);

// User routes
app.use("/api", usersRouter);
app.use("/api/addresses", addressRoutes);
app.use("/api/wishlist", wishlistRoutes);

// Cart & Order routes
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);

// Payment routes (NEW)
app.use('/api/payments', paymentRoutes);
app.use('/api/admin/payments', adminPaymentRoutes);

// Review routes
app.use("/api/reviews", reviewRoutes);
app.use("/api/admin/reviews", adminReviewRoutes);

// Coupon routes
app.use("/api/coupons", couponRoutes);
app.use("/api/admin/coupons", adminCouponRoutes);

// Banner routes
app.use("/api/banners", bannerRoutes);

// Offline Sales routes
app.use("/api/admin/offline-sales", offlineSaleRoutes);

// Expense routes
app.use("/api/admin/expenses", expenseRoutes);

// Company Settings routes
app.use("/api/company-settings", companySettingsRoutes);

// Contact Query routes
app.use("/api/contact-queries", contactQueryRoutes);

// Dashboard routes (NEW)
app.use("/api/admin/dashboard", dashboardRoutes);

// Health check
app.use("/health", healthRoutes);

// Error handler middleware (must be last)
app.use(errorHandler);

// ✅ CRITICAL FIX: Start server with proper async/await for MongoDB connection
const startServer = async () => {
  try {
    // Connect to MongoDB FIRST and WAIT for connection
    await connectDB();
    
    // Only start server after MongoDB is connected
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`
  ╔════════════════════════════════════════╗
  ║   E-commerce Backend Server Started    ║
  ╠════════════════════════════════════════╣
  ║   Port: ${PORT.toString().padEnd(31)}║
  ║   Environment: ${(process.env.NODE_ENV || "development").padEnd(22)}║
  ║   Swagger Docs: http://localhost:${PORT}/api-docs
  ║   Payment: Razorpay Integrated ✓       ║
  ╚════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

// Start the server
startServer();

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.log("❌ UNHANDLED REJECTION! Shutting down...");
  console.log(err.name, err.message);
  process.exit(1);
});