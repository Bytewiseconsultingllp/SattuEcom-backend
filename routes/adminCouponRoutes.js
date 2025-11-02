const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { getAllCoupons, createCoupon, updateCoupon, deleteCoupon, toggleCouponStatus } = require('../controllers/adminCouponController');

router.get('/', protect, authorize('admin'), getAllCoupons);
router.post('/', protect, authorize('admin'), createCoupon);
router.put('/:id', protect, authorize('admin'), updateCoupon);
router.delete('/:id', protect, authorize('admin'), deleteCoupon);
router.patch('/:id/status', protect, authorize('admin'), toggleCouponStatus);

module.exports = router;