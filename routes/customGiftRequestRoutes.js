const express = require('express');
const router = express.Router();
const customGiftRequestController = require('../controllers/customGiftRequestController');
const { protect, authorize } = require('../middleware/auth');

// User routes
router.post('/', protect, customGiftRequestController.submitCustomGiftRequest);
router.get('/my-requests', protect, customGiftRequestController.getUserCustomGiftRequests);
router.get('/my-requests/:id', protect, customGiftRequestController.getCustomGiftRequestById);

module.exports = router;

// Export admin routes separately
module.exports.adminRoutes = function() {
  const adminRouter = express.Router();
  adminRouter.get('/', protect, authorize('admin'), customGiftRequestController.getAllCustomGiftRequests);
  adminRouter.put('/:id', protect, authorize('admin'), customGiftRequestController.updateCustomGiftRequest);
  adminRouter.delete('/:id', protect, authorize('admin'), customGiftRequestController.deleteCustomGiftRequest);
  return adminRouter;
};
