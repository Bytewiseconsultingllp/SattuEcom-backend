const mongoose = require('mongoose');
 
// Set strictQuery to false to prepare for Mongoose 7
mongoose.set('strictQuery', false);
 
const connectDB = async () => {
  try {
    // Connection pooling and timeout configuration
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // Connection pooling - PRODUCTION OPTIMIZED
      maxPoolSize: 50,              // Increased for production load
      minPoolSize: 10,              // Maintain minimum connections
      
      // Timeouts - PRODUCTION OPTIMIZED
      serverSelectionTimeoutMS: 60000,  // 60 seconds to select server
      socketTimeoutMS: 60000,           // 60 seconds for socket operations
      connectTimeoutMS: 60000,          // 60 seconds for initial connection
      
      // Retry logic
      retryWrites: true,               // Enable automatic retry for write operations
      retryReads: true,                // Enable automatic retry for read operations
      
      // Connection monitoring
      heartbeatFrequencyMS: 30000,     // Heartbeat every 30 seconds
      
      // Buffering - CRITICAL FIX
      bufferCommands: false,           // Disable command buffering - fail fast instead
      autoCreate: true,                // Auto create collections
      
      // Performance
      useNewUrlParser: true,
      useUnifiedTopology: true,
      
      // Connection string options
      directConnection: false,         // Allow connection pooling
      family: 4,                       // Use IPv4
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Connection Pool: min=${10}, max=${50}`);
    console.log(`⏱️  Timeouts: server=${60}s, socket=${60}s, connect=${60}s`);
    console.log(`🔄 Buffering: DISABLED (fail fast on connection issues)`);

    // Connection event handlers
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected successfully');
    });

    mongoose.connection.on('close', () => {
      console.log('🔌 MongoDB connection closed');
    });

  } catch (error) {
    console.error(`❌ Error connecting to MongoDB: ${error.message}`);
    console.error('\n🔍 Troubleshooting:');
    console.error('1. Check MONGODB_URI in .env file');
    console.error('2. Verify MongoDB Atlas IP whitelist');
    console.error('3. Ensure cluster is running');
    console.error('4. Check network connectivity\n');
    
    if (error.message.includes('timed out')) {
      console.error('💡 Timeout detected - likely causes:');
      console.error('   - IP not whitelisted in MongoDB Atlas');
      console.error('   - Network connectivity issue');
      console.error('   - MongoDB server is down\n');
    } else if (error.message.includes('authentication failed')) {
      console.error('💡 Authentication failed - likely causes:');
      console.error('   - Wrong username/password');
      console.error('   - User does not exist in MongoDB Atlas\n');
    }
    
    process.exit(1);
  }
};

module.exports = connectDB;