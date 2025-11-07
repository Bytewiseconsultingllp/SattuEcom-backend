const express = require('express');
const router = express.Router();
const offlineSaleController = require('../controllers/offlineSaleController');
const { protect, authorize } = require('../middleware/auth');

// All routes require admin authentication
router.use(protect, authorize('admin'));

router.get('/', offlineSaleController.getOfflineSales);
router.get('/stats', offlineSaleController.getOfflineSalesStats);
router.get('/export', offlineSaleController.exportOfflineSales);
router.get('/registered-status', offlineSaleController.getRegistrationStatus);
router.get('/:id', offlineSaleController.getOfflineSaleById);
router.post('/', offlineSaleController.createOfflineSale);
router.post('/send-credentials', offlineSaleController.sendCredentialsBulk);
router.post('/:id/send-credential', offlineSaleController.sendCredentialForSale);
router.put('/:id', offlineSaleController.updateOfflineSale);
router.delete('/:id', offlineSaleController.deleteOfflineSale);

module.exports = router;
