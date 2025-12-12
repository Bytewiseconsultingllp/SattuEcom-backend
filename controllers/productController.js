const Product = require('../models/Product');
const Category = require('../models/Category');
 
/**
* Get all products with optional filters and pagination
* Matches Supabase getProducts function
*/
exports.getProducts = async (req, res, next) => {
  try {
    const { category, minPrice, maxPrice, inStockOnly, search, page = 1, limit = 10 } = req.query;
 
    // Build query object
    let query = {};
 
    // Category filter
    if (category && category !== 'All Products') {
      query.category = category;
    }
 
    // Search filter (name or description)
    if (search && search.trim()) {
      query.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { description: { $regex: search.trim(), $options: 'i' } }
      ];
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
 
    // ✅ Pagination
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10)); // Max 100 per page
    const skip = (pageNum - 1) * limitNum;
 
    // Get total count for pagination
    const total = await Product.countDocuments(query);
    
    // Execute query with sorting, pagination
    const products = await Product.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();
 
    res.status(200).json({
      success: true,
      count: products.length,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
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
// // controllers/productsController.js
exports.createProduct = async (req, res, next) => {
  try {
    const body = { ...req.body };

    if (!body.images || !Array.isArray(body.images) || body.images.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'At least one image is required' 
      });
    }

    // Ensure category exists (create if missing)
    const catName = (body.category || '').trim();
    if (!catName) {
      return res.status(400).json({ success: false, message: 'Category is required' });
    }
    let cat = await Category.findOne({ name: catName }).lean();
    if (!cat) {
      const created = await Category.create({ name: catName });
      cat = created.toObject();
    }

    const product = await Product.create({
      name: body.name,
      price: body.price,
      original_price: body.original_price,
      category: body.category,
      description: body.description,
      images: body.images, // Array of base64 strings
      in_stock: body.in_stock !== undefined ? body.in_stock : true,
      ingredients: body.ingredients,
      usage: body.usage,
      benefits: body.benefits || [],
    });

    res.status(201).json({ success: true, data: product });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
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
    const body = { ...req.body };

    // If images provided, validate
    if (body.images !== undefined) {
      if (!Array.isArray(body.images) || body.images.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'At least one image is required' 
        });
      }
    }

    // If category changed, ensure it exists
    if (typeof body.category === 'string') {
      const catName = body.category.trim();
      if (!catName) {
        return res.status(400).json({ 
          success: false, 
          message: 'Category is required' 
        });
      }
      let cat = await Category.findOne({ name: catName }).lean();
      if (!cat) {
        const created = await Category.create({ name: catName });
        cat = created.toObject();
      }
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      body,
      {
        new: true,
        runValidators: true,
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
    console.error('Update Product Error:', error);
    
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
* Now uses Category collection for consistency with /api/categories
*/
exports.getCategories = async (req, res, next) => {
  try {
    // Use Category collection instead of Product.distinct() for consistency
    const categories = await Category.find().sort({ name: 1 }).lean();
    
    // Return just the category names as strings (for backward compatibility)
    const categoryNames = categories.map(c => c.name);
 
    res.status(200).json({
      success: true,
      data: categoryNames,
    });
  } catch (error) {
    next(error);
  }
};