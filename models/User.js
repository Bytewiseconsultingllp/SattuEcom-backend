const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
 
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
      maxlength: [50, 'Name cannot be more than 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email',
      ],
    },
    password: {
      type: String,
      required: function() {
        return !this.authProvider || this.authProvider === 'local';
      },
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Don't return password by default
    },
    phone: {
      type: String,
      default: null,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      enum: ['user', 'admin', 'manager'],
      default: 'user',
    },
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      zipCode: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    authProvider: {
      type: String,
      enum: ['local', 'google', 'facebook'],
      default: 'local',
    },
    providerId: {
      type: String,
      default: null,
    },
    profileImage: {
      type: String,
      default: null,
    },
    // Store current refresh token (rotating refresh tokens)
    refreshToken: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Virtual for user's addresses (one-to-many)
userSchema.virtual('addresses', {
  ref: 'Address', // The model to use
  localField: '_id', // Find addresses where `localField`
  foreignField: 'user_id', // is equal to `foreignField`
  justOne: false,
});

// Ensure virtuals are included when converting to JSON / Objects
userSchema.set('toObject', { virtuals: true });
userSchema.set('toJSON', { virtuals: true });
 
// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});
 
// Compare password method
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};
 
module.exports = mongoose.model('User', userSchema);