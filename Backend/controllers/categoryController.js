const mongoose = require('mongoose');
const Category = require('../models/Category');
const Product = require('../models/Product');

const byId = (id) => mongoose.isValidObjectId(id) ? { $or: [{ id }, { _id: id }] } : { id };

const DEFAULT_CATEGORIES = [
  'Vegetables',
  'Fruit',
  'Bakery',
  'Dairy',
  'Eggs',
  'Other Produce'
];

const ensureDefaultCategories = async () => {
  const count = await Category.countDocuments({});
  if (count === 0) {
    const defaultDocs = DEFAULT_CATEGORIES.map((name, index) => ({
      id: `cat-${index + 1}`,
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      isActive: true
    }));
    await Category.insertMany(defaultDocs);
  }
};

const getCategories = async (req, res) => {
  try {
    await ensureDefaultCategories();
    const categories = await Category.find({ isActive: true }).sort({ name: 1 }).lean();
    res.json(categories.map(c => ({
      id: c.id || c._id.toString(),
      name: c.name,
      slug: c.slug,
      description: c.description || '',
      isActive: c.isActive
    })));
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Server error retrieving categories' });
  }
};

const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Category name is required' });
    }

    const trimmed = name.trim();
    const existing = await Category.findOne({ name: { $regex: new RegExp(`^${trimmed}$`, 'i') } });
    if (existing) {
      return res.status(400).json({ message: 'Category already exists' });
    }

    const id = 'cat-' + Date.now().toString(36);
    const category = new Category({
      id,
      name: trimmed,
      slug: trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      description: description || '',
      isActive: true
    });

    await category.save();
    res.status(201).json(category);
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ message: error.message || 'Server error creating category' });
  }
};

const updateCategory = async (req, res) => {
  try {
    const { name, description, isActive } = req.body;
    const category = await Category.findOne(byId(req.params.id));
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    if (name) category.name = name.trim();
    if (description !== undefined) category.description = description;
    if (isActive !== undefined) category.isActive = isActive;

    await category.save();
    res.json(category);
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ message: error.message || 'Server error updating category' });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findOne(byId(req.params.id));
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Check if any product is using this category
    const count = await Product.countDocuments({ category: category.name });
    if (count > 0) {
      return res.status(400).json({ message: `Cannot delete: ${count} product(s) are using this category.` });
    }

    await Category.findOneAndDelete(byId(req.params.id));
    res.json({ message: 'Category deleted successfully', success: true });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ message: 'Server error deleting category' });
  }
};

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  ensureDefaultCategories
};
