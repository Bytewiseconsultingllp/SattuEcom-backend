const express = require('express');
const router = express.Router();
const { getActiveCoupons, validateCoupon, applyCoupon } = require('../controllers/couponController');

router.get('/active', getActiveCoupons);
router.post('/validate', validateCoupon);
router.post('/apply', applyCoupon);

module.exports = router;