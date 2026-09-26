const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  farmerId: {
    type: String,
    required: true,
    index: true
  },
  marketIds: {
    type: [String],
    default: []
  },
  marketId: {
    type: String
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true
  },
  subcategory: {
    type: String,
    default: ''
  },
  comparisonGroup: {
    type: String,
    default: ''
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  unit: {
    type: String,
    required: true,
    default: 'kg'
  },
  stock: {
    type: Number,
    default: 0,
    min: 0
  },
  stockQuantity: {
    type: Number,
    default: 0,
    min: 0
  },
  available: {
    type: Boolean,
    default: true
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  image: {
    type: String,
    default: ''
  },
  badge: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  reviews: {
    type: Number,
    default: 0
  },
  totalReviews: {
    type: Number,
    default: 0
  },
  harvestDaysAgo: {
    type: Number,
    default: 0
  },
  lastUpdatedMinutesAgo: {
    type: Number,
    default: 0
  },
  distanceKm: {
    type: Number,
    default: 0
  },
  pickupWindow: {
    type: String,
    default: ''
  },
  recentlyRestocked: {
    type: Boolean,
    default: false
  },
  seasonal: {
    type: Boolean,
    default: false
  },
  popular: {
    type: Boolean,
    default: false
  },
  freshToday: {
    type: Boolean,
    default: false
  },
  isOrganic: {
    type: Boolean,
    default: false
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

productSchema.pre('save', function(next) {
  if (this.stock === undefined && this.stockQuantity !== undefined) {
    this.stock = this.stockQuantity;
  }
  if (this.stockQuantity === undefined && this.stock !== undefined) {
    this.stockQuantity = this.stock;
  }
  if (this.stock !== undefined) {
    this.stockQuantity = this.stock;
  }
  this.available = (this.stock > 0);
  this.isAvailable = this.available;
  this.averageRating = this.rating;
  this.totalReviews = this.reviews;
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Product', productSchema);
