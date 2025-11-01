const nodemailer = require('nodemailer');
const logger = require('./logger');
 
// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});
 
/**
* Send OTP email to user
* @param {string} email - Recipient email
* @param {string} otp - OTP code
* @param {string} type - Type of OTP (registration, login, password_reset)
*/
const sendOTPEmail = async (email, otp, type) => {
  logger.debug('sendOTPEmail called', { email, type });
  let subject, htmlContent;
 
  switch (type) {
    case 'registration':
      subject = 'Verify Your Email - E-commerce';
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome to E-commerce!</h2>
          <p>Thank you for registering. Please use the following OTP to verify your email:</p>
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #4CAF50; letter-spacing: 5px; margin: 0;">${otp}</h1>
          </div>
          <p>This OTP will expire in ${process.env.OTP_EXPIRE_MINUTES || 10} minutes.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <hr style="border: 1px solid #eee; margin: 20px 0;">
          <p style="color: #999; font-size: 12px;">This is an automated email. Please do not reply.</p>
        </div>
      `;
      break;
 
    case 'login':
      subject = 'Login Verification - E-commerce';
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Login Verification</h2>
          <p>Someone is trying to log in to your account. Please use the following OTP to continue:</p>
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #2196F3; letter-spacing: 5px; margin: 0;">${otp}</h1>
          </div>
          <p>This OTP will expire in ${process.env.OTP_EXPIRE_MINUTES || 10} minutes.</p>
          <p>If you didn't attempt to log in, please secure your account immediately.</p>
          <hr style="border: 1px solid #eee; margin: 20px 0;">
          <p style="color: #999; font-size: 12px;">This is an automated email. Please do not reply.</p>
        </div>
      `;
      break;
 
    case 'password_reset':
      subject = 'Password Reset Request - E-commerce';
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>You have requested to reset your password. Please use the following OTP:</p>
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #FF5722; letter-spacing: 5px; margin: 0;">${otp}</h1>
          </div>
          <p>This OTP will expire in ${process.env.OTP_EXPIRE_MINUTES || 10} minutes.</p>
          <p>If you didn't request this, please ignore this email and your password will remain unchanged.</p>
          <hr style="border: 1px solid #eee; margin: 20px 0;">
          <p style="color: #999; font-size: 12px;">This is an automated email. Please do not reply.</p>
        </div>
      `;
      break;
 
    default:
      throw new Error('Invalid OTP type');
  }
 
  const mailOptions = {
    from: `"E-commerce" <${process.env.SMTP_USER}>`,
    to: email,
    subject: subject,
    html: htmlContent,
  };
 
  try {
    logger.debug('sending email', { to: email, subject });
    const info = await transporter.sendMail(mailOptions);
    // Log messageId and response, but never log auth credentials
    logger.info('OTP email sent', { to: email, messageId: info.messageId, response: info.response });
    return true;
  } catch (error) {
    // Nodemailer error objects can contain sensitive info; log message and code only
    const safeError = {
      message: error && error.message,
      code: error && error.code,
    };
    logger.error('Error sending email', safeError);
    throw new Error('Failed to send email');
  }
};


function renderOrderHtml(order, extra = '') {
  const items = (order.order_items || []).map((it) => {
    const name = it?.product?.name || it.product_id;
    const qty = it.quantity || 0;
    const price = it.price || 0;
    const subtotal = qty * price;
    return `
      <tr>
        <td style="padding:6px 8px;border:1px solid #eee">${name}</td>
        <td style="padding:6px 8px;border:1px solid #eee">${qty}</td>
        <td style="padding:6px 8px;border:1px solid #eee">₹${price}</td>
        <td style="padding:6px 8px;border:1px solid #eee">₹${subtotal}</td>
      </tr>
    `;
  }).join('');

  const address = order.shipping_address
    ? `${order.shipping_address.address_line1}${order.shipping_address.address_line2 ? ', ' + order.shipping_address.address_line2 : ''}, ${order.shipping_address.city}, ${order.shipping_address.state} - ${order.shipping_address.postal_code}`
    : '-';

  return `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto;">
      ${extra ? `<div style="margin-bottom:12px">${extra}</div>` : ''}
      <h2 style="margin:0 0 8px">Order ${order.id}</h2>
      <p style="margin:0 0 12px;color:#555">Status: <b>${order.status}</b> • Date: ${new Date(order.created_at || order.createdAt || Date.now()).toLocaleString()}</p>
      <h3 style="margin:16px 0 8px">Items</h3>
      <table cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:100%;">
        <thead>
          <tr>
            <th style="padding:6px 8px;border:1px solid #eee;text-align:left">Product</th>
            <th style="padding:6px 8px;border:1px solid #eee;text-align:left">Qty</th>
            <th style="padding:6px 8px;border:1px solid #eee;text-align:left">Price</th>
            <th style="padding:6px 8px;border:1px solid #eee;text-align:left">Subtotal</th>
          </tr>
        </thead>
        <tbody>${items}</tbody>
      </table>
      <h3 style="margin:16px 0 8px">Total: ₹${order.total_amount ?? order.total}</h3>
      <h3 style="margin:16px 0 8px">Shipping Address</h3>
      <p style="margin:0;color:#555">${address}</p>
    </div>
  `;
}

async function sendMailSafe({ to, subject, html }) {
  const from = `"E-commerce" <${process.env.SMTP_USER}>`;
  try {
    logger.debug('sending email', { to, subject });
    const info = await transporter.sendMail({ from, to, subject, html });
    logger.info('email sent', { to, subject, messageId: info.messageId, response: info.response });
    return true;
  } catch (error) {
    const safeError = { message: error?.message, code: error?.code };
    logger.error('Error sending email', safeError);
    throw new Error('Failed to send email');
  } 
}

// New: order confirmation to user + admin
async function sendOrderCreatedEmail(order, userEmail) {
  const html = renderOrderHtml(order, `<h2 style="margin:0 0 8px;color:#333;">Order Confirmation</h2>`);
  const admin = process.env.ADMIN_EMAIL;
  await Promise.all([
    sendMailSafe({ to: userEmail, subject: `Order Confirmation - ${order.id}`, html }),
    admin ? sendMailSafe({ to: admin, subject: `New Order - ${order.id}`, html }) : Promise.resolve(),
  ]);
}

// New: order cancelled to user + admin with reason
async function sendOrderCancelledEmail(order, userEmail, reason) {
  const html = renderOrderHtml(order, `<h2 style="margin:0 0 8px;color:#c1121f;">Order Cancelled</h2><p><b>Reason:</b> ${reason || 'No reason provided'}</p>`);
  const admin = process.env.ADMIN_EMAIL;
  await Promise.all([
    sendMailSafe({ to: userEmail, subject: `Order Cancelled - ${order.id}`, html }),
    admin ? sendMailSafe({ to: admin, subject: `Order Cancelled - ${order.id}`, html }) : Promise.resolve(),
  ]);
}

 
module.exports = { sendOTPEmail, sendOrderCreatedEmail, sendOrderCancelledEmail };
 