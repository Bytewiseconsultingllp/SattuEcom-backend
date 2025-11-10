const express = require('express');
const router = express.Router();
const giftDesignController = require('../controllers/giftDesignController');
const { protect, authorize } = require('../middleware/auth');

// Public routes
router.get('/active', giftDesignController.getActiveGiftDesigns);
router.get('/:id', giftDesignController.getGiftDesignById);

module.exports = router;

// Export admin routes separately
module.exports.adminRoutes = function() {
  const adminRouter = express.Router();
  adminRouter.get('/', protect, authorize('admin'), giftDesignController.getAllGiftDesigns);
  adminRouter.post('/', protect, authorize('admin'), giftDesignController.createGiftDesign);
  adminRouter.put('/:id', protect, authorize('admin'), giftDesignController.updateGiftDesign);
  adminRouter.delete('/:id', protect, authorize('admin'), giftDesignController.deleteGiftDesign);
  adminRouter.patch('/:id/status', protect, authorize('admin'), giftDesignController.toggleGiftDesignStatus);
  return adminRouter;
};
