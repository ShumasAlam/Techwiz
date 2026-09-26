const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  productId: {
    type: String,
    required: true,
    index: true
  },
  farmerId: {
    type: String,
    index: true
  },
  orderId: {
    type: String
  },
  customerId: {
    type: String
  },
  customer: {
    type: String,
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    required: true,
    trim: true
  },
  response: {
    type: String,
    default: ''
  },
  farmerResponse: {
    type: String,
    default: ''
  },
  date: {
    type: String,
    default: () => new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

reviewSchema.pre('save', function(next) {
  if (this.response && !this.farmerResponse) {
    this.farmerResponse = this.response;
  }
  if (this.farmerResponse && !this.response) {
    this.response = this.farmerResponse;
  }
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Review', reviewSchema);
