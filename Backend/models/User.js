const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  id: {
    type: String,
    index: true
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['customer', 'farmer', 'admin'],
    default: 'customer'
  },
  phone: {
    type: String,
    default: ''
  },
  address: {
    type: mongoose.Schema.Types.Mixed,
    default: ''
  },
  farmerId: {
    type: String,
    default: null
  },
  favorites: {
    type: [String],
    default: []
  },
  status: {
    type: String,
    enum: ['active', 'pending', 'approved', 'suspended'],
    default: 'active'
  },
  profile: {
    name: {
      type: String,
      default: ''
    },
    contactNumber: {
      type: String,
      default: ''
    },
    address: {
      street: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      zipCode: { type: String, default: '' },
      country: { type: String, default: 'USA' }
    }
  },
  farmerProfile: {
    stallName: String,
    businessDescription: String,
    markets: [{
      type: mongoose.Schema.Types.Mixed
    }],
    operatingDays: [String],
    pickupTimeWindows: [{
      day: String,
      startTime: String,
      endTime: String
    }],
    location: {
      address: String,
      latitude: Number,
      longitude: Number,
      mapPin: String
    },
    isApproved: {
      type: Boolean,
      default: false
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    totalReviews: {
      type: Number,
      default: 0
    }
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

userSchema.pre('save', async function(next) {
  if (!this.id) {
    this.id = this._id.toString();
  }
  if (!this.name && this.profile?.name) {
    this.name = this.profile.name;
  }
  if (!this.profile?.name && this.name) {
    this.profile = this.profile || {};
    this.profile.name = this.name;
  }
  if (!this.phone && this.profile?.contactNumber) {
    this.phone = this.profile.contactNumber;
  }
  if (!this.profile?.contactNumber && this.phone) {
    this.profile = this.profile || {};
    this.profile.contactNumber = this.phone;
  }

  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
