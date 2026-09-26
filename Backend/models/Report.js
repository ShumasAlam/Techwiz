const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  reportType: {
    type: String,
    required: true,
    enum: [
      'Market activity report',
      'Farmer revenue summary',
      'Customer growth report',
      'Inventory availability report'
    ]
  },
  generatedBy: {
    type: String,
    default: 'admin'
  },
  metrics: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  csvData: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Report', reportSchema);
