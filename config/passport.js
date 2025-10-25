const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const User = require('../models/User');
 
passport.serializeUser((user, done) => {
  done(null, user.id);
});
 
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});
 
// Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ providerId: profile.id, authProvider: 'google' });
 
        if (user) {
          return done(null, user);
        }
 
        user = await User.findOne({ email: profile.emails[0].value });
 
        if (user) {
          user.authProvider = 'google';
          user.providerId = profile.id;
          user.profileImage = profile.photos && profile.photos[0] ? profile.photos[0].value : null;
          user.isVerified = true;
          await user.save();
          return done(null, user);
        }
 
        user = await User.create({
          name: profile.displayName,
          email: profile.emails[0].value,
          authProvider: 'google',
          providerId: profile.id,
          profileImage: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
          isVerified: true,
        });
 
        done(null, user);
      } catch (error) {
        console.error('Google OAuth Error:', error);
        done(error, null);
      }
    }
  )
);
 
// Facebook OAuth Strategy
passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: process.env.FACEBOOK_CALLBACK_URL || 'http://localhost:5000/api/auth/facebook/callback',
      profileFields: ['id', 'displayName', 'email', 'photos'],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ providerId: profile.id, authProvider: 'facebook' });
 
        if (user) {
          return done(null, user);
        }
 
        if (profile.emails && profile.emails[0]) {
          user = await User.findOne({ email: profile.emails[0].value });
 
          if (user) {
            user.authProvider = 'facebook';
            user.providerId = profile.id;
            user.profileImage = profile.photos && profile.photos[0] ? profile.photos[0].value : null;
            user.isVerified = true;
            await user.save();
            return done(null, user);
          }
        }
 
        user = await User.create({
          name: profile.displayName,
          email: profile.emails && profile.emails[0] ? profile.emails[0].value : `${profile.id}@facebook.com`,
          authProvider: 'facebook',
          providerId: profile.id,
          profileImage: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
          isVerified: true,
        });
 
        done(null, user);
      } catch (error) {
        console.error('Facebook OAuth Error:', error);
        done(error, null);
      }
    }
  )
);
 
module.exports = passport;