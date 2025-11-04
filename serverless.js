/**
 * Serverless Entry Point
 * 
 * This file is specifically for serverless deployments (Vercel, Netlify, AWS Lambda)
 * It ensures MongoDB connection is established before handling requests.
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Import the Express app
const app = require('./server').app || require('./server');

// Connection promise (cached across invocations)
let connectionPromise = null;
let isConnected = false;

/**
 * Connect to MongoDB (cached)
 */
async function connectToDatabase() {
  if (isConnected && mongoose.connection.readyState === 1) {
    console.log('✅ Using existing MongoDB connection');
    return;
  }

  if (!connectionPromise) {
    console.log('⏳ Establishing new MongoDB connection...');
    connectionPromise = mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      bufferCommands: false,
      family: 4,
    });
  }

  await connectionPromise;
  isConnected = true;
  console.log('✅ MongoDB connected:', mongoose.connection.host);
}

/**
 * Serverless Handler
 * Ensures DB connection before processing requests
 */
async function handler(req, res) {
  try {
    // Ensure MongoDB is connected
    await connectToDatabase();
    
    // Process the request
    return app(req, res);
  } catch (error) {
    console.error('❌ Serverless handler error:', error);
    
    // Return error response
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Database connection failed'
      });
    }
  }
}

// Export handler
module.exports = handler;
module.exports.handler = handler;
