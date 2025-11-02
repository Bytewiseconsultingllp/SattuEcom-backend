// controllers/adminUserController.js
const User = require('../models/User');

// GET /users  [admin only]
exports.getAllUsers = async (req, res, next) => {
  try {
    // Basic projection: only safe, needed fields
    const users = await User.find({}, 'name email role phone isVerified status createdAt')
      .sort({ createdAt: -1 })
      .lean();

    const data = users.map(u => ({
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      role: u.role,
      phone: u.phone,
      status: u.status,
      isVerified: u.isVerified,
      created_at: u.createdAt,
      createdAt: u.createdAt,
    }));

    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};