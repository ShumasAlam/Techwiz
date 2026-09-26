const mongoose = require('mongoose');
const Product = require('../models/Product');
const Farmer = require('../models/Farmer');
const Notification = require('../models/Notification');
const StockSubscription = require('../models/StockSubscription');

const byId = (id) => mongoose.isValidObjectId(id) ? { $or: [{ id }, { _id: id }] } : { id };

const getProducts = async (req, res) => {
  try {
    const products = await Product.find({}).sort({ createdAt: -1 }).lean();
    const normalized = products.map(p => ({
      id: p.id || p._id.toString(),
      farmerId: p.farmerId,
      marketIds: p.marketIds || (p.marketId ? [p.marketId] : []),
      name: p.name,
      category: p.category,
      subcategory: p.subcategory || '',
      comparisonGroup: p.comparisonGroup || '',
      price: p.price,
      unit: p.unit || 'kg',
      stock: p.stock !== undefined ? p.stock : (p.stockQuantity || 0),
      available: p.available !== undefined ? p.available : (p.isAvailable !== false),
      image: p.image || '',
      badge: p.badge || '',
      description: p.description || '',
      rating: p.rating || 0,
      reviews: p.reviews || 0,
      harvestDaysAgo: p.harvestDaysAgo || 0,
      lastUpdatedMinutesAgo: p.lastUpdatedMinutesAgo || 0,
      distanceKm: p.distanceKm || 0,
      pickupWindow: p.pickupWindow || '',
      recentlyRestocked: Boolean(p.recentlyRestocked),
      seasonal: Boolean(p.seasonal),
      popular: Boolean(p.popular),
      freshToday: Boolean(p.freshToday)
    }));
    res.json(normalized);
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ message: 'Server error retrieving products' });
  }
};

const getProductById = async (req, res) => {
  try {
    const product = await Product.findOne(byId(req.params.id)).lean();
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json({
      id: product.id || product._id.toString(),
      ...product
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ message: 'Server error retrieving product' });
  }
};

const createProduct = async (req, res) => {
  try {
    const payload = req.body;
    const farmerId = payload.farmerId || req.user?.farmerId || req.user?.id;
    const farmer = await Farmer.findOne(byId(farmerId));
    if (farmer && farmer.status !== 'approved') {
      return res.status(400).json({ message: 'Your farmer profile must be approved before publishing products.' });
    }

    const productId = 'p-' + Date.now().toString(36);
    const stock = Number(payload.stock ?? payload.stockQuantity ?? 0);

    const product = new Product({
      id: payload.id || productId,
      farmerId: farmerId || 'f-1',
      marketIds: payload.marketIds || [],
      name: payload.name,
      category: payload.category,
      subcategory: payload.subcategory || '',
      comparisonGroup: payload.comparisonGroup || '',
      price: Number(payload.price),
      unit: payload.unit || 'kg',
      stock,
      stockQuantity: stock,
      available: stock > 0,
      isAvailable: stock > 0,
      image: payload.image || (req.file ? `/uploads/${req.file.filename}` : ''),
      badge: payload.badge || '',
      description: payload.description || '',
      rating: 0,
      reviews: 0,
      harvestDaysAgo: 0,
      lastUpdatedMinutesAgo: 0,
      distanceKm: payload.distanceKm || 0,
      pickupWindow: payload.pickupWindow || '',
      freshToday: ['Vegetables', 'Fruit', 'Fruits'].includes(payload.category)
    });

    await product.save();
    res.status(201).json(product);
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ message: error.message || 'Server error creating product' });
  }
};

const updateProduct = async (req, res) => {
  try {
    const product = await Product.findOne(byId(req.params.id));
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const previousStock = product.stock;
    const previousAvailable = product.available;
    const updates = req.body;

    Object.assign(product, updates);

    if (updates.stock !== undefined) {
      product.stock = Number(updates.stock);
      product.stockQuantity = Number(updates.stock);
      product.available = product.stock > 0;
      product.isAvailable = product.stock > 0;
    }

    if (product.available && (!previousAvailable || previousStock <= 0 || product.stock > previousStock)) {
      product.recentlyRestocked = true;
      // Notify subscribed users
      const subscriptions = await StockSubscription.find({ productId: product.id });
      for (const sub of subscriptions) {
        await Notification.create({
          id: 'n-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
          userId: sub.userId,
          type: 'restock',
          text: `${product.name} is back in stock.`,
          productId: product.id,
          unread: true
        });
      }
      await StockSubscription.deleteMany({ productId: product.id });
    }

    await product.save();
    res.json(product);
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ message: error.message || 'Server error updating product' });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const result = await Product.findOneAndDelete(byId(req.params.id));
    if (!result) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json({ message: 'Product deleted successfully', success: true });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ message: 'Server error deleting product' });
  }
};

const getFarmerProducts = async (req, res) => {
  try {
    const farmerId = req.user.farmerId || req.user.id;
    const products = await Product.find({ $or: [{ farmerId }, { farmerId: req.user.id }] });
    res.json(products);
  } catch (error) {
    console.error('Get farmer products error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getFarmerProducts
};
