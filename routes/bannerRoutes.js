const express = require('express');
const router = express.Router();
const bannerController = require('../controllers/bannerController');
const { protect, authorize } = require('../middleware/auth');

// Public routes
router.get('/', bannerController.getBanners);
router.get('/:id', bannerController.getBannerById);

// Admin routes
router.post('/', protect, authorize('admin'), bannerController.createBanner);
router.put('/:id', protect, authorize('admin'), bannerController.updateBanner);
router.delete('/:id', protect, authorize('admin'), bannerController.deleteBanner);

module.exports = router;
