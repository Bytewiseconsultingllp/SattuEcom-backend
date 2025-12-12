const CompanySettings = require('../models/CompanySettings');

/**
 * Get company settings
 */
exports.getCompanySettings = async (req, res, next) => {
  try {
    let settings = await CompanySettings.findOne();

    // If no settings exist, create default ones
    if (!settings) {
      settings = await CompanySettings.create({
        companyName: 'Grain Fusion',
        description: 'Premium quality sattu products',
        email: 'siplheakthymix@gmail.com',
        phone: '+91 98765 43210',
        address: '123 Main Street, City, State - 123456',
      });
    }

    res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update company settings
 */
exports.updateCompanySettings = async (req, res, next) => {
  try {
    const {
      companyName,
      description,
      email,
      phone,
      address,
      gstNumber,
      panNumber,
      website,
      placeOfSupply,
      bankName,
      accountNumber,
      ifscCode,
      branchName,
      accountHolderName,
      upiId,
      logo,
      signature,
    } = req.body;

    let settings = await CompanySettings.findOne();

    if (!settings) {
      settings = await CompanySettings.create({
        companyName: companyName || 'Grain Fusion',
        description: description || '',
        email: email || 'info@grainfusion.com',
        phone: phone || '+91 98765 43210',
        address: address || '',
        gstNumber: gstNumber || '',
        panNumber: panNumber || '',
        website: website || '',
        placeOfSupply: placeOfSupply || '',
        bankName: bankName || '',
        accountNumber: accountNumber || '',
        ifscCode: ifscCode || '',
        branchName: branchName || '',
        accountHolderName: accountHolderName || '',
        upiId: upiId || '',
        logo: logo || '',
        signature: signature || '',
      });
    } else {
      if (companyName) settings.companyName = companyName;
      if (description !== undefined) settings.description = description;
      if (email) settings.email = email;
      if (phone) settings.phone = phone;
      if (address) settings.address = address;
      if (gstNumber !== undefined) settings.gstNumber = gstNumber;
      if (panNumber !== undefined) settings.panNumber = panNumber;
      if (website !== undefined) settings.website = website;
      if (placeOfSupply !== undefined) settings.placeOfSupply = placeOfSupply;
      if (bankName !== undefined) settings.bankName = bankName;
      if (accountNumber !== undefined) settings.accountNumber = accountNumber;
      if (ifscCode !== undefined) settings.ifscCode = ifscCode;
      if (branchName !== undefined) settings.branchName = branchName;
      if (accountHolderName !== undefined) settings.accountHolderName = accountHolderName;
      if (upiId !== undefined) settings.upiId = upiId;
      if (logo !== undefined) settings.logo = logo;
      if (signature !== undefined) settings.signature = signature;

      await settings.save();
    }

    res.status(200).json({
      success: true,
      data: settings,
      message: 'Company settings updated successfully',
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
