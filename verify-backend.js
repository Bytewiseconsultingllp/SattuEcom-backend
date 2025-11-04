#!/usr/bin/env node

require('dotenv').config();
const mongoose = require('mongoose');
const http = require('http');

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║          Backend Verification & Health Check              ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

let passedChecks = 0;
let failedChecks = 0;

// Helper functions
function logSuccess(message) {
  console.log(`✅ ${message}`);
  passedChecks++;
}

function logError(message) {
  console.log(`❌ ${message}`);
  failedChecks++;
}

function logInfo(message) {
  console.log(`ℹ️  ${message}`);
}

function logWarning(message) {
  console.log(`⚠️  ${message}`);
}

// Check 1: Environment Variables
console.log('📋 Checking Environment Variables...\n');

const requiredEnvVars = [
  'MONGODB_URI',
  'PORT',
  'NODE_ENV',
  'JWT_SECRET'
];

const optionalEnvVars = [
  'ALLOWED_ORIGINS',
  'EMAIL_USER',
  'GOOGLE_CLIENT_ID',
  'RAZORPAY_KEY_ID',
  'CLOUDINARY_CLOUD_NAME'
];

requiredEnvVars.forEach(envVar => {
  if (process.env[envVar]) {
    logSuccess(`${envVar} is set`);
  } else {
    logError(`${envVar} is missing`);
  }
});

optionalEnvVars.forEach(envVar => {
  if (process.env[envVar]) {
    logSuccess(`${envVar} is set`);
  } else {
    logWarning(`${envVar} is not set (optional)`);
  }
});

// Check 2: Node.js Version
console.log('\n📦 Checking Node.js Version...\n');

const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));

if (majorVersion >= 14) {
  logSuccess(`Node.js ${nodeVersion} (required: >=14.0.0)`);
} else {
  logError(`Node.js ${nodeVersion} (required: >=14.0.0)`);
}

// Check 3: MongoDB Connection
console.log('\n🗄️  Checking MongoDB Connection...\n');

async function checkMongoDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
      family: 4,
    });

    logSuccess('MongoDB connection successful');
    logInfo(`Host: ${mongoose.connection.host}`);
    logInfo(`Database: ${mongoose.connection.name}`);
    logInfo(`Port: ${mongoose.connection.port}`);

    await mongoose.connection.close();
    return true;
  } catch (error) {
    logError(`MongoDB connection failed: ${error.message}`);
    
    if (error.message.includes('timed out')) {
      logWarning('Possible causes:');
      logWarning('  1. IP not whitelisted in MongoDB Atlas');
      logWarning('  2. Network connectivity issue');
      logWarning('  3. MongoDB server is down');
    } else if (error.message.includes('authentication failed')) {
      logWarning('Possible causes:');
      logWarning('  1. Wrong username/password');
      logWarning('  2. User does not exist in MongoDB Atlas');
    }
    
    return false;
  }
}

// Check 4: Port Availability
console.log('\n🔌 Checking Port Availability...\n');

function checkPort() {
  return new Promise((resolve) => {
    const port = process.env.PORT || 4000;
    const server = http.createServer();

    server.listen(port, () => {
      logSuccess(`Port ${port} is available`);
      server.close();
      resolve(true);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        logError(`Port ${port} is already in use`);
      } else {
        logError(`Port check failed: ${err.message}`);
      }
      resolve(false);
    });
  });
}

// Check 5: Required Modules
console.log('\n📚 Checking Required Modules...\n');

const requiredModules = [
  'express',
  'mongoose',
  'cors',
  'dotenv',
  'jsonwebtoken',
  'bcryptjs',
  'nodemailer'
];

requiredModules.forEach(module => {
  try {
    require.resolve(module);
    logSuccess(`${module} is installed`);
  } catch (e) {
    logError(`${module} is not installed`);
  }
});

// Main execution
async function runAllChecks() {
  const portAvailable = await checkPort();
  const mongoConnected = await checkMongoDB();

  // Summary
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    VERIFICATION SUMMARY                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log(`✅ Passed: ${passedChecks}`);
  console.log(`❌ Failed: ${failedChecks}`);
  console.log(`⚠️  Warnings: ${optionalEnvVars.filter(v => !process.env[v]).length}\n`);

  if (failedChecks === 0 && portAvailable && mongoConnected) {
    console.log('🎉 All checks passed! Backend is ready to start.\n');
    console.log('📝 Next steps:');
    console.log('   1. Run: npm start');
    console.log('   2. Backend will start on port', process.env.PORT || 4000);
    console.log('   3. Test: curl http://localhost:4000/api/health\n');
    process.exit(0);
  } else if (failedChecks > 0) {
    console.log('⚠️  Some checks failed. Please fix the issues above.\n');
    console.log('💡 Common fixes:');
    if (!process.env.MONGODB_URI) {
      console.log('   - Add MONGODB_URI to .env file');
    }
    if (!portAvailable) {
      console.log('   - Kill process using port', process.env.PORT || 4000);
    }
    if (!mongoConnected) {
      console.log('   - Whitelist your IP in MongoDB Atlas Network Access');
    }
    console.log();
    process.exit(1);
  } else {
    console.log('✅ Backend is ready! You can start the server now.\n');
    process.exit(0);
  }
}

runAllChecks();
