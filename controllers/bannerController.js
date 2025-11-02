const Banner = require('../models/Banner');

/**
 * Get all banners with optional filters
 */
exports.getBanners = async (req, res, next) => {
  try {
    const { isActive, season } = req.query;

    let query = {};

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    if (season) {
      query.season = season;
    }

    const banners = await Banner.find(query).sort({ position: 1, createdAt: -1 });

    res.status(200).json({
      success: true,
      count: banners.length,
      data: banners,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single banner by ID
 */
exports.getBannerById = async (req, res, next) => {
  try {
    const banner = await Banner.findById(req.params.id);

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Banner not found',
      });
    }

    res.status(200).json({
      success: true,
      data: banner,
    });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Banner not found',
      });
    }
    next(error);
  }
};

/**
 * Create new banner
 */
exports.createBanner = async (req, res, next) => {
  try {
    const { title, description, imageUrl, linkUrl, season, startDate, endDate, isActive, position } = req.body;

    if (!title || !description || !imageUrl || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Title, description, image URL, start date, and end date are required',
      });
    }

    const banner = await Banner.create({
      title,
      description,
      imageUrl,
      linkUrl: linkUrl || '/',
      season: season || 'general',
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      isActive: isActive !== undefined ? isActive : true,
      position: position || 1,
    });

    res.status(201).json({
      success: true,
      data: banner,
      message: 'Banner created successfully',
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', '),
      });
    }
    next(error);
  }
};

/**
 * Update banner by ID
 */
exports.updateBanner = async (req, res, next) => {
  try {
    const { title, description, imageUrl, linkUrl, season, startDate, endDate, isActive, position } = req.body;

    const updateData = {};
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (imageUrl) updateData.imageUrl = imageUrl;
    if (linkUrl) updateData.linkUrl = linkUrl;
    if (season) updateData.season = season;
    if (startDate) updateData.startDate = new Date(startDate);
    if (endDate) updateData.endDate = new Date(endDate);
    if (isActive !== undefined) updateData.isActive = isActive;
    if (position) updateData.position = position;

    const banner = await Banner.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Banner not found',
      });
    }

    res.status(200).json({
      success: true,
      data: banner,
      message: 'Banner updated successfully',
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', '),
      });
    }
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Banner not found',
      });
    }
    next(error);
  }
};

/**
 * Delete banner by ID
 */
exports.deleteBanner = async (req, res, next) => {
  try {
    const banner = await Banner.findByIdAndDelete(req.params.id);

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Banner not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Banner deleted successfully',
      data: {},
    });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Banner not found',
      });
    }
    next(error);
  }
};
