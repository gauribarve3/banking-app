const mongoose = require('mongoose');

const dataConsentSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  dataScope: {
    type: [String],
    default: ['transactions_6m', 'account_summary']
  },
  purpose: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'granted', 'denied', 'revoked', 'expired'],
    default: 'pending'
  },
  grantedAt: {
    type: Date,
    default: null
  },
  expiresAt: {
    type: Date,
    default: null
  },
  revokedAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model('DataConsent', dataConsentSchema);
