const mongoose = require('mongoose');

const marketSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  day: {
    type: String,
    required: true
  },
  date: {
    type: String,
    default: 'Weekly'
  },
  hours: {
    type: String,
    default: ''
  },
  openingTime: {
    type: String,
    default: ''
  },
  closingTime: {
    type: String,
    default: ''
  },
  address: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  distance: {
    type: String,
    default: ''
  },
  stalls: {
    type: Number,
    default: 0
  },
  lat: {
    type: Number,
    default: 0
  },
  lng: {
    type: Number,
    default: 0
  },
  description: {
    type: String,
    default: ''
  },
  location: {
    type: {
      type: String,
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    },
    latitude: Number,
    longitude: Number,
    mapPin: String
  },
  operatingDays: [{
    day: String,
    openTime: String,
    closeTime: String
  }],
  contact: {
    phone: String,
    email: String,
    website: String
  },
  image: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
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

marketSchema.pre('save', function(next) {
  if (this.lat && this.lng && (!this.location || !this.location.coordinates || this.location.coordinates.length === 0)) {
    this.location = {
      type: 'Point',
      coordinates: [this.lng, this.lat],
      latitude: this.lat,
      longitude: this.lng
    };
  }
  if (!this.hours && this.openingTime && this.closingTime) {
    this.hours = `${this.openingTime} — ${this.closingTime}`;
  }
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Market', marketSchema);
