/**
 * Test Script for Custom Reports Generation
 * Run: node test-custom-reports.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Order = require('./models/Order');
const OfflineSale = require('./models/OfflineSale');
const Expense = require('./models/Expense');
const User = require('./models/User');
const Product = require('./models/Product');
const Payment = require('./models/Payment');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sattu-ecom';

async function testReportDataAvailability() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get current month date range
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    
    console.log('📅 Testing Monthly Report Data');
    console.log(`   Period: ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}\n`);

    // Test Orders
    console.log('📦 Checking Orders...');
    const orders = await Order.find({
      createdAt: { $gte: startDate, $lte: endDate },
      status: 'delivered'
    });
    console.log(`   ✅ Found ${orders.length} delivered orders`);
    const orderTotal = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
    console.log(`   💰 Total: ₹${orderTotal.toFixed(2)}\n`);

    // Test Offline Sales
    console.log('🏪 Checking Offline Sales...');
    const offlineSales = await OfflineSale.find({
      createdAt: { $gte: startDate, $lte: endDate }
    });
    console.log(`   ✅ Found ${offlineSales.length} offline sales`);
    const offlineTotal = offlineSales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
    console.log(`   💰 Total: ₹${offlineTotal.toFixed(2)}\n`);

    // Test Expenses
    console.log('💸 Checking Expenses...');
    const expenses = await Expense.find({
      createdAt: { $gte: startDate, $lte: endDate }
    });
    console.log(`   ✅ Found ${expenses.length} expenses`);
    const expenseTotal = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    console.log(`   💰 Total: ₹${expenseTotal.toFixed(2)}\n`);

    // Test Users
    console.log('👥 Checking Customers...');
    const users = await User.find({ role: 'user' });
    console.log(`   ✅ Total customers: ${users.length}`);
    const newUsers = await User.find({
      role: 'user',
      createdAt: { $gte: startDate, $lte: endDate }
    });
    console.log(`   ✅ New customers this month: ${newUsers.length}\n`);

    // Test Products
    console.log('📦 Checking Products...');
    const products = await Product.find();
    console.log(`   ✅ Total products: ${products.length}`);
    const lowStock = products.filter(p => (p.stock || 0) < 10);
    console.log(`   ⚠️  Low stock items: ${lowStock.length}\n`);

    // Test Payments
    console.log('💳 Checking Payments...');
    const payments = await Payment.find({
      createdAt: { $gte: startDate, $lte: endDate }
    });
    console.log(`   ✅ Found ${payments.length} payments`);
    const paymentTotal = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    console.log(`   💰 Total: ₹${paymentTotal.toFixed(2)}\n`);

    // Calculate Summary
    console.log('📊 MONTHLY SUMMARY');
    console.log('═══════════════════════════════════════');
    const totalRevenue = orderTotal + offlineTotal;
    const netProfit = totalRevenue - expenseTotal;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    
    console.log(`   Total Revenue:  ₹${totalRevenue.toFixed(2)}`);
    console.log(`   Total Expenses: ₹${expenseTotal.toFixed(2)}`);
    console.log(`   Net Profit:     ₹${netProfit.toFixed(2)}`);
    console.log(`   Profit Margin:  ${profitMargin.toFixed(2)}%`);
    console.log('═══════════════════════════════════════\n');

    // Data Quality Check
    console.log('🔍 DATA QUALITY CHECK');
    console.log('═══════════════════════════════════════');
    
    const issues = [];
    if (orders.length === 0 && offlineSales.length === 0) {
      issues.push('⚠️  No sales data found for this month');
    }
    if (expenses.length === 0) {
      issues.push('⚠️  No expense data found for this month');
    }
    if (products.length === 0) {
      issues.push('⚠️  No products in inventory');
    }
    if (users.length === 0) {
      issues.push('⚠️  No customers in database');
    }

    if (issues.length > 0) {
      console.log('   Issues Found:');
      issues.forEach(issue => console.log(`   ${issue}`));
      console.log('\n   ⚠️  Reports may be empty or incomplete!');
    } else {
      console.log('   ✅ All data looks good!');
      console.log('   ✅ Reports should generate successfully!');
    }
    console.log('═══════════════════════════════════════\n');

    console.log('✅ Test completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error during test:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the test
testReportDataAvailability();
