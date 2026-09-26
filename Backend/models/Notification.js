const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  type: {
    type: String,
    default: 'system'
  },
  text: {
    type: String,
    required: true
  },
  unread: {
    type: Boolean,
    default: true
  },
  orderId: {
    type: String,
    default: null
  },
  productId: {
    type: String,
    default: null
  },
  createdAt: {
    type: String,
    default: () => new Date().toLocaleString('en-GB')
  },
  createdDate: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Notification', notificationSchema);
