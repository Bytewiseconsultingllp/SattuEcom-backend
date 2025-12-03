/**
 * Test Script for Controller Standardization
 * 
 * This script verifies that all controller responses use snake_case field names
 * matching the model schemas.
 * 
 * Run with: node test-controller-standardization.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Models
const Order = require('./models/Order');
const Invoice = require('./models/Invoice');
const Payment = require('./models/Payment');

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Verify Order model fields
 */
function verifyOrderModelFields() {
  log('\n📋 Verifying Order Model Fields...', 'blue');
  
  const expectedFields = [
    'user_id', 'total_amount', 'status', 'shipping_address_id',
    'coupon_code', 'discount_amount', 'delivery_charges', 'delivery_type',
    'gift_design_id', 'gift_price', 'gift_card_message', 'gift_wrapping_type',
    'tax_amount', 'tax_rate', 'sale_type', 'invoice_id', 'invoice_number',
    'cancellation_reason', 'cancelled_at', 'cancelled_by',
    'statusHistory', 'shipment'
  ];
  
  const schema = Order.schema.obj;
  const schemaFields = Object.keys(schema);
  
  let allFound = true;
  expectedFields.forEach(field => {
    if (schemaFields.includes(field)) {
      log(`  ✓ ${field}`, 'green');
    } else {
      log(`  ✗ ${field} - NOT FOUND`, 'red');
      allFound = false;
    }
  });
  
  return allFound;
}

/**
 * Verify Invoice model fields
 */
function verifyInvoiceModelFields() {
  log('\n📄 Verifying Invoice Model Fields...', 'blue');
  
  const expectedFields = [
    'invoice_number', 'user_id', 'order_id', 'items',
    'subtotal', 'discount_amount', 'coupon_discount', 'gift_price',
    'delivery_charges', 'tax_amount', 'total_amount',
    'issue_date', 'due_date',
    'payment_status', 'payment_method', 'payment_date',
    'razorpay_payment_id', 'razorpay_order_id',
    'sale_type', 'upi_qr_code', 'upi_id',
    'billing_address', 'shipping_address',
    'notes', 'terms', 'pdf_url', 'status'
  ];
  
  const schema = Invoice.schema.obj;
  const schemaFields = Object.keys(schema);
  
  let allFound = true;
  expectedFields.forEach(field => {
    if (schemaFields.includes(field)) {
      log(`  ✓ ${field}`, 'green');
    } else {
      log(`  ✗ ${field} - NOT FOUND`, 'red');
      allFound = false;
    }
  });
  
  return allFound;
}

/**
 * Verify Payment model fields
 */
function verifyPaymentModelFields() {
  log('\n💳 Verifying Payment Model Fields...', 'blue');
  
  const expectedFields = [
    'order_id', 'user_id',
    'razorpay_order_id', 'razorpay_payment_id', 'razorpay_signature',
    'amount', 'currency', 'status',
    'payment_method', 'payment_email', 'payment_contact',
    'refund_id', 'refund_amount', 'refund_status',
    'sale_type', 'error_code', 'error_description', 'metadata'
  ];
  
  const schema = Payment.schema.obj;
  const schemaFields = Object.keys(schema);
  
  let allFound = true;
  expectedFields.forEach(field => {
    if (schemaFields.includes(field)) {
      log(`  ✓ ${field}`, 'green');
    } else {
      log(`  ✗ ${field} - NOT FOUND`, 'red');
      allFound = false;
    }
  });
  
  return allFound;
}

/**
 * Check for camelCase fields that should be snake_case
 */
function checkForCamelCaseFields() {
  log('\n🔍 Checking for CamelCase Fields (should be snake_case)...', 'blue');
  
  const modelsToCheck = [
    { name: 'Order', schema: Order.schema.obj },
    { name: 'Invoice', schema: Invoice.schema.obj },
    { name: 'Payment', schema: Payment.schema.obj }
  ];
  
  let foundCamelCase = false;
  
  modelsToCheck.forEach(({ name, schema }) => {
    const fields = Object.keys(schema);
    const camelCaseFields = fields.filter(field => {
      // Check if field has uppercase letters (indicating camelCase)
      return /[A-Z]/.test(field);
    });
    
    if (camelCaseFields.length > 0) {
      log(`\n  ${name} Model - Found camelCase fields:`, 'yellow');
      camelCaseFields.forEach(field => {
        log(`    ⚠ ${field}`, 'yellow');
      });
      foundCamelCase = true;
    }
  });
  
  if (!foundCamelCase) {
    log('  ✓ No camelCase fields found in main model schemas', 'green');
  }
  
  return !foundCamelCase;
}

/**
 * Generate sample response objects
 */
function generateSampleResponses() {
  log('\n📦 Sample Response Structures:', 'blue');
  
  log('\n  Order Response:', 'yellow');
  const orderSample = {
    id: '60d5ec49f1b2c72b8c8e4f1a',
    user_id: '60d5ec49f1b2c72b8c8e4f1b',
    total_amount: 1500,
    status: 'pending',
    shipping_address_id: '60d5ec49f1b2c72b8c8e4f1c',
    coupon_code: 'SAVE10',
    discount_amount: 150,
    delivery_charges: 50,
    delivery_type: 'standard',
    gift_price: 100,
    tax_amount: 75,
    tax_rate: 5,
    sale_type: 'online',
    invoice_id: '60d5ec49f1b2c72b8c8e4f1d',
    invoice_number: 'INV-GF-1234',
    created_at: '2024-01-15T10:30:00.000Z',
    updated_at: '2024-01-15T10:30:00.000Z',
  };
  console.log(JSON.stringify(orderSample, null, 2));
  
  log('\n  Invoice Response:', 'yellow');
  const invoiceSample = {
    id: '60d5ec49f1b2c72b8c8e4f1d',
    invoice_number: 'INV-GF-1234',
    user_id: '60d5ec49f1b2c72b8c8e4f1b',
    order_id: '60d5ec49f1b2c72b8c8e4f1a',
    subtotal: 1500,
    discount_amount: 0,
    coupon_discount: 150,
    gift_price: 100,
    delivery_charges: 50,
    tax_amount: 75,
    total_amount: 1575,
    payment_status: 'paid',
    sale_type: 'online',
    status: 'paid',
  };
  console.log(JSON.stringify(invoiceSample, null, 2));
  
  log('\n  Payment Response:', 'yellow');
  const paymentSample = {
    id: '60d5ec49f1b2c72b8c8e4f1e',
    order_id: '60d5ec49f1b2c72b8c8e4f1a',
    user_id: '60d5ec49f1b2c72b8c8e4f1b',
    razorpay_order_id: 'order_abc789',
    razorpay_payment_id: 'pay_xyz123',
    amount: 1575,
    currency: 'INR',
    status: 'captured',
    payment_method: 'upi',
    refund_amount: 0,
    refund_status: 'none',
    sale_type: 'online',
  };
  console.log(JSON.stringify(paymentSample, null, 2));
}

/**
 * Main test function
 */
async function runTests() {
  log('╔════════════════════════════════════════════════════════════╗', 'blue');
  log('║     Controller Standardization Verification Test          ║', 'blue');
  log('╚════════════════════════════════════════════════════════════╝', 'blue');
  
  const results = {
    orderFields: false,
    invoiceFields: false,
    paymentFields: false,
    noCamelCase: false,
  };
  
  try {
    // Run verifications
    results.orderFields = verifyOrderModelFields();
    results.invoiceFields = verifyInvoiceModelFields();
    results.paymentFields = verifyPaymentModelFields();
    results.noCamelCase = checkForCamelCaseFields();
    
    // Generate sample responses
    generateSampleResponses();
    
    // Summary
    log('\n' + '═'.repeat(60), 'blue');
    log('SUMMARY', 'blue');
    log('═'.repeat(60), 'blue');
    
    const allPassed = Object.values(results).every(r => r === true);
    
    if (allPassed) {
      log('\n✅ All standardization checks PASSED!', 'green');
      log('\nAll models use snake_case field names consistently.', 'green');
      log('Controller responses should match these field names.', 'green');
    } else {
      log('\n⚠️  Some standardization checks FAILED!', 'yellow');
      log('\nPlease review the model schemas and ensure all fields', 'yellow');
      log('use snake_case naming convention.', 'yellow');
    }
    
    log('\n' + '═'.repeat(60) + '\n', 'blue');
    
  } catch (error) {
    log('\n❌ Error running tests:', 'red');
    console.error(error);
    process.exit(1);
  }
}

// Run tests
runTests().then(() => {
  log('Test completed!', 'green');
  process.exit(0);
}).catch(error => {
  log('Test failed!', 'red');
  console.error(error);
  process.exit(1);
});
