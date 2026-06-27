const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    senderUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    senderAccountNum: {
      type: String,
    },
    receiverUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    receiverAccountNum: {
      type: String,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than 0'],
    },
    type: {
      type: String,
      enum: ['transfer', 'deposit', 'withdrawal'],
      required: true,
    },
    status: {
      type: String,
      enum: ['completed', 'pending', 'rejected'],
      default: 'completed',
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Index for fast lookups by sender or receiver
transactionSchema.index({ senderUserId: 1, createdAt: -1 });
transactionSchema.index({ receiverUserId: 1, createdAt: -1 });
transactionSchema.index({ status: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
