const mongoose = require('mongoose');

const stockSubscriptionSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  productId: {
    type: String,
    required: true,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

stockSubscriptionSchema.index({ userId: 1, productId: 1 }, { unique: true });

module.exports = mongoose.model('StockSubscription', stockSubscriptionSchema);
