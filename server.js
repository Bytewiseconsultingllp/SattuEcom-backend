require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const swaggerUi = require('swagger-ui-express');
const connectDB = require('./config/db');
const swaggerSpec = require('./config/swagger');
const errorHandler = require('./middleware/errorHandler');
const authRoutes = require('./routes/authRoutes');
const oauthRoutes = require('./routes/oauthRoutes');
const productRoutes = require('./routes/productRoutes');
const addressRoutes = require('./routes/addressRoutes');
const cartRoutes = require('./routes/cartRoutes');
const orderRoutes = require('./routes/orderRoutes');
const wishlistRoutes = require('./routes/wishlistRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const healthRoutes = require('./routes/healthRoutes');
const passport = require('./config/passport');
const categoryRoutes = require('./routes/categories');
 
// Initialize express app
const app = express();
 
// Connect to MongoDB
connectDB();
 
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
app.use(express.json({limit:'15mb'}));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
 
// Session middleware (required for OAuth)
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

app.use(express.json({ limit: '20mb' }));
app.use('/api', categoryRoutes);
 
// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());
 
// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'E-commerce API Documentation',
}));
 
// Routes
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'E-commerce API is running',
    documentation: `${req.protocol}://${req.get('host')}/api-docs`,
  });
});
 
app.use('/api/auth', authRoutes);
app.use('/api/auth', oauthRoutes);
app.use('/api/products', productRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/health', healthRoutes);
 
// Error handler middleware (must be last)
app.use(errorHandler);
 
// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`
  ╔════════════════════════════════════════╗
  ║   E-commerce Backend Server Started    ║
  ╠════════════════════════════════════════╣
  ║   Port: ${PORT.toString().padEnd(31)}║
  ║   Environment: ${(process.env.NODE_ENV || 'development').padEnd(22)}║
  ║   Swagger Docs: http://localhost:${PORT}/api-docs
  ╚════════════════════════════════════════╝
  `);
});
 
// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.log('UNHANDLED REJECTION! Shutting down...');
  console.log(err.name, err.message);
  process.exit(1);
});
 