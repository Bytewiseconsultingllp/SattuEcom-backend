const express = require('express');
const router = express.Router();
const { getHealth } = require('../controllers/healthController');

// GET /health -> basic health check
router.get('/', getHealth);

module.exports = router;
