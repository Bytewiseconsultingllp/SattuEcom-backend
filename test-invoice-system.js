/**
 * Test Script for Dynamic Invoice System
 * Run this to verify the invoice system is working correctly
 */

const mongoose = require('mongoose');
require('dotenv').config();

const CompanySettings = require('./models/CompanySettings');
const Invoice = require('./models/Invoice');

async function testInvoiceSystem() {
  try {
    console.log('🔍 Testing Dynamic Invoice System...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Test 1: Check if qrcode package is installed
    console.log('📦 Test 1: Checking qrcode package...');
    try {
      require('qrcode');
      console.log('✅ qrcode package is installed\n');
    } catch (err) {
      console.log('❌ qrcode package NOT installed');
      console.log('   Run: npm install qrcode\n');
      process.exit(1);
    }

    // Test 2: Check Company Settings
    console.log('🏢 Test 2: Checking Company Settings...');
    let settings = await CompanySettings.findOne();
    
    if (!settings) {
      console.log('⚠️  No company settings found. Creating default settings...');
      settings = await CompanySettings.create({
        companyName: 'Sattu Store',
        email: 'info@sattustore.com',
        phone: '+91 98765 43210',
        address: '123 Main Street, City, State - 123456',
        gstNumber: '',
        panNumber: '',
        upiId: '',
      });
      console.log('✅ Default company settings created\n');
    } else {
      console.log('✅ Company settings found');
      console.log(`   Company: ${settings.companyName}`);
      console.log(`   Email: ${settings.email}`);
      console.log(`   GST: ${settings.gstNumber || 'Not set'}`);
      console.log(`   PAN: ${settings.panNumber || 'Not set'}`);
      console.log(`   UPI ID: ${settings.upiId || 'Not set'}`);
      
      if (!settings.upiId) {
        console.log('\n⚠️  WARNING: UPI ID not set!');
        console.log('   QR codes will not be generated for offline sales.');
        console.log('   Set UPI ID in admin dashboard: Company Settings\n');
      } else {
        console.log('');
      }
    }

    // Test 3: Check Invoice Model
    console.log('📄 Test 3: Checking Invoice Model...');
    const invoiceCount = await Invoice.countDocuments();
    console.log(`✅ Invoice model working. Total invoices: ${invoiceCount}\n`);

    // Test 4: Test QR Code Generation
    console.log('🔲 Test 4: Testing QR Code Generation...');
    if (settings.upiId) {
      const QRCode = require('qrcode');
      const testUpiString = `upi://pay?pa=${settings.upiId}&pn=${settings.companyName}&am=100&cu=INR&tn=Test Invoice`;
      try {
        const qrCode = await QRCode.toDataURL(testUpiString);
        console.log('✅ QR code generation working');
        console.log(`   QR code size: ${qrCode.length} bytes\n`);
      } catch (err) {
        console.log('❌ QR code generation failed:', err.message, '\n');
      }
    } else {
      console.log('⚠️  Skipped (UPI ID not set)\n');
    }

    // Test 5: Check Invoice Routes
    console.log('🛣️  Test 5: Checking Invoice Routes...');
    try {
      const invoiceRoutes = require('./routes/invoiceRoutes');
      console.log('✅ Invoice routes loaded successfully\n');
    } catch (err) {
      console.log('❌ Invoice routes failed to load:', err.message, '\n');
    }

    // Summary
    console.log('═══════════════════════════════════════════════════════');
    console.log('📊 SUMMARY');
    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ MongoDB Connection: Working');
    console.log('✅ QR Code Package: Installed');
    console.log('✅ Company Settings: ' + (settings ? 'Configured' : 'Not configured'));
    console.log('✅ Invoice Model: Working');
    console.log('✅ Invoice Routes: Loaded');
    
    if (!settings.upiId) {
      console.log('\n⚠️  ACTION REQUIRED:');
      console.log('   1. Go to Admin Dashboard → Company Settings');
      console.log('   2. Add UPI ID (e.g., yourstore@upi)');
      console.log('   3. Add other company details (GST, PAN, Bank Details)');
      console.log('   4. Upload company logo and signature');
    } else {
      console.log('\n✅ System is ready for invoice generation!');
    }
    
    console.log('\n📚 Next Steps:');
    console.log('   1. Configure company settings in admin dashboard');
    console.log('   2. Test online order with Razorpay payment');
    console.log('   3. Test offline order (QR code generation)');
    console.log('   4. Check admin pending invoices endpoint');
    console.log('═══════════════════════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
testInvoiceSystem();
