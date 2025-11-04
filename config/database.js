const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const options = {
      // Connection timeout settings
      serverSelectionTimeoutMS: 30000, // 30 seconds to select server
      socketTimeoutMS: 45000, // 45 seconds for socket operations
      connectTimeoutMS: 30000, // 30 seconds to establish connection
      
      // Retry settings
      retryWrites: true,
      retryReads: true,
      
      // Connection pool settings
      maxPoolSize: 10, // Maximum connections in pool
      minPoolSize: 2, // Minimum connections in pool
      
      // Other settings
      family: 4, // Use IPv4, skip trying IPv6
    };

    console.log('⏳ Connecting to MongoDB...');
    const conn = await mongoose.connect(process.env.MONGODB_URI, options);

    console.log('✅ MongoDB Connected:', conn.connection.host);
    console.log('📊 Database:', conn.connection.name);

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
    });

    mongoose.connection.on('close', () => {
      console.log('🔌 MongoDB connection closed');
    });

  } catch (error) {
    console.error('❌ MongoDB connection failed!');
    console.error('Error:', error.message);
    
    // Provide helpful error messages
    if (error.message.includes('authentication failed')) {
      console.error('\n💡 Fix: Check username/password in MONGODB_URI');
    } else if (error.message.includes('timed out')) {
      console.error('\n💡 Fix: Whitelist your IP in MongoDB Atlas → Network Access');
      console.error('   Your IP needs to be added to the IP Access List');
    } else if (error.message.includes('ENOTFOUND')) {
      console.error('\n💡 Fix: Check cluster URL in MONGODB_URI');
    }
    
    console.error('\nFull error details:', error);
    process.exit(1); // Exit if can't connect to database
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    console.log('\n✅ MongoDB connection closed through app termination');
    process.exit(0);
  } catch (err) {
    console.error('Error closing MongoDB connection:', err);
    process.exit(1);
  }
});

module.exports = connectDB;
