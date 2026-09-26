const mongoose = require('mongoose');
const User = require('../models/User');

const byId = (id) => mongoose.isValidObjectId(id) ? { $or: [{ id }, { _id: id }] } : { id };

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

module.exports = {
  toggleFavorite,
  getFavorites
};
