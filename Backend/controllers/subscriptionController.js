const StockSubscription = require('../models/StockSubscription');

const notifyMe = async (req, res) => {
  try {
    const { userId, productId } = req.body;
    if (!userId || !productId) {
      return res.status(400).json({ message: 'User ID and Product ID are required' });
    }

    const existing = await StockSubscription.findOne({ userId, productId });
    if (!existing) {
      await StockSubscription.create({ userId, productId });
    }

    res.json({ message: 'Subscribed to restock notification', success: true });
  } catch (error) {
    console.error('Subscription error:', error);
    res.status(500).json({ message: 'Server error saving subscription' });
  }
};

const getSubscriptions = async (req, res) => {
  try {
    const subscriptions = await StockSubscription.find({}).lean();
    res.json(subscriptions);
  } catch (error) {
    console.error('Get subscriptions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  notifyMe,
  getSubscriptions
};
