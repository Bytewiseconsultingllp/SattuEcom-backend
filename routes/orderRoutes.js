const express = require('express');
const router = express.Router();
const {
  getOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  getAllOrders,
  cancelOrder,
  getOrderConfirmation,
} = require('../controllers/orderController');
const { protect } = require('../middleware/auth');
 
// All order routes require authentication
router.use(protect);
 
/**
* @swagger
* components:
*   schemas:
*     OrderItem:
*       type: object
*       properties:
*         id:
*           type: string
*         order_id:
*           type: string
*         product_id:
*           type: string
*         quantity:
*           type: integer
*         price:
*           type: number
*         created_at:
*           type: string
*           format: date-time
*         product:
*           $ref: '#/components/schemas/Product'
*     
*     Order:
*       type: object
*       properties:
*         id:
*           type: string
*         user_id:
*           type: string
*         total_amount:
*           type: number
*         status:
*           type: string
*           enum: [pending, processing, shipped, delivered, cancelled]
*         shipping_address_id:
*           type: string
*         created_at:
*           type: string
*           format: date-time
*         updated_at:
*           type: string
*           format: date-time
*         order_items:
*           type: array
*           items:
*             $ref: '#/components/schemas/OrderItem'
*         shipping_address:
*           $ref: '#/components/schemas/Address'
*/
 
/**
* @swagger
* /api/orders:
*   get:
*     summary: Get all orders for logged-in user with full details
*     tags: [Orders]
*     security:
*       - bearerAuth: []
*     responses:
*       200:
*         description: List of orders with nested order items, products, and shipping address
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
*                     $ref: '#/components/schemas/Order'
*       401:
*         description: Unauthorized
*/
router.get('/', getOrders);
 
/**
* @swagger
* /api/orders/all:
*   get:
*     summary: Get all orders (Admin only)
*     tags: [Orders]
*     security:
*       - bearerAuth: []
*     responses:
*       200:
*         description: List of all orders with user info
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
*                     $ref: '#/components/schemas/Order'
*       401:
*         description: Unauthorized
*       403:
*         description: Forbidden - Admin only
*/
router.get('/all', getAllOrders);
 
/**
* @swagger
* /api/orders/{id}:
*   get:
*     summary: Get order by ID with full details
*     tags: [Orders]
*     security:
*       - bearerAuth: []
*     parameters:
*       - in: path
*         name: id
*         required: true
*         schema:
*           type: string
*         description: Order ID
*     responses:
*       200:
*         description: Order details with nested order items, products, and shipping address
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 success:
*                   type: boolean
*                 data:
*                   $ref: '#/components/schemas/Order'
*       404:
*         description: Order not found
*       401:
*         description: Unauthorized
*/
router.get('/:id', getOrderById);

/**
* @swagger
* /api/orders/{id}/confirmation:
*   get:
*     summary: Get order confirmation with accurate payment summary
*     tags: [Orders]
*     security:
*       - bearerAuth: []
*     parameters:
*       - in: path
*         name: id
*         required: true
*         schema:
*           type: string
*         description: Order ID
*     responses:
*       200:
*         description: Order confirmation with accurate payment summary
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 success:
*                   type: boolean
*                 data:
*                   type: object
*       404:
*         description: Order not found
*       401:
*         description: Unauthorized
*/
router.get('/:id/confirmation', getOrderConfirmation);
 
/**
* @swagger
* /api/orders:
*   post:
*     summary: Create a new order
*     tags: [Orders]
*     security:
*       - bearerAuth: []
*     requestBody:
*       required: true
*       content:
*         application/json:
*           schema:
*             type: object
*             required:
*               - total_amount
*               - shipping_address_id
*               - items
*             properties:
*               total_amount:
*                 type: number
*                 description: Total order amount
*                 example: 149.99
*               shipping_address_id:
*                 type: string
*                 description: ID of the shipping address
*               items:
*                 type: array
*                 description: Array of order items
*                 items:
*                   type: object
*                   required:
*                     - product_id
*                     - quantity
*                     - price
*                   properties:
*                     product_id:
*                       type: string
*                     quantity:
*                       type: integer
*                       minimum: 1
*                     price:
*                       type: number
*     responses:
*       201:
*         description: Order created successfully (cart is cleared automatically)
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 success:
*                   type: boolean
*                 data:
*                   $ref: '#/components/schemas/Order'
*                 message:
*                   type: string
*       400:
*         description: Validation error
*       404:
*         description: Shipping address or product not found
*       401:
*         description: Unauthorized
*/
router.post('/', createOrder);
 
/**
* @swagger
* /api/orders/{id}/status:
*   patch:
*     summary: Update order status
*     tags: [Orders]
*     security:
*       - bearerAuth: []
*     parameters:
*       - in: path
*         name: id
*         required: true
*         schema:
*           type: string
*         description: Order ID
*     requestBody:
*       required: true
*       content:
*         application/json:
*           schema:
*             type: object
*             required:
*               - status
*             properties:
*               status:
*                 type: string
*                 enum: [pending, processing, shipped, delivered, cancelled]
*                 description: New order status
*     responses:
*       200:
*         description: Order status updated successfully
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 success:
*                   type: boolean
*                 data:
*                   $ref: '#/components/schemas/Order'
*       400:
*         description: Invalid status
*       404:
*         description: Order not found
*       401:
*         description: Unauthorized
*/
router.patch('/:id/status', updateOrderStatus);
 
/**
* @swagger
* /api/orders/{id}/cancel:
*   patch:
*     summary: Cancel order (only pending or processing orders)
*     tags: [Orders]
*     security:
*       - bearerAuth: []
*     parameters:
*       - in: path
*         name: id
*         required: true
*         schema:
*           type: string
*         description: Order ID
*     responses:
*       200:
*         description: Order cancelled successfully
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 success:
*                   type: boolean
*                 data:
*                   $ref: '#/components/schemas/Order'
*                 message:
*                   type: string
*       400:
*         description: Cannot cancel order with current status
*       404:
*         description: Order not found
*       401:
*         description: Unauthorized
*/
router.patch('/:id/cancel', cancelOrder);
 
module.exports = router;
 
 