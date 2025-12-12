const express = require('express');
const router = express.Router();
const { getHealth } = require('../controllers/healthController');

/**
 * @swagger
 * tags:
 *   name: Health
 *   description: API health check endpoints
 */

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Check API health status
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: API is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "ok"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                 database:
 *                   type: string
 *                   example: "connected"
 */
router.get('/', getHealth);

module.exports = router;
