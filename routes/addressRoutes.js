const express = require('express');
const router = express.Router();
const {
  getAddresses,
  getAddressById,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} = require('../controllers/addressController');
const { protect } = require('../middleware/auth');
 
// All address routes require authentication
router.use(protect);
 
/**
* @swagger
* components:
*   schemas:
*     Address:
*       type: object
*       required:
*         - label
*         - full_name
*         - phone
*         - address_line1
*         - city
*         - state
*         - postal_code
*       properties:
*         id:
*           type: string
*           description: Auto-generated address ID
*         user_id:
*           type: string
*           description: User ID (auto-assigned from JWT)
*         label:
*           type: string
*           enum: [Home, Work, Other]
*           description: Address label
*         full_name:
*           type: string
*           description: Full name for delivery
*         phone:
*           type: string
*           description: Contact phone number
*         address_line1:
*           type: string
*           description: Address line 1
*         address_line2:
*           type: string
*           description: Address line 2 (optional)
*         city:
*           type: string
*           description: City
*         state:
*           type: string
*           description: State
*         postal_code:
*           type: string
*           description: Postal/ZIP code
*         country:
*           type: string
*           default: India
*           description: Country
*         is_default:
*           type: boolean
*           default: false
*           description: Is this the default address
*         created_at:
*           type: string
*           format: date-time
*         updated_at:
*           type: string
*           format: date-time
*/
 
/**
* @swagger
* /api/addresses:
*   get:
*     summary: Get all addresses for logged-in user
*     tags: [Addresses]
*     security:
*       - bearerAuth: []
*     responses:
*       200:
*         description: List of addresses
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
*                     $ref: '#/components/schemas/Address'
*       401:
*         description: Unauthorized
*/
router.get('/', getAddresses);
 
/**
* @swagger
* /api/addresses/{id}:
*   get:
*     summary: Get address by ID
*     tags: [Addresses]
*     security:
*       - bearerAuth: []
*     parameters:
*       - in: path
*         name: id
*         required: true
*         schema:
*           type: string
*         description: Address ID
*     responses:
*       200:
*         description: Address details
*       404:
*         description: Address not found
*       401:
*         description: Unauthorized
*/
router.get('/:id', getAddressById);
 
/**
* @swagger
* /api/addresses:
*   post:
*     summary: Create a new address
*     tags: [Addresses]
*     security:
*       - bearerAuth: []
*     requestBody:
*       required: true
*       content:
*         application/json:
*           schema:
*             type: object
*             required:
*               - label
*               - full_name
*               - phone
*               - address_line1
*               - city
*               - state
*               - postal_code
*             properties:
*               label:
*                 type: string
*                 enum: [Home, Work, Other]
*               full_name:
*                 type: string
*               phone:
*                 type: string
*               address_line1:
*                 type: string
*               address_line2:
*                 type: string
*               city:
*                 type: string
*               state:
*                 type: string
*               postal_code:
*                 type: string
*               country:
*                 type: string
*                 default: India
*               is_default:
*                 type: boolean
*     responses:
*       201:
*         description: Address created successfully
*       400:
*         description: Validation error
*       401:
*         description: Unauthorized
*/
router.post('/', createAddress);
 
/**
* @swagger
* /api/addresses/{id}:
*   put:
*     summary: Update an address
*     tags: [Addresses]
*     security:
*       - bearerAuth: []
*     parameters:
*       - in: path
*         name: id
*         required: true
*         schema:
*           type: string
*         description: Address ID
*     requestBody:
*       required: true
*       content:
*         application/json:
*           schema:
*             type: object
*             properties:
*               label:
*                 type: string
*               full_name:
*                 type: string
*               phone:
*                 type: string
*               address_line1:
*                 type: string
*               address_line2:
*                 type: string
*               city:
*                 type: string
*               state:
*                 type: string
*               postal_code:
*                 type: string
*               country:
*                 type: string
*               is_default:
*                 type: boolean
*     responses:
*       200:
*         description: Address updated successfully
*       404:
*         description: Address not found
*       401:
*         description: Unauthorized
*/
router.put('/:id', updateAddress);
 
/**
* @swagger
* /api/addresses/{id}:
*   delete:
*     summary: Delete an address
*     tags: [Addresses]
*     security:
*       - bearerAuth: []
*     parameters:
*       - in: path
*         name: id
*         required: true
*         schema:
*           type: string
*         description: Address ID
*     responses:
*       200:
*         description: Address deleted successfully
*       404:
*         description: Address not found
*       401:
*         description: Unauthorized
*/
router.delete('/:id', deleteAddress);
 
/**
* @swagger
* /api/addresses/{id}/set-default:
*   patch:
*     summary: Set address as default
*     tags: [Addresses]
*     security:
*       - bearerAuth: []
*     parameters:
*       - in: path
*         name: id
*         required: true
*         schema:
*           type: string
*         description: Address ID
*     responses:
*       200:
*         description: Address set as default
*       404:
*         description: Address not found
*       401:
*         description: Unauthorized
*/
router.patch('/:id/set-default', setDefaultAddress);
 
module.exports = router;
 
 