const ContactQuery = require('../models/ContactQuery');

/**
 * Get all contact queries
 */
exports.getContactQueries = async (req, res, next) => {
  try {
    const { status, priority, searchQuery } = req.query;

    let query = {};

    if (status) {
      query.status = status;
    }

    if (priority) {
      query.priority = priority;
    }

    if (searchQuery) {
      query.$or = [
        { name: new RegExp(searchQuery, 'i') },
        { email: new RegExp(searchQuery, 'i') },
        { subject: new RegExp(searchQuery, 'i') },
      ];
    }

    const queries = await ContactQuery.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: queries.length,
      data: queries,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single contact query by ID
 */
exports.getContactQueryById = async (req, res, next) => {
  try {
    const query = await ContactQuery.findById(req.params.id).populate('respondedBy', 'name email');

    if (!query) {
      return res.status(404).json({
        success: false,
        message: 'Contact query not found',
      });
    }

    res.status(200).json({
      success: true,
      data: query,
    });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Contact query not found',
      });
    }
    next(error);
  }
};

/**
 * Create new contact query (public endpoint)
 */
exports.createContactQuery = async (req, res, next) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    if (!name || !email || !phone || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, phone, subject, and message are required',
      });
    }

    const query = await ContactQuery.create({
      name,
      email,
      phone,
      subject,
      message,
      status: 'new',
      priority: 'medium',
    });

    res.status(201).json({
      success: true,
      data: query,
      message: 'Your message has been received. We will respond soon.',
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
 * Update contact query status and add response
 */
exports.updateContactQuery = async (req, res, next) => {
  try {
    const { status, priority, response } = req.body;
    const userId = req.user?._id;

    const updateData = {};
    if (status) updateData.status = status;
    if (priority) updateData.priority = priority;
    if (response) {
      updateData.response = response;
      updateData.respondedBy = userId;
      updateData.respondedAt = new Date();
    }

    const query = await ContactQuery.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).populate('respondedBy', 'name email');

    if (!query) {
      return res.status(404).json({
        success: false,
        message: 'Contact query not found',
      });
    }

    res.status(200).json({
      success: true,
      data: query,
      message: 'Contact query updated successfully',
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
        message: 'Contact query not found',
      });
    }
    next(error);
  }
};

/**
 * Delete contact query by ID
 */
exports.deleteContactQuery = async (req, res, next) => {
  try {
    const query = await ContactQuery.findByIdAndDelete(req.params.id);

    if (!query) {
      return res.status(404).json({
        success: false,
        message: 'Contact query not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Contact query deleted successfully',
      data: {},
    });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Contact query not found',
      });
    }
    next(error);
  }
};

/**
 * Get contact query statistics
 */
exports.getContactQueryStats = async (req, res, next) => {
  try {
    const queries = await ContactQuery.find();

    const stats = {
      total: queries.length,
      new: queries.filter((q) => q.status === 'new').length,
      inProgress: queries.filter((q) => q.status === 'in-progress').length,
      resolved: queries.filter((q) => q.status === 'resolved').length,
      closed: queries.filter((q) => q.status === 'closed').length,
      highPriority: queries.filter((q) => q.priority === 'high').length,
    };

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};
