// controllers/adminUserController.js
const User = require('../models/User');

// GET /users  [admin only]
// ✅ UPDATED: Added pagination support
exports.getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search = '', role = 'all' } = req.query;

    // ✅ Pagination
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10)); // Max 100 per page
    const skip = (pageNum - 1) * limitNum;

    // ✅ Build search query
    let query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    if (role && role !== 'all') {
      query.role = role;
    }

    // Get total count
    const total = await User.countDocuments(query);

    // Basic projection: only safe, needed fields
    const users = await User.find(query, 'name email role phone isVerified status createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
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

    return res.status(200).json({
      success: true,
      count: data.length,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
      data
    });
  } catch (err) {
    next(err);
  }
};