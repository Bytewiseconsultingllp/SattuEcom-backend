const express = require('express');
const router = express.Router();
const companySettingsController = require('../controllers/companySettingsController');
const { protect, authorize } = require('../middleware/auth');

// Get company settings (public)
router.get('/', companySettingsController.getCompanySettings);

// Update company settings (admin only)
router.put('/', protect, authorize('admin'), companySettingsController.updateCompanySettings);

module.exports = router;
