const Category = require('../models/Category');

// GET /categories
exports.getCategories = async (_req, res, next) => {
  try {
    const cats = await Category.find().sort({ name: 1 }).lean();
    const data = cats.map(c => ({
      id: c._id.toString(),
      name: c.name,
      created_at: c.createdAt,
      updated_at: c.updatedAt,
    }));
    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// POST /categories  [admin only]
exports.createCategory = async (req, res, next) => {
  try {
    const { name } = req.body || {};
    const v = (name || '').trim();
    if (!v) {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }

    // Upsert-like behavior: if exists, return it; else create.
    let cat = await Category.findOne({ name: v }).lean();
    if (!cat) {
      const created = await Category.create({ name: v });
      cat = created.toObject();
    }

    const data = {
      id: cat._id ? cat._id.toString() : cat.id,
      name: cat.name,
      created_at: cat.createdAt,
      updated_at: cat.updatedAt,
    };
    return res.status(201).json({ success: true, data, message: 'Category created' });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ success: false, message: 'Category already exists' });
    }
    next(err);
  }
};