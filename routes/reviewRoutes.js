const express = require('express');
const router = express.Router();
const {
  getProductReviews,
  getUserReviews,
  createReview,
  updateReview,
  deleteReview,
  hasUserReviewed,
} = require('../controllers/reviewController');
const { protect } = require('../middleware/auth');
 
/**
* @swagger
* components:
*   schemas:
*     Review:
*       type: object
*       properties:
*         id:
*           type: string
*         user_id:
*           type: string
*         product_id:
*           type: string
*         rating:
*           type: integer
*           minimum: 1
*           maximum: 5
*         comment:
*           type: string
*         created_at:
*           type: string
*           format: date-time
*         updated_at:
*           type: string
*           format: date-time
*         user:
*           type: object
*           properties:
*             full_name:
*               type: string
*/
 
/**
* @swagger
* /api/reviews/product/{productId}:
*   get:
*     summary: Get all reviews for a product
*     tags: [Reviews]
*     parameters:
*       - in: path
*         name: productId
*         required: true
*         schema:
*           type: string
*         description: Product ID
*     responses:
*       200:
*         description: List of reviews with user details
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 success:
*                   type: boolean
*                 count:
*                   type: integer
*                 data:
*                   type: array
*                   items:
*                     $ref: '#/components/schemas/Review'
*       404:
*         description: Product not found
*/
router.get('/product/:productId', getProductReviews);
 
/**
* @swagger
* /api/reviews/my-reviews:
*   get:
*     summary: Get all reviews by logged-in user
*     tags: [Reviews]
*     security:
*       - bearerAuth: []
*     responses:
*       200:
*         description: List of user's reviews with product info
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 success:
*                   type: boolean
*                 count:
*                   type: integer
*                 data:
*                   type: array
*                   items:
*                     $ref: '#/components/schemas/Review'
*       401:
*         description: Unauthorized
*/
router.get('/my-reviews', protect, getUserReviews);
 
/**
* @swagger
* /api/reviews/check:
*   get:
*     summary: Check if user has reviewed a product
*     tags: [Reviews]
*     security:
*       - bearerAuth: []
*     parameters:
*       - in: query
*         name: product_id
*         required: true
*         schema:
*           type: string
*         description: Product ID to check
*     responses:
*       200:
*         description: Review status
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 success:
*                   type: boolean
*                 data:
*                   type: object
*                   properties:
*                     hasReviewed:
*                       type: boolean
*                     reviewId:
*                       type: string
*                       nullable: true
*       400:
*         description: Product ID is required
*       401:
*         description: Unauthorized
*/
router.get('/check', protect, hasUserReviewed);
 
/**
* @swagger
* /api/reviews:
*   post:
*     summary: Create a new review
*     tags: [Reviews]
*     security:
*       - bearerAuth: []
*     requestBody:
*       required: true
*       content:
*         application/json:
*           schema:
*             type: object
*             required:
*               - product_id
*               - rating
*             properties:
*               product_id:
*                 type: string
*                 description: Product ID to review
*               rating:
*                 type: integer
*                 minimum: 1
*                 maximum: 5
*                 description: Rating from 1 to 5
*               comment:
*                 type: string
*                 description: Review comment (optional)
*     responses:
*       201:
*         description: Review created successfully (product rating updated)
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 success:
*                   type: boolean
*                 data:
*                   $ref: '#/components/schemas/Review'
*                 message:
*                   type: string
*       400:
*         description: Validation error or already reviewed
*       404:
*         description: Product not found
*       401:
*         description: Unauthorized
*/
router.post('/', protect, createReview);
 
/**
* @swagger
* /api/reviews/{id}:
*   put:
*     summary: Update a review
*     tags: [Reviews]
*     security:
*       - bearerAuth: []
*     parameters:
*       - in: path
*         name: id
*         required: true
*         schema:
*           type: string
*         description: Review ID
*     requestBody:
*       required: true
*       content:
*         application/json:
*           schema:
*             type: object
*             properties:
*               rating:
*                 type: integer
*                 minimum: 1
*                 maximum: 5
*               comment:
*                 type: string
*     responses:
*       200:
*         description: Review updated successfully (product rating updated)
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 success:
*                   type: boolean
*                 data:
*                   $ref: '#/components/schemas/Review'
*                 message:
*                   type: string
*       400:
*         description: Validation error
*       404:
*         description: Review not found
*       401:
*         description: Unauthorized
*/
router.put('/:id', protect, updateReview);
 
/**
* @swagger
* /api/reviews/{id}:
*   delete:
*     summary: Delete a review
*     tags: [Reviews]
*     security:
*       - bearerAuth: []
*     parameters:
*       - in: path
*         name: id
*         required: true
*         schema:
*           type: string
*         description: Review ID
*     responses:
*       200:
*         description: Review deleted successfully (product rating updated)
*       404:
*         description: Review not found
*       401:
*         description: Unauthorized
*/
router.delete('/:id', protect, deleteReview);
 
module.exports = router;
 