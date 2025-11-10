const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload image to Cloudinary
 * @param {string} base64Image - Base64 encoded image string
 * @param {string} folder - Cloudinary folder name
 * @param {object} options - Additional upload options
 * @returns {Promise<object>} - Upload result with URL
 */
const uploadImage = async (base64Image, folder = 'sattu-ecom', options = {}) => {
  try {
    // Ensure base64 string has proper format
    let imageData = base64Image;
    if (!base64Image.startsWith('data:')) {
      // If no data URI prefix, assume it's just the base64 string
      imageData = `data:image/jpeg;base64,${base64Image}`;
    }

    const uploadOptions = {
      folder,
      resource_type: 'auto',
      quality: 'auto:good',
      fetch_format: 'auto',
      ...options,
    };

    const result = await cloudinary.uploader.upload(imageData, uploadOptions);

    return {
      success: true,
      url: result.secure_url,
      public_id: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      resource_type: result.resource_type,
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }
};

/**
 * Upload multiple images to Cloudinary
 * @param {Array<string>} base64Images - Array of base64 encoded images
 * @param {string} folder - Cloudinary folder name
 * @param {object} options - Additional upload options
 * @returns {Promise<Array<object>>} - Array of upload results
 */
const uploadMultipleImages = async (base64Images, folder = 'sattu-ecom', options = {}) => {
  try {
    const uploadPromises = base64Images.map(image => uploadImage(image, folder, options));
    const results = await Promise.all(uploadPromises);
    return results;
  } catch (error) {
    console.error('Multiple images upload error:', error);
    throw new Error(`Failed to upload images: ${error.message}`);
  }
};

/**
 * Delete image from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @returns {Promise<object>} - Deletion result
 */
const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return {
      success: result.result === 'ok',
      result: result.result,
    };
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw new Error(`Failed to delete image: ${error.message}`);
  }
};

/**
 * Delete multiple images from Cloudinary
 * @param {Array<string>} publicIds - Array of Cloudinary public IDs
 * @returns {Promise<object>} - Deletion result
 */
const deleteMultipleImages = async (publicIds) => {
  try {
    const result = await cloudinary.api.delete_resources(publicIds);
    return {
      success: true,
      deleted: result.deleted,
      deleted_counts: result.deleted_counts,
    };
  } catch (error) {
    console.error('Multiple images delete error:', error);
    throw new Error(`Failed to delete images: ${error.message}`);
  }
};

/**
 * Extract public ID from Cloudinary URL
 * @param {string} url - Cloudinary URL
 * @returns {string} - Public ID
 */
const extractPublicId = (url) => {
  try {
    if (!url) return null;
    
    // Extract public ID from Cloudinary URL
    // Format: https://res.cloudinary.com/{cloud_name}/image/upload/{version}/{public_id}.{format}
    const matches = url.match(/\/upload\/(?:v\d+\/)?(.+)\.\w+$/);
    return matches ? matches[1] : null;
  } catch (error) {
    console.error('Extract public ID error:', error);
    return null;
  }
};

/**
 * Generate optimized image URL with transformations
 * @param {string} publicId - Cloudinary public ID
 * @param {object} transformations - Transformation options
 * @returns {string} - Transformed image URL
 */
const getOptimizedUrl = (publicId, transformations = {}) => {
  try {
    const defaultTransformations = {
      quality: 'auto:good',
      fetch_format: 'auto',
      ...transformations,
    };

    return cloudinary.url(publicId, defaultTransformations);
  } catch (error) {
    console.error('Get optimized URL error:', error);
    return null;
  }
};

/**
 * Validate image file
 * @param {string} base64Image - Base64 encoded image
 * @param {object} options - Validation options
 * @returns {object} - Validation result
 */
const validateImage = (base64Image, options = {}) => {
  const {
    maxSizeMB = 10,
    allowedFormats = ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  } = options;

  try {
    // Check if it's a valid base64 string
    if (!base64Image || typeof base64Image !== 'string') {
      return { valid: false, error: 'Invalid image data' };
    }

    // Extract format from data URI
    const formatMatch = base64Image.match(/^data:image\/(\w+);base64,/);
    if (!formatMatch) {
      return { valid: false, error: 'Invalid image format' };
    }

    const format = formatMatch[1].toLowerCase();
    if (!allowedFormats.includes(format)) {
      return { 
        valid: false, 
        error: `Format ${format} not allowed. Allowed formats: ${allowedFormats.join(', ')}` 
      };
    }

    // Check file size (approximate)
    const base64Length = base64Image.split(',')[1]?.length || 0;
    const sizeInBytes = (base64Length * 3) / 4;
    const sizeInMB = sizeInBytes / (1024 * 1024);

    if (sizeInMB > maxSizeMB) {
      return { 
        valid: false, 
        error: `Image size ${sizeInMB.toFixed(2)}MB exceeds maximum ${maxSizeMB}MB` 
      };
    }

    return { valid: true, format, sizeInMB: sizeInMB.toFixed(2) };
  } catch (error) {
    return { valid: false, error: error.message };
  }
};

module.exports = {
  cloudinary,
  uploadImage,
  uploadMultipleImages,
  deleteImage,
  deleteMultipleImages,
  extractPublicId,
  getOptimizedUrl,
  validateImage,
};
