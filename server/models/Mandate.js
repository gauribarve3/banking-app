const mongoose = require('mongoose');

const mandateSchema = new mongoose.Schema(
  {
    customerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    customerAccountNum: {
      type: String,
      required: true,
    },
    merchantName: {
      type: String,
      required: [true, 'Merchant name is required'],
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [1, 'Amount must be at least ₹1'],
    },
    frequency: {
      type: String,
      enum: ['monthly', 'quarterly', 'yearly'],
      required: true,
      default: 'monthly',
    },
    category: {
      type: String,
      enum: ['SIP', 'subscription', 'EMI', 'insurance', 'utility', 'other'],
      default: 'other',
    },
    nextDeductionDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'paused', 'cancelled'],
      default: 'active',
    },
    lastDeductionDate: {
      type: Date,
    },
    totalDeducted: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

mandateSchema.index({ customerUserId: 1, status: 1 });
mandateSchema.index({ nextDeductionDate: 1, status: 1 });

module.exports = mongoose.model('Mandate', mandateSchema);
