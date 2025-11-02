# Razorpay Integration Setup Guide

## 1. Prerequisites

- Razorpay account (Sign up at https://razorpay.com/)
- Node.js backend with Express
- React frontend
- MongoDB database

## 2. Backend Setup

### Install Dependencies

```bash
npm install razorpay crypto
```

### Environment Variables

Add to your `.env` file:

```env
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxx
RAZORPAY_KEY_SECRET=your_secret_key
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
FRONTEND_URL=http://localhost:5173
```

### Update Order Model

Add these fields to your Order model:

```javascript
payment_status: {
  type: String,
  enum: ['pending', 'paid', 'failed', 'refunded'],
  default: 'pending',
},
razorpay_order_id: {
  type: String,
},
paid_at: {
  type: Date,
},
```

### Register Routes in server.js

```javascript
const paymentRoutes = require('./routes/payments');
const adminPaymentRoutes = require('./routes/adminPayments');
const webhookRoutes = require('./routes/webhooks');

// Webhook route (must be before express.json() middleware)
app.use('/api/webhooks', webhookRoutes);

// Regular routes
app.use(express.json());
app.use('/api/payments', paymentRoutes);
app.use('/api/admin/payments', adminPaymentRoutes);
```

## 3. Frontend Setup

### Add Razorpay Script to index.html

Add this to your `public/index.html` or `index.html`:

```html
<!-- Razorpay Checkout -->
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
```

Or load it dynamically (already handled in useRazorpay hook).

### Usage Example

```tsx
import { PaymentButton } from '@/components/PaymentButton';

function CheckoutPage() {
  const order = useOrder(); // Your order data
  const user = useUser(); // Your user data

  return (
    <PaymentButton
      orderId={order.id}
      amount={order.total_amount}
      userDetails={{
        name: user.name,
        email: user.email,
        contact: user.phone,
      }}
      onSuccess={() => {
        console.log('Payment successful!');
        // Redirect or show success message
      }}
      onFailure={() => {
        console.log('Payment failed');
        // Show error message
      }}
    />
  );
}
```

## 4. Razorpay Dashboard Configuration

### Enable Webhooks

1. Go to Razorpay Dashboard → Settings → Webhooks
2. Add webhook URL: `https://yourdomain.com/api/webhooks/razorpay`
3. Select events to listen:
   - `payment.authorized`
   - `payment.captured`
   - `payment.failed`
   - `refund.created`
   - `refund.processed`
   - `refund.failed`
   - `order.paid`
4. Copy the webhook secret and add to `.env`

### Test Mode vs Live Mode

- Use `rzp_test_` keys for testing
- Switch to `rzp_live_` keys for production
- Test with Razorpay test cards: https://razorpay.com/docs/payments/payments/test-card-details/

## 5. Payment Flow

### User Payment Flow

1. User places order → Order created with status "pending"
2. Frontend calls `/api/payments/create-order` with order_id
3. Backend creates Razorpay order and Payment record
4. Frontend opens Razorpay checkout with order_id
5. User completes payment
6. Razorpay sends payment details to frontend
7. Frontend calls `/api/payments/verify` with payment details
8. Backend verifies signature and updates Payment & Order
9. Webhook confirms payment asynchronously

### Refund Flow

1. User/Admin requests refund
2. Backend calls Razorpay refund API
3. Razorpay processes refund
4. Webhook updates Payment & Order status
5. User receives refund in 5-7 business days

## 6. API Endpoints

### User Endpoints

- `POST /api/payments/create-order` - Create payment order
- `POST /api/payments/verify` - Verify payment
- `POST /api/payments/failed` - Handle payment failure
- `GET /api/payments/my-payments` - Get payment history
- `GET /api/payments/:id` - Get payment details
- `POST /api/payments/:id/refund` - Request refund

### Admin Endpoints

- `GET /api/admin/payments` - Get all payments
- `GET /api/admin/payments/stats` - Get payment statistics
- `GET /api/admin/payments/:id` - Get payment details
- `POST /api/admin/payments/:id/refund` - Process refund

### Webhook Endpoint

- `POST /api/webhooks/razorpay` - Handle Razorpay webhooks

## 7. Testing

### Test Payment

```bash
# Test card details
Card Number: 4111 1111 1111 1111
CVV: Any 3 digits
Expiry: Any future date
```

### Test Webhook Locally

Use ngrok to expose local server:

```bash
ngrok http 5000
# Use the ngrok URL in Razorpay webhook settings
```

## 8. Security Best Practices

1. ✅ Always verify payment signature on backend
2. ✅ Never expose Razorpay secret key to frontend
3. ✅ Use HTTPS in production
4. ✅ Validate webhook signatures
5. ✅ Store sensitive data in environment variables
6. ✅ Implement rate limiting on payment endpoints
7. ✅ Log all payment transactions
8. ✅ Handle edge cases (network failures, timeouts)

## 9. Error Handling

Common errors and solutions:

- **Invalid signature**: Check RAZORPAY_KEY_SECRET
- **Order not found**: Verify order_id is correct
- **Payment already captured**: Check payment status before retry
- **Webhook signature mismatch**: Verify RAZORPAY_WEBHOOK_SECRET

## 10. Production Checklist

- [ ] Switch to live Razorpay keys
- [ ] Update webhook URL to production domain
- [ ] Enable HTTPS
- [ ] Set up monitoring and alerts
- [ ] Test refund flow
- [ ] Configure email notifications
- [ ] Set up backup webhook endpoint
- [ ] Document payment reconciliation process
- [ ] Train support team on payment issues

## 11. Monitoring & Logs

Monitor these metrics:

- Payment success rate
- Failed payments
- Refund requests
- Webhook delivery status
- Average payment time

## 12. Support

- Razorpay Docs: https://razorpay.com/docs/
- Razorpay Support: support@razorpay.com
- Test Dashboard: https://dashboard.razorpay.com/test/dashboard

## 13. Common Issues

### Payment stuck in "created" status
- Check webhook delivery in Razorpay dashboard
- Verify webhook signature validation
- Check server logs for errors

### Refund not reflecting
- Refunds take 5-7 business days
- Check refund status in Razorpay dashboard
- Verify webhook events are being received

### Duplicate payments
- Implement idempotency checks
- Use unique order IDs
- Check for race conditions in webhook handling
