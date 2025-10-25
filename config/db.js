const mongoose = require('mongoose');
 
// Set strictQuery to false to prepare for Mongoose 7
mongoose.set('strictQuery', false);
 
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
 
    console.log(`MongoDB Connected: ${conn.connection.host}`);
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