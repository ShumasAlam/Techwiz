const mongoose = require('mongoose');
const User = require('../models/User');
const Product = require('../models/Product');

const byId = (id) => mongoose.isValidObjectId(id) ? { $or: [{ id }, { _id: id }] } : { id };

// 1. FAVORITES
const toggleFavorite = async (req, res) => {
  try {
    const userId = req.params.userId || req.user?.id;
    const { itemId } = req.body;

    if (!itemId) {
      return res.status(400).json({ message: 'Item ID is required' });
    }

    const user = await User.findOne(byId(userId));
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.favorites = user.favorites || [];
    if (user.favorites.includes(itemId)) {
      user.favorites = user.favorites.filter(id => id !== itemId);
    } else {
      user.favorites.push(itemId);
    }

    await user.save();

    res.json({
      id: user.id || user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      favorites: user.favorites,
      phone: user.phone,
      address: user.address,
      status: user.status
    });
  } catch (error) {
    console.error('Toggle favorite error:', error);
    res.status(500).json({ message: 'Server error updating favorites' });
  }
};

const getFavorites = async (req, res) => {
  try {
    const userId = req.params.userId || req.user?.id;
    const user = await User.findOne(byId(userId)).lean();
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user.favorites || []);
  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// 2. PRODUCT COMPARE DRAWER (Item 4)
const getCompareList = async (req, res) => {
  try {
    const userId = req.params.userId || req.user?.id;
    const user = await User.findOne(byId(userId)).lean();
    if (!user) return res.status(404).json({ message: 'User not found' });

    const productIds = user.compareList || [];
    const products = await Product.find({
      $or: [
        { id: { $in: productIds } },
        { _id: { $in: productIds.filter(id => mongoose.isValidObjectId(id)) } }
      ]
    }).lean();

    res.json({ productIds, products });
  } catch (error) {
    console.error('Get compare list error:', error);
    res.status(500).json({ message: 'Server error retrieving compare list' });
  }
};

const toggleCompare = async (req, res) => {
  try {
    const userId = req.params.userId || req.user?.id;
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ message: 'Product ID is required' });
    }

    const user = await User.findOne(byId(userId));
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.compareList = user.compareList || [];
    if (user.compareList.includes(productId)) {
      user.compareList = user.compareList.filter(id => id !== productId);
    } else {
      if (user.compareList.length >= 4) {
        user.compareList.shift(); // keep max 4 items
      }
      user.compareList.push(productId);
    }

    await user.save();
    res.json({ compareList: user.compareList, message: 'Compare list updated' });
  } catch (error) {
    console.error('Toggle compare error:', error);
    res.status(500).json({ message: 'Server error updating compare list' });
  }
};

const clearCompare = async (req, res) => {
  try {
    const userId = req.params.userId || req.user?.id;
    const user = await User.findOne(byId(userId));
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.compareList = [];
    await user.save();
    res.json({ message: 'Compare list cleared', compareList: [] });
  } catch (error) {
    console.error('Clear compare error:', error);
    res.status(500).json({ message: 'Server error clearing compare list' });
  }
};

// 3. UI PREFERENCES & SETTINGS (Item 8)
const getPreferences = async (req, res) => {
  try {
    const userId = req.params.userId || req.user?.id;
    const user = await User.findOne(byId(userId)).lean();
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json(user.preferences || { theme: 'light', notificationsEnabled: true });
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({ message: 'Server error retrieving preferences' });
  }
};

const updatePreferences = async (req, res) => {
  try {
    const userId = req.params.userId || req.user?.id;
    const updates = req.body;

    const user = await User.findOne(byId(userId));
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.preferences = {
      ...(user.preferences?.toObject ? user.preferences.toObject() : user.preferences),
      ...updates
    };

    await user.save();
    res.json({ message: 'Preferences updated successfully', preferences: user.preferences });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ message: 'Server error updating preferences' });
  }
};

module.exports = {
  toggleFavorite,
  getFavorites,
  getCompareList,
  toggleCompare,
  clearCompare,
  getPreferences,
  updatePreferences
};
