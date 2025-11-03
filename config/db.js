const mongoose = require('mongoose');
 
// Set strictQuery to false to prepare for Mongoose 7
mongoose.set('strictQuery', false);
 
const connectDB = async () => {
  try {
    // Connection pooling and timeout configuration
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // Connection pooling
      maxPoolSize: 10,              // Maximum number of connections in the pool
      minPoolSize: 5,               // Minimum number of connections to maintain
      
      // Timeouts
      serverSelectionTimeoutMS: 45000,  // Timeout for selecting a server (5 seconds)
      socketTimeoutMS: 45000,          // Timeout for socket operations (45 seconds)
      connectTimeoutMS: 45000,         // Timeout for initial connection (10 seconds)
      
      // Retry logic
      retryWrites: true,               // Enable automatic retry for write operations
      retryReads: true,                // Enable automatic retry for read operations
      
      // Connection monitoring
      heartbeatFrequencyMS: 45000,     // Heartbeat frequency (10 seconds)
      
      // Performance
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
 
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    console.log(`Connection Pool: min=${5}, max=${10}`);
    console.log(`Timeouts: server=${45}s, socket=${45}s, connect=${45}s`);
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    console.error('\nPlease check your MongoDB connection string in the .env file');
    console.error('Make sure it follows the correct format:\n');
    console.error('For MongoDB Atlas:');
    console.error('MONGODB_URI=mongodb+srv://username:password@cluster.xxxxx.mongodb.net/database_name\n');
    console.error('For Local MongoDB:');
    console.error('MONGODB_URI=mongodb://localhost:27017/ecommerce\n');
    console.error('Note: Special characters in password should be URL encoded');
    process.exit(1);
  }
};
 
module.exports = connectDB;