// routes/users.js
const express = require('express');
const router = express.Router();
const { getAllUsers } = require('../controllers/adminUserController');

// Example admin middleware; adjust to your auth implementation
function requireAuth(req, res, next) {
  if (!req.user?._id) return res.status(401).json({ success: false, message: 'Unauthorized' });
  next();
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ success: false, message: 'Forbidden' });
  next();
}

// GET /users - admin only
router.get('/users', requireAuth, requireAdmin, getAllUsers);

module.exports = router;