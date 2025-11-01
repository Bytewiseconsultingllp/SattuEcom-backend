const express = require('express');
const router = express.Router();
const { getCategories, createCategory } = require('../controllers/categoryController');

// Replace with your actual auth middlewares
function requireAuth(req, res, next) {
  if (!req.user?._id) return res.status(401).json({ success: false, message: 'Unauthorized' });
  next();
}
function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ success: false, message: 'Forbidden' });
  next();
}

// GET /categories
router.get('/categories', getCategories);

// POST /categories (admin only)
router.post('/categories', requireAuth, requireAdmin, createCategory);

module.exports = router;