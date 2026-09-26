const mongoose = require('mongoose');

const farmerSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: String,
    default: null
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  owner: {
    type: String,
    required: true,
    trim: true
  },
  initials: {
    type: String,
    default: ''
  },
  marketIds: {
    type: [String],
    default: []
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  reviews: {
    type: Number,
    default: 0
  },
  years: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['approved', 'pending', 'suspended'],
    default: 'approved'
  },
  bio: {
    type: String,
    default: ''
  },
  specialties: {
    type: [String],
    default: []
  },
  pickup: {
    type: [String],
    default: []
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

farmerSchema.pre('save', function(next) {
  if (!this.initials && this.name) {
    this.initials = this.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Farmer', farmerSchema);
