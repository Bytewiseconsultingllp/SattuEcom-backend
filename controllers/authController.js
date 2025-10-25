const User = require('../models/User');
const OTP = require('../models/OTP');
const { generateToken } = require('../middleware/auth');
const { sendOTPEmail } = require('../utils/emailService');
const generateOTP = require('../utils/generateOTP');
 
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
 
    // Generate token
    const token = generateToken(user._id);
 
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
 
    // Generate token
    const token = generateToken(user._id);
 
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
  getProfile,
};