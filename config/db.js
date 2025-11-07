const mongoose = require('mongoose');
 
// Set strictQuery to false to prepare for Mongoose 7
mongoose.set('strictQuery', false);
 
const connectDB = async () => {
  try {
    // Detect serverless environment
    const isServerless = process.env.LAMBDA_TASK_ROOT || process.env.VERCEL || process.env.NETLIFY;
    
    // Connection pooling and timeout configuration
    const connectionOptions = {
      // Connection pooling - Optimized for environment
      maxPoolSize: isServerless ? 10 : 50,    // Smaller pool for serverless
      minPoolSize: isServerless ? 1 : 10,     // Minimal for serverless
      
      // Timeouts - PRODUCTION OPTIMIZED
      serverSelectionTimeoutMS: 30000,  // 30 seconds to select server
      socketTimeoutMS: 45000,           // 45 seconds for socket operations
      connectTimeoutMS: 30000,          // 30 seconds for initial connection
      
      // Retry logic
      retryWrites: true,               // Enable automatic retry for write operations
      retryReads: true,                // Enable automatic retry for read operations
      
      // Connection monitoring
      heartbeatFrequencyMS: 30000,     // Heartbeat every 30 seconds
      
      // Buffering - Environment specific
      bufferCommands: isServerless ? true : false,  // Enable buffering in serverless
      // bufferTimeoutMS: isServerless ? 30000 : 10000, // 30s buffer timeout for serverless
      autoCreate: true,                // Auto create collections
      
      // Performance
      useNewUrlParser: true,
      useUnifiedTopology: true,
      
      // Connection string options
      directConnection: false,         // Allow connection pooling
      family: 4,                       // Use IPv4
    };
    
    const conn = await mongoose.connect(process.env.MONGODB_URI, connectionOptions);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Connection Pool: min=${isServerless ? 1 : 10}, max=${isServerless ? 10 : 50}`);
    console.log(`⏱️  Timeouts: server=${30}s, socket=${45}s, connect=${30}s`);
    console.log(`🔄 Buffering: ${isServerless ? 'ENABLED' : 'DISABLED'} (${isServerless ? 'buffering enabled' : 'fail fast on connection issues'})`);

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