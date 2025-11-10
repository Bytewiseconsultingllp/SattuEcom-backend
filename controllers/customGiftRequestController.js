const CustomGiftRequest = require('../models/CustomGiftRequest');

/**
 * User: Submit custom gift request
 */
exports.submitCustomGiftRequest = async (req, res) => {
  try {
    const {
      title,
      description,
      budget_min,
      budget_max,
      recipient_name,
      occasion,
      recipient_preferences,
      design_images,
      reference_links,
    } = req.body;

    // Validation
    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: 'Title and description are required',
      });
    }

    const requestData = {
      user_id: req.user?.id,
      title,
      description,
      budget_min: budget_min || 0,
      budget_max: budget_max || 0,
      recipient_name,
      occasion,
      recipient_preferences,
      design_images: design_images || [],
      reference_links: reference_links || [],
      status: 'pending',
    };

    const customRequest = new CustomGiftRequest(requestData);
    await customRequest.save();

    res.status(201).json({
      success: true,
      message: 'Custom gift request submitted successfully',
      data: customRequest,
    });
  } catch (error) {
    console.error('Error submitting custom gift request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit custom gift request',
      error: error.message,
    });
  }
};

/**
 * User: Get their custom gift requests
 */
exports.getUserCustomGiftRequests = async (req, res) => {
  try {
    const userId = req.user?.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const requests = await CustomGiftRequest.find({ user_id: userId })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await CustomGiftRequest.countDocuments({ user_id: userId });

    res.json({
      success: true,
      data: requests,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching user custom gift requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch custom gift requests',
      error: error.message,
    });
  }
};

/**
 * User: Get single custom gift request
 */
exports.getCustomGiftRequestById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const request = await CustomGiftRequest.findById(id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Custom gift request not found',
      });
    }

    // Check ownership
    if (request.user_id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to view this request',
      });
    }

    res.json({
      success: true,
      data: request,
    });
  } catch (error) {
    console.error('Error fetching custom gift request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch custom gift request',
      error: error.message,
    });
  }
};

/**
 * Admin: Get all custom gift requests
 */
exports.getAllCustomGiftRequests = async (req, res) => {
  try {
    const { status, search } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = {};
    if (status && ['pending', 'under_review', 'approved', 'rejected', 'completed'].includes(status)) {
      filter.status = status;
    }
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { recipient_name: { $regex: search, $options: 'i' } },
      ];
    }

    const requests = await CustomGiftRequest.find(filter)
      .populate('user_id', 'name email phone')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await CustomGiftRequest.countDocuments(filter);

    res.json({
      success: true,
      data: requests,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching custom gift requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch custom gift requests',
      error: error.message,
    });
  }
};

/**
 * Admin: Update custom gift request status and add notes
 */
exports.updateCustomGiftRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_notes, estimated_price, estimated_completion_date } = req.body;

    const updateData = {};
    if (status) {
      updateData.status = status;
      if (status === 'under_review') {
        updateData.reviewed_at = new Date();
      }
      if (status === 'completed') {
        updateData.completed_at = new Date();
      }
    }
    if (admin_notes) {
      updateData.admin_notes = admin_notes;
    }
    if (estimated_price != null) {
      updateData.estimated_price = estimated_price;
    }
    if (estimated_completion_date) {
      updateData.estimated_completion_date = estimated_completion_date;
    }

    const request = await CustomGiftRequest.findByIdAndUpdate(id, updateData, {
      new: true,
    }).populate('user_id', 'name email phone');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Custom gift request not found',
      });
    }

    res.json({
      success: true,
      message: 'Custom gift request updated successfully',
      data: request,
    });
  } catch (error) {
    console.error('Error updating custom gift request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update custom gift request',
      error: error.message,
    });
  }
};

/**
 * Admin: Delete custom gift request
 */
exports.deleteCustomGiftRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const request = await CustomGiftRequest.findByIdAndDelete(id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Custom gift request not found',
      });
    }

    res.json({
      success: true,
      message: 'Custom gift request deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting custom gift request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete custom gift request',
      error: error.message,
    });
  }
};
