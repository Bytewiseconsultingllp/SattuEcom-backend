const Product = require('../models/Product');
 
/**
* Get all products with optional filters
* Matches Supabase getProducts function
*/
exports.getProducts = async (req, res, next) => {
  try {
    const { category, minPrice, maxPrice, inStockOnly } = req.query;
 
    // Build query object
    let query = {};
 
    // Category filter
    if (category && category !== 'All Products') {
      query.category = category;
    }
 
    // Price range filters
    if (minPrice !== undefined || maxPrice !== undefined) {
      query.price = {};
      if (minPrice !== undefined) {
        query.price.$gte = parseFloat(minPrice);
      }
      if (maxPrice !== undefined) {
        query.price.$lte = parseFloat(maxPrice);
      }
    }
 
    // Stock filter
    if (inStockOnly === 'true' || inStockOnly === true) {
      query.in_stock = true;
    }
 
    // Execute query with sorting (newest first, matching Supabase)
    const products = await Product.find(query).sort({ createdAt: -1 });
 
    res.status(200).json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    next(error);
  }
};
 
/**
* Get single product by ID
* Matches Supabase getProductById function
*/
exports.getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
 
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }
 
    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    // Handle invalid MongoDB ObjectId
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }
    next(error);
  }
};
 
/**
* Create new product
* Matches Supabase createProduct function
*/
exports.createProduct = async (req, res, next) => {
  try {
    const product = await Product.create(req.body);
 
    res.status(201).json({
      success: true,
      data: product,
    });
  } catch (error) {
    // Handle validation errors
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
* Update product by ID
* Matches Supabase updateProduct function
*/
exports.updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true, // Return updated document
        runValidators: true, // Run model validators
      }
    );
 
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }
 
    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', '),
      });
    }
    // Handle invalid MongoDB ObjectId
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }
    next(error);
  }
};
 
/**
* Delete product by ID
* Matches Supabase deleteProduct function
*/
exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
 
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }
 
    res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
      data: {},
    });
  } catch (error) {
    // Handle invalid MongoDB ObjectId
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }
    next(error);
  }
};
 
/**
* Get unique categories
* Helper endpoint to get all product categories
*/
exports.getCategories = async (req, res, next) => {
  try {
    const categories = await Product.distinct('category');
 
    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};