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
      subject = 'Verify Your Email - Grain Fusion';
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome to Grain Fusion!</h2>
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
      subject = 'Login Verification - Grain Fusion';
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
      subject = 'Password Reset Request - Grain Fusion';
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

    case 'email_verification':
      subject = 'Verify Your Email Address - Grain Fusion';
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Email Verification Required</h2>
          <p>You have updated your email address. Please verify your new email by entering the following OTP:</p>
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #9C27B0; letter-spacing: 5px; margin: 0;">${otp}</h1>
          </div>
          <p>This OTP will expire in ${process.env.OTP_EXPIRE_MINUTES || 10} minutes.</p>
          <p>Enter this code in your profile page to verify your email address.</p>
          <div style="background-color: #f0f4ff; padding: 15px; border-left: 4px solid #2196F3; margin: 20px 0;">
            <p style="margin: 0; color: #1565C0;">
              <strong>Important:</strong> Verifying your email ensures account security and helps you recover your account if needed.
            </p>
          </div>
          <p>If you didn't update your email, please contact support immediately.</p>
          <hr style="border: 1px solid #eee; margin: 20px 0;">
          <p style="color: #999; font-size: 12px;">This is an automated email. Please do not reply.</p>
        </div>
      `;
      break;
 
    default:
      throw new Error('Invalid OTP type');
  }
 
  const mailOptions = {
    from: `"${process.env.SMTP_FROM_NAME || 'Grain Fusion'}" <${process.env.SMTP_USER}>`,
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
  const fromName = process.env.SMTP_FROM_NAME || 'Grain Fusion';
  const from = `"${fromName}" <${process.env.SMTP_USER}>`;
  try {
    logger.debug('sending email', { to, subject });
    const info = await transporter.sendMail({ from, to, subject, html, headers: { 'X-Mailer': 'Grain Fusion' } });
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

// New: order shipped notification
async function sendOrderShippedEmail(order, userEmail, shipmentDetails) {
  const trackingInfo = shipmentDetails ? `
    <div style="background-color: #e7f5ff; padding: 15px; border-left: 4px solid #1971c2; margin: 20px 0;">
      <h3 style="margin: 0 0 10px; color: #1971c2;">Shipment Tracking Information</h3>
      <p style="margin: 5px 0;"><strong>Delivery Partner:</strong> ${shipmentDetails.deliveryPartner || 'N/A'}</p>
      <p style="margin: 5px 0;"><strong>Tracking Number:</strong> ${shipmentDetails.trackingNumber || 'N/A'}</p>
      ${shipmentDetails.estimatedDelivery ? `<p style="margin: 5px 0;"><strong>Estimated Delivery:</strong> ${shipmentDetails.estimatedDelivery}</p>` : ''}
      <p style="margin: 10px 0 0; font-size: 12px; color: #666;">You can use the tracking number above to track your shipment with the delivery partner.</p>
    </div>
  ` : '';
  
  const html = renderOrderHtml(order, `
    <h2 style="margin:0 0 8px;color:#1971c2;">Your Order Has Been Shipped! 🚚</h2>
    <p style="color: #666;">Great news! Your order is on its way to you.</p>
    ${trackingInfo}
  `);
  
  const admin = process.env.ADMIN_EMAIL;
  await Promise.all([
    sendMailSafe({ to: userEmail, subject: `Order Shipped - ${order.id}`, html }),
    admin ? sendMailSafe({ to: admin, subject: `Order Shipped - ${order.id}`, html }) : Promise.resolve(),
  ]);
}

// New: order delivered notification
async function sendOrderDeliveredEmail(order, userEmail) {
  const html = renderOrderHtml(order, `
    <h2 style="margin:0 0 8px;color:#16a34a;">Your Order Has Been Delivered! ✅</h2>
    <p style="color: #666;">We hope you enjoy your purchase! Thank you for shopping with us.</p>
    <div style="background-color: #f0fdf4; padding: 15px; border-left: 4px solid #16a34a; margin: 20px 0;">
      <p style="margin: 5px 0; color: #15803d;">If you have any issues with your order, please don't hesitate to contact our support team.</p>
      <p style="margin: 10px 0 0; font-size: 12px; color: #666;">We'd love to hear your feedback about your purchase!</p>
    </div>
  `);
  
  const admin = process.env.ADMIN_EMAIL;
  await Promise.all([
    sendMailSafe({ to: userEmail, subject: `Order Delivered - ${order.id}`, html }),
    admin ? sendMailSafe({ to: admin, subject: `Order Delivered - ${order.id}`, html }) : Promise.resolve(),
  ]);
}

// New: order processing notification
async function sendOrderProcessingEmail(order, userEmail) {
  const html = renderOrderHtml(order, `
    <h2 style="margin:0 0 8px;color:#ea580c;">Your Order Is Being Processed! 📦</h2>
    <p style="color: #666;">Good news! We've started preparing your order for shipment.</p>
    <div style="background-color: #fff7ed; padding: 15px; border-left: 4px solid #ea580c; margin: 20px 0;">
      <p style="margin: 5px 0; color: #c2410c;">Your order is being carefully packed and will be shipped soon.</p>
      <p style="margin: 10px 0 0; font-size: 12px; color: #666;">We'll send you another email with tracking information once your order is shipped.</p>
    </div>
  `);
  
  const admin = process.env.ADMIN_EMAIL;
  await Promise.all([
    sendMailSafe({ to: userEmail, subject: `Order Processing - ${order.id}`, html }),
    admin ? sendMailSafe({ to: admin, subject: `Order Processing - ${order.id}`, html }) : Promise.resolve(),
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

// Optional: simple test helper to verify SMTP to any target inbox
async function sendTestEmail(to, subject = 'SMTP Test', text = 'This is a test email from Grain Fusion') {
  const fromName = process.env.SMTP_FROM_NAME || 'Grain Fusion';
  const from = `"${fromName}" <${process.env.SMTP_USER}>`;
  return transporter.sendMail({ from, to, subject, text });
}

// Contact management emails
async function sendContactQueryCreatedEmails(queryDoc) {
  const admin = process.env.ADMIN_EMAIL;

  const userHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Hi ${queryDoc.name},</h2>
      <p>Thank you for contacting us. We have received your enquiry and will get back to you shortly.</p>
      <p><strong>Subject:</strong> ${queryDoc.subject}</p>
      <p><strong>Your Message:</strong></p>
      <div style="background-color:#f9f9f9;padding:12px;border-radius:4px;border:1px solid #eee;white-space:pre-line;">${queryDoc.message}</div>
      <p style="margin-top:16px;color:#777;font-size:12px;">This is an automated acknowledgement. Our team will review your enquiry.</p>
    </div>
  `;

  const adminHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color:#333;margin-bottom:8px;">New Contact Enquiry Received</h2>
      <p><strong>Name:</strong> ${queryDoc.name}</p>
      <p><strong>Email:</strong> ${queryDoc.email}</p>
      <p><strong>Phone:</strong> ${queryDoc.phone}</p>
      <p><strong>Subject:</strong> ${queryDoc.subject}</p>
      <p><strong>Message:</strong></p>
      <div style="background-color:#f9f9f9;padding:12px;border-radius:4px;border:1px solid #eee;white-space:pre-line;">${queryDoc.message}</div>
      <p style="margin-top:12px;color:#777;font-size:12px;">Contact Query ID: ${queryDoc.id || queryDoc._id}</p>
    </div>
  `;

  await Promise.all([
    sendMailSafe({
      to: queryDoc.email,
      subject: 'We have received your enquiry',
      html: userHtml,
    }),
    admin
      ? sendMailSafe({
          to: admin,
          subject: `New contact enquiry: ${queryDoc.subject}`,
          html: adminHtml,
        })
      : Promise.resolve(),
  ]);
}

async function sendContactQueryResponseEmail(queryDoc) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color:#333;">Response to Your Enquiry</h2>
      <p>Hi <strong>${queryDoc.name}</strong>,</p>
      <p>We have responded to your enquiry with the subject <strong>${queryDoc.subject}</strong>.</p>
      <p><strong>Your Original Message:</strong></p>
      <div style="background-color:#f9f9f9;padding:12px;border-radius:4px;border:1px solid #eee;white-space:pre-line;">${queryDoc.message}</div>
      <p style="margin-top:16px;"><strong>Our Response:</strong></p>
      <div style="background-color:#e8f5e9;padding:12px;border-radius:4px;border:1px solid #c8e6c9;white-space:pre-line;">${queryDoc.response || ''}</div>
      <p style="margin-top:16px;color:#777;font-size:12px;">If you have any further questions, you can reply to this email.</p>
    </div>
  `;

  await sendMailSafe({
    to: queryDoc.email,
    subject: `Response to your enquiry - ${queryDoc.subject}`,
    html,
  });
}

module.exports = {
  sendOTPEmail,
  sendOrderCreatedEmail,
  sendOrderCancelledEmail,
  sendOrderShippedEmail,
  sendOrderDeliveredEmail,
  sendOrderProcessingEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendTestEmail,
  sendContactQueryCreatedEmails,
  sendContactQueryResponseEmail,
};