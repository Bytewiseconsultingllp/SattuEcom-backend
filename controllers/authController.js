const User = require('../models/User');
const OTP = require('../models/OTP');
const jwt = require('jsonwebtoken');
const { generateToken, generateRefreshToken } = require('../middleware/auth');
const { sendOTPEmail } = require('../utils/emailService');
const generateOTP = require('../utils/generateOTP');
 
/**
 * @desc    Refresh access token using refresh token
 * @route   POST /api/auth/refresh-token
 * @access  Public
 */
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token is required' });
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'User account is deactivated' });
    }

    // Ensure the refresh token matches the one stored (rotating)
    if (!user.refreshToken || user.refreshToken !== refreshToken) {
      return res.status(401).json({ success: false, message: 'Refresh token mismatch' });
    }

    // Generate new tokens
    const newToken = generateToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    // Save new refresh token
    user.refreshToken = newRefreshToken;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Token refreshed',
      data: {
        token: newToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};
/**
* @desc    Register a new user (Step 1 - Send OTP)
* @route   POST /api/auth/register
* @access  Public
*/
const register = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and password',
      });
    }
 
    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email',
      });
    }
 
    // Generate OTP
    const otp = generateOTP();
    const otpExpiry = new Date(
      Date.now() + (process.env.OTP_EXPIRE_MINUTES || 10) * 60 * 1000
    );
 
    // Delete any existing OTPs for this email and type
    await OTP.deleteMany({ email, type: 'registration' });
 
    // Save OTP to database
    await OTP.create({
      email,
      otp,
      type: 'registration',
      expiresAt: otpExpiry,
    });
 
    // Store user data temporarily (we'll create the user after OTP verification)
    // For now, we'll just send the OTP
    await sendOTPEmail(email, otp, 'registration');
 
    res.status(200).json({
      success: true,
      message: 'OTP sent to your email. Please verify to complete registration.',
      data: {
        email,
        expiresIn: `${process.env.OTP_EXPIRE_MINUTES || 10} minutes`,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};
 
/**
 * @desc    Resend OTP for a given email and type (registration, login, password_reset)
 * @route   POST /api/auth/resend-otp
 * @access  Public
 */
const resendOTP = async (req, res) => {
  try {
    const { email, type } = req.body;

    // Validate input
    if (!email || !type) {
      return res.status(400).json({ success: false, message: 'Please provide email and type' });
    }

    const allowedTypes = ['registration', 'login', 'password_reset'];
    if (!allowedTypes.includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid type. Must be one of registration, login, password_reset' });
    }

    // For login and password_reset ensure user exists
    if (type === 'login' || type === 'password_reset') {
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({ success: false, message: 'No user found with this email' });
      }
      if (!user.isActive) {
        return res.status(403).json({ success: false, message: 'Account is deactivated' });
      }
    }

    // Rate limit: avoid frequent resends
    const resendIntervalSeconds = parseInt(process.env.OTP_RESEND_INTERVAL_SECONDS || '60', 10);
    const recent = await OTP.findOne({ email, type, isUsed: false }).sort({ createdAt: -1 });
    if (recent) {
      const ageMs = Date.now() - new Date(recent.createdAt).getTime();
      if (ageMs < resendIntervalSeconds * 1000) {
        const wait = Math.ceil((resendIntervalSeconds * 1000 - ageMs) / 1000);
        return res.status(429).json({ success: false, message: `Please wait ${wait} seconds before requesting a new OTP` });
      }
    }

    // Generate new OTP
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + (process.env.OTP_EXPIRE_MINUTES || 10) * 60 * 1000);

    // Delete existing (unused) OTPs for this email and type
    await OTP.deleteMany({ email, type });

    // Save new OTP
    await OTP.create({ email, otp, type, expiresAt: otpExpiry });

    // Send email
    await sendOTPEmail(email, otp, type);

    return res.status(200).json({
      success: true,
      message: 'OTP resent to your email',
      data: { email, expiresIn: `${process.env.OTP_EXPIRE_MINUTES || 10} minutes` },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

/**
* @desc    Verify OTP and complete registration (Step 2)
* @route   POST /api/auth/verify-registration
* @access  Public
*/
const verifyRegistration = async (req, res) => {
  try {
    const { email, otp, name, password, phone } = req.body;
 
    // Validate input
    if (!email || !otp || !name || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email, OTP, name, and password',
      });
    }
 
    // Find OTP
    const otpRecord = await OTP.findOne({
      email,
      otp,
      type: 'registration',
      isUsed: false,
      expiresAt: { $gt: Date.now() },
    });
 
    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP',
      });
    }
 
    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists',
      });
    }
 
    // Create user
    const user = await User.create({
      name,
      email,
      password,
      phone,
      isVerified: true,
    });
 
    // Mark OTP as used
    otpRecord.isUsed = true;
    await otpRecord.save();
 
  // Generate token and refresh token
  const token = generateToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  // Save refresh token to user (rotating)
  user.refreshToken = refreshToken;
  await user.save();
 
    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          isVerified: user.isVerified,
        },
        token,
        refreshToken,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};
 
/**
* @desc    Login user (Step 1 - Send OTP)
* @route   POST /api/auth/login
* @access  Public
*/
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
 
    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }
 
    // Check if user exists
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }
 
    // Check password
    const isPasswordMatch = await user.matchPassword(password);
    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }
 
    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated',
      });
    }
 
    // Generate OTP
    const otp = generateOTP();
    const otpExpiry = new Date(
      Date.now() + (process.env.OTP_EXPIRE_MINUTES || 10) * 60 * 1000
    );
 
    // Delete any existing OTPs for this email and type
    await OTP.deleteMany({ email, type: 'login' });
 
    // Save OTP to database
    await OTP.create({
      email,
      otp,
      type: 'login',
      expiresAt: otpExpiry,
    });
 
    // Send OTP email
    await sendOTPEmail(email, otp, 'login');
 
    res.status(200).json({
      success: true,
      message: 'OTP sent to your email. Please verify to complete login.',
      data: {
        email,
        expiresIn: `${process.env.OTP_EXPIRE_MINUTES || 10} minutes`,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};
 
/**
* @desc    Verify OTP and complete login (Step 2)
* @route   POST /api/auth/verify-login
* @access  Public
*/
const verifyLogin = async (req, res) => {
  try {
    const { email, otp } = req.body;
 
    // Validate input
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and OTP',
      });
    }
 
    // Find OTP
    const otpRecord = await OTP.findOne({
      email,
      otp,
      type: 'login',
      isUsed: false,
      expiresAt: { $gt: Date.now() },
    });
 
    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP',
      });
    }
 
    // Get user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
 
    // Mark OTP as used
    otpRecord.isUsed = true;
    await otpRecord.save();
 
    // Generate token and refresh token
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Save refresh token to user (rotating)
    user.refreshToken = refreshToken;
    await user.save();
 
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          isVerified: user.isVerified,
        },
        token,
        refreshToken,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};
 
/**
* @desc    Forgot password - Send OTP
* @route   POST /api/auth/forgot-password
* @access  Public
*/
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
 
    // Validate input
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email',
      });
    }
 
    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No user found with this email',
      });
    }
 
    // Generate OTP
    const otp = generateOTP();
    const otpExpiry = new Date(
      Date.now() + (process.env.OTP_EXPIRE_MINUTES || 10) * 60 * 1000
    );
 
    // Delete any existing OTPs for this email and type
    await OTP.deleteMany({ email, type: 'password_reset' });
 
    // Save OTP to database
    await OTP.create({
      email,
      otp,
      type: 'password_reset',
      expiresAt: otpExpiry,
    });
 
    // Send OTP email
    await sendOTPEmail(email, otp, 'password_reset');
 
    res.status(200).json({
      success: true,
      message: 'OTP sent to your email for password reset.',
      data: {
        email,
        expiresIn: `${process.env.OTP_EXPIRE_MINUTES || 10} minutes`,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};
 
/**
* @desc    Reset password with OTP
* @route   POST /api/auth/reset-password
* @access  Public
*/
const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
 
    // Validate input
    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email, OTP, and new password',
      });
    }
 
    // Validate password length
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters',
      });
    }
 
    // Find OTP
    const otpRecord = await OTP.findOne({
      email,
      otp,
      type: 'password_reset',
      isUsed: false,
      expiresAt: { $gt: Date.now() },
    });
 
    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP',
      });
    }
 
    // Get user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
 
    // Update password
    user.password = newPassword;
    await user.save();
 
    // Mark OTP as used
    otpRecord.isUsed = true;
    await otpRecord.save();
 
    res.status(200).json({
      success: true,
      message: 'Password reset successful. You can now login with your new password.',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};
 
/**
* @desc    Get user profile
* @route   GET /api/auth/profile
* @access  Private
*/
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
 
    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isVerified: user.isVerified,
        address: user.address,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};
 
module.exports = {
  register,
  verifyRegistration,
  login,
  verifyLogin,
  forgotPassword,
  resetPassword,
  resendOTP,
  getProfile,
  refreshToken,
};