require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const connectDB = require('../config/db');
const { generateToken, generateRefreshToken } = require('../middleware/auth');

async function createAdminUser(email, password, name) {
  try {
    // Connect to database
    await connectDB();

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email });
    if (existingAdmin) {
      console.log('Admin user already exists with this email.');
      process.exit(1);
    }

    // Create admin user
    const admin = await User.create({
      email,
      password,
      name,
      role: 'admin',
      isVerified: true,
      isActive: true,
      authProvider: 'local'
    });

    // Generate tokens
    const token = generateToken(admin._id);
    const refreshToken = generateRefreshToken(admin._id);

    // Save refresh token to user
    admin.refreshToken = refreshToken;
    await admin.save();

    console.log('\nAdmin user created successfully:');
    console.log({
      id: admin._id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      isVerified: admin.isVerified
    });

    console.log('\nAuthentication tokens (save these):');
    console.log({
      token,        // Access token (short-lived)
      refreshToken  // Refresh token (long-lived)
    });

    console.log('\nExample API usage:');
    console.log('curl -H "Authorization: Bearer ' + token + '" http://localhost:5000/api/auth/profile');

    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error.message);
    process.exit(1);
  }
}

// Get credentials from command line arguments
const email = process.argv[2];
const password = process.argv[3];
const name = process.argv[4];

if (!email || !password || !name) {
  console.log('Usage: node scripts/create-admin.js <email> <password> <name>');
  console.log('Example: node scripts/create-admin.js admin@example.com mySecurePassword "Admin User"');
  process.exit(1);
}

// Create the admin user
createAdminUser(email, password, name);