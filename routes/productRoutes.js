const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories,
} = require('../controllers/productController');
const { protect } = require('../middleware/auth');
 
/**
* @swagger
* components:
*   schemas:
*     Product:
*       type: object
*       required:
*         - name
*         - description
*         - price
*         - category
*         - image_url
*       properties:
*         id:
*           type: string
*           description: Auto-generated product ID
*         name:
*           type: string
*           description: Product name
*         description:
*           type: string
*           description: Product description
*         price:
*           type: number
*           description: Current price
*         original_price:
*           type: number
*           description: Original price (for discounts)
*         category:
*           type: string
*           description: Product category
*         image_url:
*           type: string
*           description: Product image URL
*         in_stock:
*           type: boolean
*           description: Stock availability
*           default: true
*         rating:
*           type: number
*           description: Product rating (0-5)
*           default: 0
*         reviews_count:
*           type: integer
*           description: Number of reviews
*           default: 0
*         benefits:
*           type: array
*           items:
*             type: string
*           description: Product benefits
*         ingredients:
*           type: string
*           description: Product ingredients
*         usage:
*           type: string
*           description: Usage instructions
*         created_at:
*           type: string
*           format: date-time
*           description: Creation timestamp
*         updated_at:
*           type: string
*           format: date-time
*           description: Last update timestamp
*/
 
/**
* @swagger
* /api/products:
*   get:
*     summary: Get all products with optional filters
*     tags: [Products]
*     parameters:
*       - in: query
*         name: category
*         schema:
*           type: string
*         description: Filter by category (use 'All Products' for no filter)
*       - in: query
*         name: minPrice
*         schema:
*           type: number
*         description: Minimum price filter
*       - in: query
*         name: maxPrice
*         schema:
*           type: number
*         description: Maximum price filter
*       - in: query
*         name: inStockOnly
*         schema:
*           type: boolean
*         description: Filter for in-stock products only
*     responses:
*       200:
*         description: List of products
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
*                     $ref: '#/components/schemas/Product'
*/
router.get('/', getProducts);
 
/**
* @swagger
* /api/products/categories:
*   get:
*     summary: Get all unique product categories
*     tags: [Products]
*     responses:
*       200:
*         description: List of categories
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 success:
*                   type: boolean
*                 data:
*                   type: array
*                   items:
*                     type: string
*/
router.get('/categories', getCategories);
 
/**
* @swagger
* /api/products/{id}:
*   get:
*     summary: Get product by ID
*     tags: [Products]
*     parameters:
*       - in: path
*         name: id
*         required: true
*         schema:
*           type: string
*         description: Product ID
*     responses:
*       200:
*         description: Product details
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 success:
*                   type: boolean
*                 data:
*                   $ref: '#/components/schemas/Product'
*       404:
*         description: Product not found
*/
router.get('/:id', getProductById);
 
/**
* @swagger
* /api/products:
*   post:
*     summary: Create a new product (Admin only)
*     tags: [Products]
*     security:
*       - bearerAuth: []
*     requestBody:
*       required: true
*       content:
*         application/json:
*           schema:
*             type: object
*             required:
*               - name
*               - description
*               - price
*               - category
*               - image_url
*             properties:
*               name:
*                 type: string
*               description:
*                 type: string
*               price:
*                 type: number
*               original_price:
*                 type: number
*               category:
*                 type: string
*               image_url:
*                 type: string
*               in_stock:
*                 type: boolean
*               rating:
*                 type: number
*               reviews_count:
*                 type: integer
*               benefits:
*                 type: array
*                 items:
*                   type: string
*               ingredients:
*                 type: string
*               usage:
*                 type: string
*     responses:
*       201:
*         description: Product created successfully
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 success:
*                   type: boolean
*                 data:
*                   $ref: '#/components/schemas/Product'
*       400:
*         description: Validation error
*       401:
*         description: Unauthorized
*/
router.post('/', protect, createProduct);
 
/**
* @swagger
* /api/products/{id}:
*   put:
*     summary: Update a product (Admin only)
*     tags: [Products]
*     security:
*       - bearerAuth: []
*     parameters:
*       - in: path
*         name: id
*         required: true
*         schema:
*           type: string
*         description: Product ID
*     requestBody:
*       required: true
*       content:
*         application/json:
*           schema:
*             type: object
*             properties:
*               name:
*                 type: string
*               description:
*                 type: string
*               price:
*                 type: number
*               original_price:
*                 type: number
*               category:
*                 type: string
*               image_url:
*                 type: string
*               in_stock:
*                 type: boolean
*               rating:
*                 type: number
*               reviews_count:
*                 type: integer
*               benefits:
*                 type: array
*                 items:
*                   type: string
*               ingredients:
*                 type: string
*               usage:
*                 type: string
*     responses:
*       200:
*         description: Product updated successfully
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 success:
*                   type: boolean
*                 data:
*                   $ref: '#/components/schemas/Product'
*       404:
*         description: Product not found
*       401:
*         description: Unauthorized
*/
router.put('/:id', protect, updateProduct);
 
/**
* @swagger
* /api/products/{id}:
*   delete:
*     summary: Delete a product (Admin only)
*     tags: [Products]
*     security:
*       - bearerAuth: []
*     parameters:
*       - in: path
*         name: id
*         required: true
*         schema:
*           type: string
*         description: Product ID
*     responses:
*       200:
*         description: Product deleted successfully
*       404:
*         description: Product not found
*       401:
*         description: Unauthorized
*/
router.delete('/:id', protect, deleteProduct);
 
module.exports = router;
 
 