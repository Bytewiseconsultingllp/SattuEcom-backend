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
 
module.exports = { sendOTPEmail };
 