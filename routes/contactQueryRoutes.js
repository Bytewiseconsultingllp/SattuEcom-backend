const express = require('express');
const router = express.Router();
const contactQueryController = require('../controllers/contactQueryController');
const { protect, authorize } = require('../middleware/auth');

// Public routes
router.post('/', contactQueryController.createContactQuery);

// Admin routes
router.get('/', protect, authorize('admin'), contactQueryController.getContactQueries);
router.get('/stats', protect, authorize('admin'), contactQueryController.getContactQueryStats);
router.get('/:id', protect, authorize('admin'), contactQueryController.getContactQueryById);
router.put('/:id', protect, authorize('admin'), contactQueryController.updateContactQuery);
router.delete('/:id', protect, authorize('admin'), contactQueryController.deleteContactQuery);

module.exports = router;
