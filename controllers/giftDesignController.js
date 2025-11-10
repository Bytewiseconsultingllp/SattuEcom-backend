const GiftDesign = require('../models/GiftDesign');

/**
 * Get all active gift designs (public)
 */
exports.getActiveGiftDesigns = async (req, res) => {
  try {
    const { type } = req.query; // Filter by 'single_product' or 'combo'
    
    const filter = { is_active: true };
    if (type && ['single_product', 'combo'].includes(type)) {
      filter.type = type;
    }
    
    const designs = await GiftDesign.find(filter)
      .populate('product_id', 'name price image_url')
      .populate('combo_items.product_id', 'name price image_url')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: designs,
    });
  } catch (error) {
    console.error('Error fetching active gift designs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch gift designs',
      error: error.message,
    });
  }
};

/**
 * Get single gift design by ID
 */
exports.getGiftDesignById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const design = await GiftDesign.findById(id)
      .populate('product_id', 'name price image_url description')
      .populate('combo_items.product_id', 'name price image_url description');
    
    if (!design) {
      return res.status(404).json({
        success: false,
        message: 'Gift design not found',
      });
    }
    
    res.json({
      success: true,
      data: design,
    });
  } catch (error) {
    console.error('Error fetching gift design:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch gift design',
      error: error.message,
    });
  }
};

/**
 * Admin: Create new gift design
 */
exports.createGiftDesign = async (req, res) => {
  try {
    const {
      name,
      description,
      type,
      price,
      product_id,
      product_quantity,
      combo_items,
      image_url,
      wrapping_style,
      includes_card,
      card_message_template,
      stock_available,
      tags,
    } = req.body;

    // Validation
    if (!name || !type || price == null) {
      return res.status(400).json({
        success: false,
        message: 'Name, type, and price are required',
      });
    }

    if (!['single_product', 'combo'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Type must be "single_product" or "combo"',
      });
    }

    if (type === 'single_product' && !product_id) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required for single product gifts',
      });
    }

    if (type === 'combo' && (!combo_items || combo_items.length === 0)) {
      return res.status(400).json({
        success: false,
        message: 'Combo items are required for combo gifts',
      });
    }

    const designData = {
      name,
      description,
      type,
      price,
      image_url,
      wrapping_style,
      includes_card: includes_card !== false,
      card_message_template,
      stock_available: stock_available != null ? stock_available : -1,
      tags: tags || [],
      created_by: req.user?.id,
    };

    if (type === 'single_product') {
      designData.product_id = product_id;
      designData.product_quantity = product_quantity || 1;
    } else {
      designData.combo_items = combo_items;
    }

    const design = new GiftDesign(designData);
    await design.save();

    await design.populate('product_id', 'name price image_url');
    await design.populate('combo_items.product_id', 'name price image_url');

    res.status(201).json({
      success: true,
      message: 'Gift design created successfully',
      data: design,
    });
  } catch (error) {
    console.error('Error creating gift design:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create gift design',
      error: error.message,
    });
  }
};

/**
 * Admin: Update gift design
 */
exports.updateGiftDesign = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Prevent changing type after creation
    if (updates.type) {
      delete updates.type;
    }

    const design = await GiftDesign.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    })
      .populate('product_id', 'name price image_url')
      .populate('combo_items.product_id', 'name price image_url');

    if (!design) {
      return res.status(404).json({
        success: false,
        message: 'Gift design not found',
      });
    }

    res.json({
      success: true,
      message: 'Gift design updated successfully',
      data: design,
    });
  } catch (error) {
    console.error('Error updating gift design:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update gift design',
      error: error.message,
    });
  }
};

/**
 * Admin: Delete gift design
 */
exports.deleteGiftDesign = async (req, res) => {
  try {
    const { id } = req.params;

    const design = await GiftDesign.findByIdAndDelete(id);

    if (!design) {
      return res.status(404).json({
        success: false,
        message: 'Gift design not found',
      });
    }

    res.json({
      success: true,
      message: 'Gift design deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting gift design:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete gift design',
      error: error.message,
    });
  }
};

/**
 * Admin: Toggle gift design status
 */
exports.toggleGiftDesignStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    const design = await GiftDesign.findByIdAndUpdate(
      id,
      { is_active },
      { new: true }
    )
      .populate('product_id', 'name price image_url')
      .populate('combo_items.product_id', 'name price image_url');

    if (!design) {
      return res.status(404).json({
        success: false,
        message: 'Gift design not found',
      });
    }

    res.json({
      success: true,
      message: `Gift design ${is_active ? 'activated' : 'deactivated'} successfully`,
      data: design,
    });
  } catch (error) {
    console.error('Error toggling gift design status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle gift design status',
      error: error.message,
    });
  }
};

/**
 * Admin: Get all gift designs (with filters)
 */
exports.getAllGiftDesigns = async (req, res) => {
  try {
    const { type, is_active, search } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = {};
    if (type && ['single_product', 'combo'].includes(type)) {
      filter.type = type;
    }
    if (is_active !== undefined) {
      filter.is_active = is_active === 'true';
    }
    if (search) {
      filter.$text = { $search: search };
    }

    const designs = await GiftDesign.find(filter)
      .populate('product_id', 'name price image_url')
      .populate('combo_items.product_id', 'name price image_url')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await GiftDesign.countDocuments(filter);

    res.json({
      success: true,
      data: designs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching gift designs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch gift designs',
      error: error.message,
    });
  }
};
