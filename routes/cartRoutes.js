const express = require('express');
const router = express.Router();
const {
  getCartItems,
  addToCart,
  updateCartItemQuantity,
  removeFromCart,
  clearCart,
  getCartSummary,
} = require('../controllers/cartController');
const { protect } = require('../middleware/auth');
 
// All cart routes require authentication
router.use(protect);
 
/**
* @swagger
* components:
*   schemas:
*     CartItem:
*       type: object
*       properties:
*         id:
*           type: string
*           description: Cart item ID
*         user_id:
*           type: string
*           description: User ID
*         product_id:
*           type: string
*           description: Product ID
*         quantity:
*           type: integer
*           minimum: 1
*           description: Quantity of the product
*         created_at:
*           type: string
*           format: date-time
*         updated_at:
*           type: string
*           format: date-time
*         product:
*           $ref: '#/components/schemas/Product'
*           description: Nested product details
*/
 
/**
* @swagger
* /api/cart:
*   get:
*     summary: Get all cart items with product details
*     tags: [Cart]
*     security:
*       - bearerAuth: []
*     responses:
*       200:
*         description: List of cart items with product details
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
*                     $ref: '#/components/schemas/CartItem'
*       401:
*         description: Unauthorized
*/
router.get('/', getCartItems);
 
/**
* @swagger
* /api/cart/summary:
*   get:
*     summary: Get cart summary (total items, total price)
*     tags: [Cart]
*     security:
*       - bearerAuth: []
*     responses:
*       200:
*         description: Cart summary
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
*                     totalItems:
*                       type: integer
*                     totalPrice:
*                       type: number
*                     itemCount:
*                       type: integer
*       401:
*         description: Unauthorized
*/
router.get('/summary', getCartSummary);
 
/**
* @swagger
* /api/cart:
*   post:
*     summary: Add item to cart or update quantity if exists
*     tags: [Cart]
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
*                 description: Product ID to add to cart
*               quantity:
*                 type: integer
*                 minimum: 1
*                 default: 1
*                 description: Quantity to add
*     responses:
*       201:
*         description: Item added to cart or quantity updated
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 success:
*                   type: boolean
*                 data:
*                   $ref: '#/components/schemas/CartItem'
*       400:
*         description: Validation error
*       404:
*         description: Product not found
*       401:
*         description: Unauthorized
*/
router.post('/', addToCart);
 
/**
* @swagger
* /api/cart/{id}:
*   put:
*     summary: Update cart item quantity
*     tags: [Cart]
*     security:
*       - bearerAuth: []
*     parameters:
*       - in: path
*         name: id
*         required: true
*         schema:
*           type: string
*         description: Cart item ID
*     requestBody:
*       required: true
*       content:
*         application/json:
*           schema:
*             type: object
*             required:
*               - quantity
*             properties:
*               quantity:
*                 type: integer
*                 minimum: 1
*                 description: New quantity
*     responses:
*       200:
*         description: Cart item quantity updated
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 success:
*                   type: boolean
*                 data:
*                   $ref: '#/components/schemas/CartItem'
*       400:
*         description: Validation error
*       404:
*         description: Cart item not found
*       401:
*         description: Unauthorized
*/
router.put('/:id', updateCartItemQuantity);
 
/**
* @swagger
* /api/cart/{id}:
*   delete:
*     summary: Remove item from cart
*     tags: [Cart]
*     security:
*       - bearerAuth: []
*     parameters:
*       - in: path
*         name: id
*         required: true
*         schema:
*           type: string
*         description: Cart item ID
*     responses:
*       200:
*         description: Item removed from cart
*       404:
*         description: Cart item not found
*       401:
*         description: Unauthorized
*/
router.delete('/:id', removeFromCart);
 
/**
* @swagger
* /api/cart/clear:
*   delete:
*     summary: Clear all cart items for user
*     tags: [Cart]
*     security:
*       - bearerAuth: []
*     responses:
*       200:
*         description: Cart cleared successfully
*       401:
*         description: Unauthorized
*/
router.delete('/clear/all', clearCart);
 
module.exports = router;
 