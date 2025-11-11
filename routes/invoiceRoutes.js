const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth');
const {
  getAllInvoices,
  getUserInvoices,
  getInvoiceById,
  downloadInvoicePDF,
  updateInvoiceStatus,
  deleteInvoice,
  getNextInvoiceNumber,
  getPendingOfflineInvoices,
  markOfflineInvoicePaid,
} = require('../controllers/invoiceController');

// Admin routes (must come first to avoid :id conflicts)
router.get('/', protect, admin, getAllInvoices);
router.get('/next-number', protect, admin, getNextInvoiceNumber);
router.get('/offline/pending', protect, admin, getPendingOfflineInvoices);

// Public/User routes (require authentication)
router.get('/my-invoices', protect, getUserInvoices);
router.get('/:id/download', protect, downloadInvoicePDF);
router.get('/:id', protect, getInvoiceById);

// Admin update/delete routes
router.patch('/:id/status', protect, admin, updateInvoiceStatus);
router.patch('/:id/mark-paid', protect, admin, markOfflineInvoicePaid);
router.delete('/:id', protect, admin, deleteInvoice);

module.exports = router;
