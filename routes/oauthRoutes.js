const express = require('express');
const router = express.Router();
const passport = require('passport');
const {
  oauthSuccess,
  oauthFailure,
  oauthApiSuccess,
  logout,
} = require('../controllers/oauthController');
 
/**
* @swagger
* /api/auth/google:
*   get:
*     summary: Initiate Google OAuth authentication
*     tags: [OAuth]
*     description: Redirects user to Google login page
*     responses:
*       302:
*         description: Redirect to Google OAuth
*/
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
  })
);
 
/**
* @swagger
* /api/auth/google/callback:
*   get:
*     summary: Google OAuth callback
*     tags: [OAuth]
*     description: Callback after Google authentication
*     responses:
*       302:
*         description: Redirect to frontend with token
*/
router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/api/auth/google/failure',
    session: true,
  }),
  oauthSuccess
);
 
router.get('/google/failure', oauthFailure);
 
/**
* @swagger
* /api/auth/facebook:
*   get:
*     summary: Initiate Facebook OAuth authentication
*     tags: [OAuth]
*     description: Redirects user to Facebook login page
*     responses:
*       302:
*         description: Redirect to Facebook OAuth
*/
router.get(
  '/facebook',
  passport.authenticate('facebook', {
    scope: ['email', 'public_profile'],
  })
);
 
/**
* @swagger
* /api/auth/facebook/callback:
*   get:
*     summary: Facebook OAuth callback
*     tags: [OAuth]
*     description: Callback after Facebook authentication
*     responses:
*       302:
*         description: Redirect to frontend with token
*/
router.get(
  '/facebook/callback',
  passport.authenticate('facebook', {
    failureRedirect: '/api/auth/facebook/failure',
    session: true,
  }),
  oauthSuccess
);
 
router.get('/facebook/failure', oauthFailure);
 
/**
* @swagger
* /api/auth/oauth/success:
*   get:
*     summary: Get OAuth user data
*     tags: [OAuth]
*     description: Returns user data and token in JSON format
*     responses:
*       200:
*         description: Authentication successful
*       401:
*         description: Not authenticated
*/
router.get('/oauth/success', oauthApiSuccess);
 
/**
* @swagger
* /api/auth/logout:
*   get:
*     summary: Logout OAuth user
*     tags: [OAuth]
*     responses:
*       200:
*         description: Logged out successfully
*/
router.get('/logout', logout);
 
module.exports = router;