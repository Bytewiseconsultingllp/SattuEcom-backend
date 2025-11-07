const nodemailer = require('nodemailer');
const logger = require('./logger');
 
// Create reusable transporter
const smtpPort = Number(process.env.SMTP_PORT || 587);
const smtpSecure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' ? true : smtpPort === 465;

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: smtpPort,
  secure: smtpSecure, // 465=true, 587/25=false with STARTTLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
  requireTLS: !smtpSecure,
  tls: {
    minVersion: 'TLSv1.2',
  },
  logger: true,
  debug: true
});

// Verify transporter on startup for easier diagnostics
(async () => {
  try {
    await transporter.verify();
    logger.info('SMTP transporter verified', { host: process.env.SMTP_HOST, port: smtpPort, secure: smtpSecure });
  } catch (err) {
    logger.error('SMTP transporter verification failed', { message: err?.message, code: err?.code });
  }
})();

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
    from: `"${process.env.SMTP_FROM_NAME || 'E-commerce'}" <${process.env.SMTP_USER}>`,
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
  const fromName = process.env.SMTP_FROM_NAME || 'E-commerce';
  const from = `"${fromName}" <${process.env.SMTP_USER}>`;
  try {
    logger.debug('sending email', { to, subject });
    const info = await transporter.sendMail({ from, to, subject, html, headers: { 'X-Mailer': 'SattuEcom' } });
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

async function sendWelcomeEmail(email, name, tempPassword) {
  const subject = 'Welcome to Grain Fusion - Your Account Created';
  const resetUrl = `${process.env.FRONTEND_URL || ''}/forgot-password`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0;">Welcome to Grain Fusion</h1>
      </div>
      <div style="padding: 20px; background-color: #f9f9f9; border: 1px solid #ddd; border-radius: 0 0 8px 8px;">
        <p>Hi <strong>${name}</strong>,</p>
        <p>Welcome to Grain Fusion! Your account has been successfully created.</p>
        <div style="background-color: white; padding: 15px; border-left: 4px solid #667eea; margin: 20px 0;">
          <p><strong>Your Login Credentials:</strong></p>
          <p>Email: <code style="background: #f0f0f0; padding: 5px 10px;">${email}</code></p>
          <p>Temporary Password: <code style="background: #f0f0f0; padding: 5px 10px;">${tempPassword}</code></p>
        </div>
        <p style="color: #666; font-size: 14px;">For security reasons, please reset your password on your first login.</p>
        <a href="${resetUrl}" style="display: inline-block; background-color: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0;">Reset Password</a>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">If you didn't create this account, please contact our support team.</p>
      </div>
    </div>
  `;
  return sendMailSafe({ to: email, subject, html });
}

// Optional: simple test helper to verify SMTP to any target inbox
async function sendTestEmail(to, subject = 'SMTP Test', text = 'This is a test email from SattuEcom') {
  const fromName = process.env.SMTP_FROM_NAME || 'E-commerce';
  const from = `"${fromName}" <${process.env.SMTP_USER}>`;
  return transporter.sendMail({ from, to, subject, text });
}

async function sendPasswordResetEmail(email, name) {
  const subject = 'Set Your Password - Grain Fusion';
  const resetUrl = `${process.env.FRONTEND_URL || ''}/forgot-password`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0;">Welcome to Grain Fusion</h1>
      </div>
      <div style="padding: 20px; background-color: #f9f9f9; border: 1px solid #ddd; border-radius: 0 0 8px 8px;">
        <p>Hi <strong>${name || 'there'}</strong>,</p>
        <p>Your account has been created. For security, please set your password using the link below:</p>
        <a href="${resetUrl}" style="display: inline-block; background-color: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0;">Set/Reset Password</a>
        <p style="color: #666; font-size: 14px;">This link takes you to the password reset page.</p>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">If you didn't request this, please ignore this email.</p>
      </div>
    </div>
  `;
  return sendMailSafe({ to: email, subject, html });
}

module.exports = { sendOTPEmail, sendOrderCreatedEmail, sendOrderCancelledEmail, sendWelcomeEmail, sendPasswordResetEmail, sendTestEmail };