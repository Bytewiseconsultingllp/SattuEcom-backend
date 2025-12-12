const express = require('express');
const router = express.Router();
const { uploadImage, uploadMultipleImages, deleteImage, validateImage } = require('../utils/cloudinary');
const { protect } = require('../middleware/auth');

/**
 * @route   POST /api/upload/image
 * @desc    Upload single image to Cloudinary
 * @access  Private
 */
router.post('/image', protect, async (req, res) => {
  try {
    const { image, folder = 'Grain-fusion/general' } = req.body;

    if (!image) {
      return res.status(400).json({
        success: false,
        message: 'Image data is required',
      });
    }

    // Validate image
    const validation = validateImage(image);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.error,
      });
    }

    // Upload to Cloudinary
    const result = await uploadImage(image, folder);

    res.json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        url: result.url,
        public_id: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
      },
    });
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload image',
    });
  }
});

/**
 * @route   POST /api/upload/images
 * @desc    Upload multiple images to Cloudinary
 * @access  Private
 */
router.post('/images', protect, async (req, res) => {
  try {
    const { images, folder = 'Grain-fusion/general' } = req.body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Images array is required',
      });
    }

    // Validate all images
    for (let i = 0; i < images.length; i++) {
      const validation = validateImage(images[i]);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: `Image ${i + 1}: ${validation.error}`,
        });
      }
    }

    // Upload to Cloudinary
    const results = await uploadMultipleImages(images, folder);

    res.json({
      success: true,
      message: `${results.length} images uploaded successfully`,
      data: results.map(r => ({
        url: r.url,
        public_id: r.public_id,
        width: r.width,
        height: r.height,
        format: r.format,
      })),
    });
  } catch (error) {
    console.error('Multiple images upload error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload images',
    });
  }
});

/**
 * @route   POST /api/upload/product-images
 * @desc    Upload product images to Cloudinary
 * @access  Private (Admin)
 */
router.post('/product-images', protect, async (req, res) => {
  try {
    const { images } = req.body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Product images are required',
      });
    }

    // Validate all images
    for (let i = 0; i < images.length; i++) {
      const validation = validateImage(images[i], { maxSizeMB: 5 });
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: `Image ${i + 1}: ${validation.error}`,
        });
      }
    }

    // Upload to Cloudinary in products folder
    const results = await uploadMultipleImages(images, 'Grain-fusion/products');

    res.json({
      success: true,
      message: `${results.length} product images uploaded successfully`,
      data: results.map(r => ({
        url: r.url,
        public_id: r.public_id,
      })),
    });
  } catch (error) {
    console.error('Product images upload error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload product images',
    });
  }
});

/**
 * @route   POST /api/upload/company-logo
 * @desc    Upload company logo to Cloudinary
 * @access  Private (Admin)
 */
router.post('/company-logo', protect, async (req, res) => {
  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({
        success: false,
        message: 'Company logo is required',
      });
    }

    // Validate image
    const validation = validateImage(image, { maxSizeMB: 2 });
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.error,
      });
    }

    // Upload to Cloudinary
    const result = await uploadImage(image, 'Grain-fusion/company');

    res.json({
      success: true,
      message: 'Company logo uploaded successfully',
      data: {
        url: result.url,
        public_id: result.public_id,
      },
    });
  } catch (error) {
    console.error('Company logo upload error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload company logo',
    });
  }
});

/**
 * @route   POST /api/upload/company-signature
 * @desc    Upload company signature to Cloudinary
 * @access  Private (Admin)
 */
router.post('/company-signature', protect, async (req, res) => {
  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({
        success: false,
        message: 'Company signature is required',
      });
    }

    // Validate image
    const validation = validateImage(image, { maxSizeMB: 2 });
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.error,
      });
    }

    // Upload to Cloudinary
    const result = await uploadImage(image, 'Grain-fusion/company');

    res.json({
      success: true,
      message: 'Company signature uploaded successfully',
      data: {
        url: result.url,
        public_id: result.public_id,
      },
    });
  } catch (error) {
    console.error('Company signature upload error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload company signature',
    });
  }
});

/**
 * @route   POST /api/upload/review-images
 * @desc    Upload review images to Cloudinary
 * @access  Private
 */
router.post('/review-images', protect, async (req, res) => {
  try {
    const { images } = req.body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Review images are required',
      });
    }

    // Limit to 5 images per review
    if (images.length > 5) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 5 images allowed per review',
      });
    }

    // Validate all images
    for (let i = 0; i < images.length; i++) {
      const validation = validateImage(images[i], { maxSizeMB: 3 });
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: `Image ${i + 1}: ${validation.error}`,
        });
      }
    }

    // Upload to Cloudinary
    const results = await uploadMultipleImages(images, 'Grain-fusion/reviews');

    res.json({
      success: true,
      message: `${results.length} review images uploaded successfully`,
      data: results.map(r => ({
        url: r.url,
        public_id: r.public_id,
      })),
    });
  } catch (error) {
    console.error('Review images upload error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload review images',
    });
  }
});

/**
 * @route   DELETE /api/upload/image
 * @desc    Delete image from Cloudinary
 * @access  Private
 */
router.delete('/image', protect, async (req, res) => {
  try {
    const { public_id } = req.body;

    if (!public_id) {
      return res.status(400).json({
        success: false,
        message: 'Public ID is required',
      });
    }

    const result = await deleteImage(public_id);

    if (result.success) {
      res.json({
        success: true,
        message: 'Image deleted successfully',
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to delete image',
      });
    }
  } catch (error) {
    console.error('Image delete error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete image',
    });
  }
});

module.exports = router;
