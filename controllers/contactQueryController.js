const ContactQuery = require('../models/ContactQuery');
const {
  sendContactQueryCreatedEmails,
  sendContactQueryResponseEmail,
} = require('../utils/emailService');
const logger = require('../utils/logger');

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

    logger.info('contact:getContactQueries:start', {
      status: status || null,
      priority: priority || null,
      hasSearch: Boolean(searchQuery),
    });

    const queries = await ContactQuery.find(query).sort({ createdAt: -1 });

    logger.info('contact:getContactQueries:success', {
      count: queries.length,
    });

    res.status(200).json({
      success: true,
      count: queries.length,
      data: queries,
    });
  } catch (error) {
    logger.error('contact:getContactQueries:error', {
      message: error.message,
      stack: error.stack,
    });
    next(error);
  }
};

/**
 * Get single contact query by ID
 */
exports.getContactQueryById = async (req, res, next) => {
  try {
    const id = req.params.id;
    logger.info('contact:getContactQueryById:start', { id });

    const query = await ContactQuery.findById(req.params.id).populate('respondedBy', 'name email');

    if (!query) {
      logger.warn('contact:getContactQueryById:not_found', { id });
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
      logger.warn('contact:getContactQueryById:invalid_id', { id: req.params.id });
      return res.status(404).json({
        success: false,
        message: 'Contact query not found',
      });
    }
    logger.error('contact:getContactQueryById:error', {
      message: error.message,
      stack: error.stack,
      id: req.params.id,
    });
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

    logger.info('contact:createContactQuery:start', {
      hasName: Boolean(name),
      hasEmail: Boolean(email),
      hasPhone: Boolean(phone),
      subject,
    });

    const query = await ContactQuery.create({
      name,
      email,
      phone,
      subject,
      message,
      status: 'new',
      priority: 'medium',
    });

    try {
      await sendContactQueryCreatedEmails(query);
    } catch (e) {
      // Email failures should not block contact creation; they are logged within emailService
    }

    logger.info('contact:createContactQuery:success', {
      id: query.id || query._id,
      status: query.status,
      priority: query.priority,
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
    logger.error('contact:createContactQuery:error', {
      message: error.message,
      stack: error.stack,
    });
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

    logger.info('contact:updateContactQuery:start', {
      id: req.params.id,
      status: status || null,
      priority: priority || null,
      hasResponse: Boolean(response),
    });

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

    if (response) {
      try {
        await sendContactQueryResponseEmail(query);
      } catch (e) {
        // Email failures should not block contact update; they are logged within emailService
      }
    }

    logger.info('contact:updateContactQuery:success', {
      id: query.id || query._id,
      status: query.status,
      priority: query.priority,
      hasResponse: Boolean(query.response),
    });

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
      logger.warn('contact:updateContactQuery:invalid_id', { id: req.params.id });
      return res.status(404).json({
        success: false,
        message: 'Contact query not found',
      });
    }
    logger.error('contact:updateContactQuery:error', {
      message: error.message,
      stack: error.stack,
      id: req.params.id,
    });
    next(error);
  }
};

/**
 * Delete contact query by ID
 */
exports.deleteContactQuery = async (req, res, next) => {
  try {
    const id = req.params.id;

    logger.info('contact:deleteContactQuery:start', { id });

    const query = await ContactQuery.findByIdAndDelete(id);

    if (!query) {
      return res.status(404).json({
        success: false,
        message: 'Contact query not found',
      });
    }

    logger.info('contact:deleteContactQuery:success', { id });

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
    logger.info('contact:getContactQueryStats:start');

    const queries = await ContactQuery.find();

    const stats = {
      total: queries.length,
      new: queries.filter((q) => q.status === 'new').length,
      inProgress: queries.filter((q) => q.status === 'in-progress').length,
      resolved: queries.filter((q) => q.status === 'resolved').length,
      closed: queries.filter((q) => q.status === 'closed').length,
      highPriority: queries.filter((q) => q.priority === 'high').length,
    };

    logger.info('contact:getContactQueryStats:success', stats);

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('contact:getContactQueryStats:error', {
      message: error.message,
      stack: error.stack,
    });
    next(error);
  }
};
