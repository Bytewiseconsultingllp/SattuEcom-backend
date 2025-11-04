require("dotenv").config();
const express = require("express");
const cors = require("cors");
const session = require("express-session");
const swaggerUi = require("swagger-ui-express");
const connectDB = require("./config/db");
const swaggerSpec = require("./config/swagger");
const errorHandler = require("./middleware/errorHandler");
const passport = require("./config/passport");

// Route imports
const authRoutes = require("./routes/authRoutes");
const oauthRoutes = require("./routes/oauthRoutes");
const productRoutes = require("./routes/productRoutes");
const addressRoutes = require("./routes/addressRoutes");
const cartRoutes = require("./routes/cartRoutes");
const orderRoutes = require("./routes/orderRoutes");
const wishlistRoutes = require("./routes/wishlistRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const healthRoutes = require("./routes/healthRoutes");
const categoryRoutes = require("./routes/categories");
const usersRouter = require("./routes/userRoutes");
const adminReviewRoutes = require("./routes/adminReviewsRoutes");
const couponRoutes = require("./routes/couponRoutes");
const adminCouponRoutes = require("./routes/adminCouponRoutes");
const paymentRoutes = require("./routes/payments");
const adminPaymentRoutes = require("./routes/adminPayments");
const webhookRoutes = require("./routes/webhooks");
const bannerRoutes = require("./routes/bannerRoutes");
const offlineSaleRoutes = require("./routes/offlineSaleRoutes");
const expenseRoutes = require("./routes/expenseRoutes");
const companySettingsRoutes = require("./routes/companySettingsRoutes");
const contactQueryRoutes = require("./routes/contactQueryRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");

// Initialize express app
const app = express();

// ✅ Load allowed origins from .env and split into an array
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim())
  : [];

// ✅ CORS setup
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true); // Allow Postman/mobile apps
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(
          new Error(`CORS policy: Origin ${origin} not allowed by CORS`)
        );
      }
    },
    credentials: true,
    optionsSuccessStatus: 200,
  })
);

// ✅ Handle preflight requests
app.options("*", cors());

// ⚠️ Webhook route must come BEFORE express.json() middleware
app.use("/api/webhooks", webhookRoutes);

// ✅ Request timeout middleware (45 seconds for all requests)
app.use((req, res, next) => {
  req.setTimeout(45000);
  res.setTimeout(45000);
  next();
});

// ✅ Body parser middleware
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// ✅ Session middleware (for OAuth)
app.use(
  session({
    secret:
      process.env.SESSION_SECRET || "your-secret-key-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    },
  })
);

// ✅ Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// ✅ Swagger Documentation
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "E-commerce API Documentation",
  })
);

// ✅ Base route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "E-commerce API is running",
    documentation: `${req.protocol}://${req.get("host")}/api-docs`,
  });
});

// ✅ Register routes
app.use("/api/auth", authRoutes);
app.use("/api/auth", oauthRoutes);
app.use("/api/products", productRoutes);
app.use("/api", categoryRoutes);
app.use("/api", usersRouter);
app.use("/api/addresses", addressRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/admin/payments", adminPaymentRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/admin/reviews", adminReviewRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/admin/coupons", adminCouponRoutes);
app.use("/api/banners", bannerRoutes);
app.use("/api/admin/offline-sales", offlineSaleRoutes);
app.use("/api/admin/expenses", expenseRoutes);
app.use("/api/company-settings", companySettingsRoutes);
app.use("/api/contact-queries", contactQueryRoutes);
app.use("/api/admin/dashboard", dashboardRoutes);
app.use("/health", healthRoutes);

// ✅ Error handler middleware (must be last)
app.use(errorHandler);

// ✅ Graceful startup function
const startServer = async () => {
  try {
    // Wait for DB connection before starting server
    await connectDB();

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
    console.error("❌ Failed to start server:", error.message);
    process.exit(1);
  }
};

// ✅ Start the server
startServer();

// ✅ Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.log("UNHANDLED REJECTION! Shutting down...");
  console.log(err.name, err.message);
  process.exit(1);
});
