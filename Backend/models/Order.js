const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  customerId: {
    type: String,
    required: true,
    index: true
  },
  farmerId: {
    type: String,
    required: true,
    index: true
  },
  marketId: {
    type: String,
    required: true
  },
  pickupDate: {
    type: String,
    required: true
  },
  pickupSlot: {
    type: String,
    required: true
  },
  total: {
    type: Number,
    required: true,
    min: 0
  },
  totalAmount: {
    type: Number,
    min: 0
  },
  status: {
    type: String,
    enum: ['placed', 'accepted', 'declined', 'preparing', 'ready', 'ready_for_pickup', 'completed', 'cancelled'],
    default: 'placed'
  },
  orderStatus: {
    type: String,
    default: 'placed'
  },
  createdAt: {
    type: String,
    default: () => new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  },
  createdDate: {
    type: Date,
    default: Date.now
  },
  items: [{
    productId: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    unit: String,
    subtotal: Number
  }],
  customerNotes: {
    type: String,
    trim: true
  },
  farmerNotes: {
    type: String,
    trim: true
  },
  cancellationReason: {
    type: String
  },
  cancelledBy: {
    type: String
  },
  cancelledAt: {
    type: Date
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

orderSchema.pre('save', function(next) {
  if (this.total !== undefined && this.totalAmount === undefined) {
    this.totalAmount = this.total;
  }
  if (this.totalAmount !== undefined && this.total === undefined) {
    this.total = this.totalAmount;
  }
  if (this.status) {
    this.orderStatus = this.status;
  }
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Order', orderSchema);
