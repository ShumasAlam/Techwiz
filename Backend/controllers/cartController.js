const mongoose = require('mongoose');
const User = require('../models/User');
const Product = require('../models/Product');

const byId = (id) => mongoose.isValidObjectId(id) ? { $or: [{ id }, { _id: id }] } : { id };

const getCart = async (req, res) => {
  try {
    const userId = req.params.userId || req.user?.id;
    const user = await User.findOne(byId(userId)).lean();
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const items = user.cart || [];
    // Populate product details
    const populated = await Promise.all(items.map(async (item) => {
      const product = await Product.findOne(byId(item.productId)).lean();
      return {
        productId: item.productId,
        quantity: item.quantity,
        marketId: item.marketId,
        product: product || null
      };
    }));

    res.json({ userId, items: populated });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ message: 'Server error retrieving cart' });
  }
};

const saveCart = async (req, res) => {
  try {
    const userId = req.params.userId || req.user?.id || req.body.userId;
    const { items } = req.body;

    const user = await User.findOne(byId(userId));
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.cart = Array.isArray(items) ? items.map(item => ({
      productId: item.productId || item.id,
      quantity: Number(item.quantity) || 1,
      marketId: item.marketId || ''
    })) : [];

    await user.save();
    res.json({ message: 'Cart synced successfully', cart: user.cart });
  } catch (error) {
    console.error('Save cart error:', error);
    res.status(500).json({ message: 'Server error saving cart' });
  }
};

const clearCart = async (req, res) => {
  try {
    const userId = req.params.userId || req.user?.id;
    const user = await User.findOne(byId(userId));
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.cart = [];
    await user.save();
    res.json({ message: 'Cart cleared successfully', success: true });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({ message: 'Server error clearing cart' });
  }
};

module.exports = {
  getCart,
  saveCart,
  clearCart
};
