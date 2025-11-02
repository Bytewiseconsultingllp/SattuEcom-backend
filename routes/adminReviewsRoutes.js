const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getAllReviews,
  toggleReviewVisibility,
  deleteReviewAsAdmin,
} = require('../controllers/adminReviewController');

/**
 * @swagger
 * /api/admin/reviews:
 *   get:
 *     summary: Get all reviews (admin only)
 *     tags: [Admin - Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: product_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: is_hidden
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: List of all reviews
 */
router.get('/', protect, authorize('admin'), getAllReviews);

/**
 * @swagger
 * /api/admin/reviews/{id}/visibility:
 *   patch:
 *     summary: Toggle review visibility (hide/show)
 *     tags: [Admin - Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               is_hidden:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Review visibility updated
 */
router.patch('/:id/visibility', protect, authorize('admin'), toggleReviewVisibility);

/**
 * @swagger
 * /api/admin/reviews/{id}:
 *   delete:
 *     summary: Delete any review (admin only)
 *     tags: [Admin - Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Review deleted successfully
 */
router.delete('/:id', protect, authorize('admin'), deleteReviewAsAdmin);

module.exports = router;