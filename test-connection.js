require('dotenv').config();
const mongoose = require('mongoose');
 
console.log('🔍 Testing MongoDB Connection...\n');
 
// Validate .env file exists
if (!process.env.MONGODB_URI) {
  console.error('❌ ERROR: MONGODB_URI is not defined in .env file');
  console.error('\nPlease create a .env file and add your MongoDB connection string:');
  console.error('MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database\n');
  process.exit(1);
}
 
// Hide password in log
const safeUri = process.env.MONGODB_URI.replace(/:([^:@]+)@/, ':****@');
console.log('📝 Connection String (password hidden):');
console.log(safeUri);
console.log('');
 
// Validate connection string format
const uri = process.env.MONGODB_URI;
 
// Check for common issues
const issues = [];
 
if (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
  issues.push('❌ Must start with "mongodb://" or "mongodb+srv://"');
}
 
if (uri.includes('%2540')) {
  issues.push('⚠️  Detected double-encoded @ sign (%2540). Use %40 instead');
}
 
if (!uri.includes('@')) {
  issues.push('❌ Missing @ symbol between credentials and host');
}
 
const parts = uri.split('@');
if (parts.length > 1) {
  const hostPart = parts[1];
  if (!hostPart || hostPart.length < 5) {
    issues.push('❌ Invalid or missing hostname');
  }
}
 
if (issues.length > 0) {
  console.log('⚠️  POTENTIAL ISSUES DETECTED:\n');
  issues.forEach(issue => console.log('  ' + issue));
  console.log('\n📖 See MONGODB_SETUP.md for help fixing these issues\n');
}
 
// Attempt connection
console.log('🔄 Attempting to connect to MongoDB...\n');
 
mongoose.set('strictQuery', false);
 
mongoose
  .connect(uri)
  .then((conn) => {
    console.log('✅ SUCCESS! MongoDB Connected');
    console.log(`📍 Host: ${conn.connection.host}`);
    console.log(`📂 Database: ${conn.connection.name || 'default'}`);
    console.log('\n🎉 Your connection string is working correctly!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.log('❌ CONNECTION FAILED\n');
    console.error('Error:', error.message);
    console.log('\n🔧 TROUBLESHOOTING STEPS:\n');
    
    if (error.message.includes('EBADNAME') || error.message.includes('querySrv')) {
      console.log('  1. Check for double URL encoding in your password');
      console.log('  2. Ensure you are using mongodb+srv:// for Atlas');
      console.log('  3. Verify your cluster address is correct');
    } else if (error.message.includes('authentication failed')) {
      console.log('  1. Verify your username and password are correct');
      console.log('  2. Check if special characters in password are URL encoded');
      console.log('  3. Ensure the database user has proper permissions');
    } else if (error.message.includes('hostname') || error.message.includes('tld')) {
      console.log('  1. Ensure connection string includes full hostname');
      console.log('  2. Format: mongodb+srv://user:pass@cluster.xxxxx.mongodb.net/dbname');
      console.log('  3. Check for typos in the cluster address');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.log('  1. For local MongoDB: ensure MongoDB is running');
      console.log('  2. Check if port 27017 is available');
      console.log('  3. Try: brew services start mongodb-community');
    } else {
      console.log('  1. Check your internet connection');
      console.log('  2. Verify MongoDB Atlas IP whitelist (use 0.0.0.0/0 for testing)');
      console.log('  3. See MONGODB_SETUP.md for detailed instructions');
    }
    
    console.log('\n📖 For detailed help, see: MONGODB_SETUP.md\n');
    process.exit(1);
  });
 
// Timeout after 10 seconds
setTimeout(() => {
  console.log('\n⏱️  Connection timeout - check your network or MongoDB service');
  process.exit(1);
}, 10000);