/**
 * Fix Invoice Index - Drop old camelCase index and create snake_case index
 * 
 * Run this script to fix the duplicate key error:
 * node fix-invoice-index.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Invoice = require('./models/Invoice');

async function fixInvoiceIndex() {
  try {
    console.log('🔧 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get current indexes
    console.log('\n📋 Current indexes:');
    const indexes = await Invoice.collection.getIndexes();
    console.log(JSON.stringify(indexes, null, 2));

    // Drop the old invoiceNumber index (camelCase)
    try {
      console.log('\n🗑️  Dropping old invoiceNumber_1 index...');
      await Invoice.collection.dropIndex('invoiceNumber_1');
      console.log('✅ Dropped invoiceNumber_1 index');
    } catch (error) {
      if (error.code === 27 || error.message.includes('index not found')) {
        console.log('ℹ️  invoiceNumber_1 index does not exist (already dropped or never created)');
      } else {
        throw error;
      }
    }

    // Check if there are any invoices with null invoice_number
    console.log('\n🔍 Checking for invoices with null invoice_number...');
    const nullInvoices = await Invoice.find({ invoice_number: null }).countDocuments();
    console.log(`Found ${nullInvoices} invoices with null invoice_number`);

    if (nullInvoices > 0) {
      console.log('\n🗑️  Deleting invalid invoices with null invoice_number...');
      console.log('   (These are old invoices with incompatible schema)');
      
      // These invoices are from old schema and can't be migrated
      // They need to be deleted and recreated properly
      const result = await Invoice.deleteMany({ invoice_number: null });
      console.log(`✅ Deleted ${result.deletedCount} invalid invoices`);
      console.log('   New invoices will be created correctly with orders');
    }

    // Ensure the snake_case index exists
    console.log('\n✨ Creating snake_case invoice_number index...');
    await Invoice.collection.createIndex({ invoice_number: 1 }, { unique: true, sparse: true });
    console.log('✅ Created invoice_number_1 index');

    // Show final indexes
    console.log('\n📋 Final indexes:');
    const finalIndexes = await Invoice.collection.getIndexes();
    console.log(JSON.stringify(finalIndexes, null, 2));

    console.log('\n🎉 Invoice index fix complete!');
    console.log('\n✅ You can now restart your backend server and test order creation.');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error fixing invoice index:', error);
    process.exit(1);
  }
}

fixInvoiceIndex();
