const express = require('express');
const router = express.Router();
const {
  register,
  verifyRegistration,
  login,
  verifyLogin,
  forgotPassword,
  resendOTP,
  resetPassword,
  profile,
  updateProfile,
  changePassword,
  sendEmailVerification,
  verifyEmail,
  refreshToken,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
 
/**
* @swagger
* components:
*   schemas:
*     User:
*       type: object
*       properties:
*         id:
*           type: string
*         name:
*           type: string
*         email:
*           type: string
*         phone:
*           type: string
*         role:
*           type: string
*         isVerified:
*           type: boolean
*     SuccessResponse:
*       type: object
*       properties:
*         success:
*           type: boolean
*         message:
*           type: string
*         data:
*           type: object
*     ErrorResponse:
*       type: object
*       properties:
*         success:
*           type: boolean
*         message:
*           type: string
*/
 
/**
* @swagger
* /api/auth/register:
*   post:
*     summary: Register a new user (Step 1 - Sends OTP to email)
*     tags: [Authentication]
*     requestBody:
*       required: true
*       content:
*         application/json:
*           schema:
*             type: object
*             required:
*               - name
*               - email
*               - password
*             properties:
*               name:
*                 type: string
*                 example: John Doe
*               email:
*                 type: string
*                 example: john@example.com
*               password:
*                 type: string
*                 example: password123
*               phone:
*                 type: string
*                 example: +1234567890
*     responses:
*       200:
*         description: OTP sent successfully
*         content:
*           application/json:
*             schema:
*               $ref: '#/components/schemas/SuccessResponse'
*       400:
*         description: Bad request
*         content:
*           application/json:
*             schema:
*               $ref: '#/components/schemas/ErrorResponse'
*/
router.post('/register', register);
 
/**
* @swagger
* /api/auth/verify-registration:
*   post:
*     summary: Verify OTP and complete registration (Step 2)
*     tags: [Authentication]
*     requestBody:
*       required: true
*       content:
*         application/json:
*           schema:
*             type: object
*             required:
*               - email
*               - otp
*               - name
*               - password
*             properties:
*               email:
*                 type: string
*                 example: john@example.com
*               otp:
*                 type: string
*                 example: "123456"
*               name:
*                 type: string
*                 example: John Doe
*               password:
*                 type: string
*                 example: password123
*               phone:
*                 type: string
*                 example: +1234567890
*     responses:
*       201:
*         description: Registration successful
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 success:
*                   type: boolean
*                 message:
*                   type: string
*                 data:
*                   type: object
*                   properties:
*                     user:
*                       $ref: '#/components/schemas/User'
*                     token:
*                       type: string
*       400:
*         description: Invalid or expired OTP
*         content:
*           application/json:
*             schema:
*               $ref: '#/components/schemas/ErrorResponse'
*/
router.post('/verify-registration', verifyRegistration);
 
/**
* @swagger
* /api/auth/login:
*   post:
*     summary: Login user (Step 1 - Sends OTP to email)
*     tags: [Authentication]
*     requestBody:
*       required: true
*       content:
*         application/json:
*           schema:
*             type: object
*             required:
*               - email
*               - password
*             properties:
*               email:
*                 type: string
*                 example: john@example.com
*               password:
*                 type: string
*                 example: password123
*     responses:
*       200:
*         description: OTP sent successfully
*         content:
*           application/json:
*             schema:
*               $ref: '#/components/schemas/SuccessResponse'
*       401:
*         description: Invalid credentials
*         content:
*           application/json:
*             schema:
*               $ref: '#/components/schemas/ErrorResponse'
*/
router.post('/login', login);
 
/**
* @swagger
* /api/auth/verify-login:
*   post:
*     summary: Verify OTP and complete login (Step 2)
*     tags: [Authentication]
*     requestBody:
*       required: true
*       content:
*         application/json:
*           schema:
*             type: object
*             required:
*               - email
*               - otp
*             properties:
*               email:
*                 type: string
*                 example: john@example.com
*               otp:
*                 type: string
*                 example: "123456"
*     responses:
*       200:
*         description: Login successful
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 success:
*                   type: boolean
*                 message:
*                   type: string
*                 data:
*                   type: object
*                   properties:
*                     user:
*                       $ref: '#/components/schemas/User'
*                     token:
*                       type: string
*       400:
*         description: Invalid or expired OTP
*         content:
*           application/json:
*             schema:
*               $ref: '#/components/schemas/ErrorResponse'
*/
router.post('/verify-login', verifyLogin);
 
/**
* @swagger
* /api/auth/forgot-password:
*   post:
*     summary: Request password reset (Sends OTP to email)
*     tags: [Authentication]
*     requestBody:
*       required: true
*       content:
*         application/json:
*           schema:
*             type: object
*             required:
*               - email
*             properties:
*               email:
*                 type: string
*                 example: john@example.com
*     responses:
*       200:
*         description: OTP sent successfully
*         content:
*           application/json:
*             schema:
*               $ref: '#/components/schemas/SuccessResponse'
*       404:
*         description: User not found
*         content:
*           application/json:
*             schema:
*               $ref: '#/components/schemas/ErrorResponse'
*/
router.post('/forgot-password', forgotPassword);

/**
 * Resend OTP
 * POST /api/auth/resend-otp
 * body: { email, type }
 */
router.post('/resend-otp', resendOTP);
 
/**
 * Refresh access token
 * POST /api/auth/refresh-token
 * body: { refreshToken }
 */
router.post('/refresh-token', refreshToken);
 
/**
* @swagger
* /api/auth/reset-password:
*   post:
*     summary: Reset password with OTP
*     tags: [Authentication]
*     requestBody:
*       required: true
*       content:
*         application/json:
*           schema:
*             type: object
*             required:
*               - email
*               - otp
*               - newPassword
*             properties:
*               email:
*                 type: string
*                 example: john@example.com
*               otp:
*                 type: string
*                 example: "123456"
*               newPassword:
*                 type: string
*                 example: newPassword123
*     responses:
*       200:
*         description: Password reset successful
*         content:
*           application/json:
*             schema:
*               $ref: '#/components/schemas/SuccessResponse'
*       400:
*         description: Invalid or expired OTP
*         content:
*           application/json:
*             schema:
*               $ref: '#/components/schemas/ErrorResponse'
*/
router.post('/reset-password', resetPassword);
 
/**
* @swagger
* /api/auth/profile:
*   get:
*     summary: Get user profile
*     tags: [Authentication]
*     security:
*       - bearerAuth: []
*     responses:
*       200:
*         description: Profile retrieved successfully
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 success:
*                   type: boolean
*                 data:
*                   $ref: '#/components/schemas/User'
*       401:
*         description: Not authorized
*         content:
*           application/json:
*             schema:
*               $ref: '#/components/schemas/ErrorResponse'
*/
router.get('/profile/:userId', profile);

/**
* @swagger
* /api/auth/profile/{userId}:
*   put:
*     summary: Update user profile
*     tags: [Authentication]
*     security:
*       - bearerAuth: []
*     parameters:
*       - in: path
*         name: userId
*         required: true
*         schema:
*           type: string
*         description: User ID
*     requestBody:
*       required: true
*       content:
*         application/json:
*           schema:
*             type: object
*             properties:
*               name:
*                 type: string
*                 example: John Doe
*               phone:
*                 type: string
*                 example: +1234567890
*               email:
*                 type: string
*                 example: john@example.com
*     responses:
*       200:
*         description: Profile updated successfully
*       401:
*         description: Not authorized
*       403:
*         description: Forbidden - can only update own profile
*/
router.put('/profile/:userId', protect, updateProfile);

/**
* @swagger
* /api/auth/change-password:
*   put:
*     summary: Change user password
*     tags: [Authentication]
*     security:
*       - bearerAuth: []
*     requestBody:
*       required: true
*       content:
*         application/json:
*           schema:
*             type: object
*             required:
*               - currentPassword
*               - newPassword
*             properties:
*               currentPassword:
*                 type: string
*                 example: oldPassword123
*               newPassword:
*                 type: string
*                 example: newPassword123
*     responses:
*       200:
*         description: Password changed successfully
*       401:
*         description: Current password is incorrect
*/
router.put('/change-password', protect, changePassword);

/**
* @swagger
* /api/auth/send-email-verification:
*   post:
*     summary: Send email verification OTP
*     tags: [Authentication]
*     security:
*       - bearerAuth: []
*     responses:
*       200:
*         description: Verification email sent successfully
*       400:
*         description: Email is already verified
*/
router.post('/send-email-verification', protect, sendEmailVerification);

/**
* @swagger
* /api/auth/verify-email:
*   post:
*     summary: Verify email with OTP
*     tags: [Authentication]
*     security:
*       - bearerAuth: []
*     requestBody:
*       required: true
*       content:
*         application/json:
*           schema:
*             type: object
*             required:
*               - otp
*             properties:
*               otp:
*                 type: string
*                 example: "123456"
*     responses:
*       200:
*         description: Email verified successfully
*       400:
*         description: Invalid or expired OTP
*/
router.post('/verify-email', protect, verifyEmail);

module.exports = router;