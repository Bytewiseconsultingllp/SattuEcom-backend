const express = require('express');
const router = express.Router();
const { getCategories, createCategory } = require('../controllers/categoryController');



// GET /categories
router.get('/categories', getCategories);

// POST /categories (admin only)
router.post('/categories', createCategory);

module.exports = router;