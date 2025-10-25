const { generateToken } = require('../middleware/auth');
 
const oauthSuccess = (req, res) => {
  try {
    if (!req.user) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/error?message=Authentication failed`);
    }
 
    const token = generateToken(req.user._id);
    const frontendURL = process.env.FRONTEND_URL || 'http://localhost:3000';
    
    res.redirect(`${frontendURL}/auth/success?token=${token}`);
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
 
const oauthApiSuccess = (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
    }
 
    const token = generateToken(req.user._id);
 
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
 