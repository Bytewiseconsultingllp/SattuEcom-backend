require('dotenv').config();
const mongoose = require('mongoose');

async function testConnection() {
  console.log('🔍 Testing MongoDB connection...');
  console.log('URI:', process.env.MONGODB_URI ? process.env.MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@') : 'NOT FOUND');

  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI not found in .env file');
    console.error('💡 Make sure you have a .env file with MONGODB_URI variable');
    process.exit(1);
  }

  try {
    console.log('⏳ Attempting to connect...');
    
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
      family: 4, // Use IPv4
    });

    console.log('\n✅ Connection successful!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Host:', mongoose.connection.host);
    console.log('Database:', mongoose.connection.name);
    console.log('Port:', mongoose.connection.port);
    console.log('ReadyState:', mongoose.connection.readyState);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await mongoose.connection.close();
    console.log('✅ Connection closed gracefully');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Connection failed!');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Provide specific fixes based on error type
    if (error.message.includes('authentication failed') || error.message.includes('auth')) {
      console.error('💡 FIX: Authentication failed');
      console.error('   → Check username and password in connection string');
      console.error('   → Verify user exists in MongoDB Atlas → Database Access');
      console.error('   → Make sure password is URL-encoded if it has special characters\n');
    } else if (error.message.includes('timed out') || error.name === 'MongoNetworkTimeoutError') {
      console.error('💡 FIX: Connection timed out');
      console.error('   → Go to MongoDB Atlas → Network Access');
      console.error('   → Click "Add IP Address"');
      console.error('   → Add your current IP or use 0.0.0.0/0 (allow all)');
      console.error('   → Wait 2-3 minutes for changes to take effect\n');
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
      console.error('💡 FIX: Hostname not found');
      console.error('   → Check cluster URL in connection string');
      console.error('   → Get correct URL from MongoDB Atlas → Database → Connect\n');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.error('💡 FIX: Connection refused');
      console.error('   → MongoDB server may be down');
      console.error('   → Check MongoDB Atlas cluster status\n');
    } else {
      console.error('💡 General troubleshooting:');
      console.error('   → Verify MONGODB_URI in .env file');
      console.error('   → Check MongoDB Atlas cluster is running');
      console.error('   → Ensure no firewall blocking port 27017\n');
    }
    
    process.exit(1);
  }
}

console.log('╔════════════════════════════════════════╗');
console.log('║   MongoDB Connection Test Utility     ║');
console.log('╚════════════════════════════════════════╝\n');

testConnection();
