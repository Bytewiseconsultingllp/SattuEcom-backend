const express = require('express');
const router = express.Router();
const {
  getWishlistItems,
  addToWishlist,
  removeFromWishlist,
  isInWishlist,
  clearWishlist,
} = require('../controllers/wishlistController');
const { protect } = require('../middleware/auth');
 
// All wishlist routes require authentication
router.use(protect);
 
/**
* @swagger
* components:
*   schemas:
*     WishlistItem:
*       type: object
*       properties:
*         id:
*           type: string
*         user_id:
*           type: string
*         product_id:
*           type: string
*         created_at:
*           type: string
*           format: date-time
*         product:
*           $ref: '#/components/schemas/Product'
*/
 
/**
* @swagger
* /api/wishlist:
*   get:
*     summary: Get all wishlist items with product details
*     tags: [Wishlist]
*     security:
*       - bearerAuth: []
*     responses:
*       200:
*         description: List of wishlist items with full product details
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
*                     $ref: '#/components/schemas/WishlistItem'
*       401:
*         description: Unauthorized
*/
router.get('/', getWishlistItems);
 
/**
* @swagger
* /api/wishlist/check:
*   get:
*     summary: Check if product is in wishlist
*     tags: [Wishlist]
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
*         description: Wishlist status
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
*                     inWishlist:
*                       type: boolean
*                     itemId:
*                       type: string
*                       nullable: true
*       400:
*         description: Product ID is required
*       401:
*         description: Unauthorized
*/
router.get('/check', isInWishlist);
 
/**
* @swagger
* /api/wishlist:
*   post:
*     summary: Add product to wishlist
*     tags: [Wishlist]
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
*             properties:
*               product_id:
*                 type: string
*                 description: Product ID to add to wishlist
*     responses:
*       201:
*         description: Product added to wishlist
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 success:
*                   type: boolean
*                 data:
*                   $ref: '#/components/schemas/WishlistItem'
*                 message:
*                   type: string
*       400:
*         description: Product already in wishlist or validation error
*       404:
*         description: Product not found
*       401:
*         description: Unauthorized
*/
router.post('/', addToWishlist);
 
/**
* @swagger
* /api/wishlist/{id}:
*   delete:
*     summary: Remove item from wishlist
*     tags: [Wishlist]
*     security:
*       - bearerAuth: []
*     parameters:
*       - in: path
*         name: id
*         required: true
*         schema:
*           type: string
*         description: Wishlist item ID
*     responses:
*       200:
*         description: Product removed from wishlist
*       404:
*         description: Wishlist item not found
*       401:
*         description: Unauthorized
*/
router.delete('/:id', removeFromWishlist);
 
/**
* @swagger
* /api/wishlist/clear:
*   delete:
*     summary: Clear entire wishlist
*     tags: [Wishlist]
*     security:
*       - bearerAuth: []
*     responses:
*       200:
*         description: Wishlist cleared successfully
*       401:
*         description: Unauthorized
*/
router.delete('/clear/all', clearWishlist);
 
module.exports = router;
 
 
 