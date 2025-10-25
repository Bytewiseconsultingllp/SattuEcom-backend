const Address = require('../models/Address');
 
/**
* Get all addresses for a user
*/
exports.getAddresses = async (req, res, next) => {
  try {
    const userId = req.user._id; // From protect middleware
 
    const addresses = await Address.find({ user_id: userId }).sort({ is_default: -1, createdAt: -1 });
 
    res.status(200).json({
      success: true,
      count: addresses.length,
      data: addresses,
    });
  } catch (error) {
    next(error);
  }
};
 
/**
* Get single address by ID
*/
exports.getAddressById = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const address = await Address.findOne({ _id: req.params.id, user_id: userId });
 
    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found',
      });
    }
 
    res.status(200).json({
      success: true,
      data: address,
    });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Address not found',
      });
    }
    next(error);
  }
};
 
/**
* Create new address
*/
exports.createAddress = async (req, res, next) => {
  try {
    const userId = req.user._id;
 
    // Add user_id to the address data
    const addressData = {
      ...req.body,
      user_id: userId,
    };
 
    // If this is set as default, unset other defaults
    if (addressData.is_default) {
      await Address.updateMany({ user_id: userId }, { is_default: false });
    }
 
    const address = await Address.create(addressData);
 
    res.status(201).json({
      success: true,
      data: address,
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
* Update address by ID
*/
exports.updateAddress = async (req, res, next) => {
  try {
    const userId = req.user._id;
 
    // Check if address exists and belongs to user
    let address = await Address.findOne({ _id: req.params.id, user_id: userId });
 
    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found',
      });
    }
 
    // If setting this as default, unset other defaults
    if (req.body.is_default === true) {
      await Address.updateMany(
        { user_id: userId, _id: { $ne: req.params.id } },
        { is_default: false }
      );
    }
 
    address = await Address.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
 
    res.status(200).json({
      success: true,
      data: address,
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
        message: 'Address not found',
      });
    }
    next(error);
  }
};
 
/**
* Delete address by ID
*/
exports.deleteAddress = async (req, res, next) => {
  try {
    const userId = req.user._id;
 
    const address = await Address.findOneAndDelete({
      _id: req.params.id,
      user_id: userId,
    });
 
    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found',
      });
    }
 
    // If deleted address was default, set another address as default
    if (address.is_default) {
      const nextAddress = await Address.findOne({ user_id: userId }).sort({ createdAt: -1 });
      if (nextAddress) {
        nextAddress.is_default = true;
        await nextAddress.save();
      }
    }
 
    res.status(200).json({
      success: true,
      message: 'Address deleted successfully',
      data: {},
    });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Address not found',
      });
    }
    next(error);
  }
};
 
/**
* Set address as default
*/
exports.setDefaultAddress = async (req, res, next) => {
  try {
    const userId = req.user._id;
 
    // Check if address exists and belongs to user
    const address = await Address.findOne({ _id: req.params.id, user_id: userId });
 
    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found',
      });
    }
 
    // Unset all other defaults for this user
    await Address.updateMany(
      { user_id: userId, _id: { $ne: req.params.id } },
      { is_default: false }
    );
 
    // Set this address as default
    address.is_default = true;
    await address.save();
 
    res.status(200).json({
      success: true,
      data: address,
    });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Address not found',
      });
    }
    next(error);
  }
};
 