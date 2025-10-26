const { generateToken, generateRefreshToken } = require('../middleware/auth');
 
const oauthSuccess = async (req, res) => {
  try {
    if (!req.user) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/error?message=Authentication failed`);
    }
 
    const token = generateToken(req.user._id);
    const refreshToken = generateRefreshToken(req.user._id);

    // Save refresh token to user (rotating)
    try {
      req.user.refreshToken = refreshToken;
      await req.user.save();
    } catch (err) {
      // ignore save errors for redirect flow, but log
      console.error('Failed to save refresh token for OAuth user:', err);
    }

    const frontendURL = process.env.FRONTEND_URL || 'http://localhost:3000';

    // NOTE: placing tokens in query params is how the project previously did it for access tokens.
    res.redirect(`${frontendURL}/auth/success?token=${token}&refreshToken=${refreshToken}`);
  } catch (error) {
    console.error('OAuth Success Error:', error);
    const frontendURL = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendURL}/auth/error?message=Something went wrong`);
  }
};
 
const oauthFailure = (req, res) => {
  const frontendURL = process.env.FRONTEND_URL || 'http://localhost:3000';
  res.redirect(`${frontendURL}/auth/error?message=Authentication failed`);
};
 
const oauthApiSuccess = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
    }
 
    const token = generateToken(req.user._id);
    const refreshToken = generateRefreshToken(req.user._id);

    // Save refresh token to user
    try {
      req.user.refreshToken = refreshToken;
      await req.user.save();
    } catch (err) {
      console.error('Failed to save refresh token for OAuth user:', err);
    }

    res.status(200).json({
      success: true,
      message: 'Authentication successful',
      data: {
        user: {
          id: req.user._id,
          name: req.user.name,
          email: req.user.email,
          phone: req.user.phone,
          role: req.user.role,
          isVerified: req.user.isVerified,
          authProvider: req.user.authProvider,
          profileImage: req.user.profileImage,
        },
        token,
        refreshToken,
      },
    });
  } catch (error) {
    console.error('OAuth API Success Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};
 
const logout = (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Logout failed',
      });
    }
    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  });
};
 
module.exports = {
  oauthSuccess,
  oauthFailure,
  oauthApiSuccess,
  logout,
};
 