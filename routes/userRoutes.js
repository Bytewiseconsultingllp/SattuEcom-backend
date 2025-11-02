// routes/users.js
const express = require('express');
const router = express.Router();
const { getAllUsers } = require('../controllers/adminUserController');


// GET /users - admin only
router.get('/users', getAllUsers);

module.exports = router;