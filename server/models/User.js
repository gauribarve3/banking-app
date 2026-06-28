const mongoose = require('mongoose');

const accountSubSchema = new mongoose.Schema(
  {
    accountType: {
      type: String,
      enum: ['Current', 'Savings', 'FD'],
      required: true,
    },
    accountNumber: {
      type: String,
      required: true,
    },
    balance: {
      type: Number,
      default: 0,
      min: 0,
    },
    isFrozen: {
      type: Boolean,
      default: false,
    },
    // FD Specific metadata
    interestRate: {
      type: Number,
      min: 0,
    },
    maturityDate: {
      type: Date,
    },
    maturityAmount: {
      type: Number,
      min: 0,
    },
  },
  { _id: true }
);

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      minlength: 6,
      // Not required for Google OAuth users
    },
    role: {
      type: String,
      enum: ['customer', 'employee', 'admin'],
      required: true,
    },

    // Google OAuth
    googleId: {
      type: String,
      sparse: true,
    },

    // Profile fields
    dateOfBirth: {
      type: Date,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },

    // Customer-specific: embedded accounts
    accounts: [accountSubSchema],
    assignedEmployeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // Employee-specific: branch assignment & salary
    assignedBranchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
    },
    salary: {
      type: Number,
      default: 65000,
    },

    // Credit Card Sub-Schema
    creditCard: {
      status: {
        type: String,
        enum: ['none', 'eligible', 'applied', 'active', 'rejected', 'frozen'],
        default: 'none',
      },
      cardNumber: { type: String },
      cardLimit: { type: Number, default: 10000 },
      availableLimit: { type: Number, default: 10000 },
      outstandingAmount: { type: Number, default: 0 },
      interestAccrued: { type: Number, default: 0 },
      lastBillingDate: { type: Date },
      dueDate: { type: Date },
      cibilScore: { type: Number, default: 750 },
      applicationDate: { type: Date },
    },

    // Shared
    isActive: {
      type: Boolean,
      default: true,
    },
    vpa: {
      type: String,
      unique: true,
      sparse: true,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.index(
  { 'accounts.accountNumber': 1 },
  { 
    unique: true, 
    partialFilterExpression: { 
      'accounts.accountNumber': { $exists: true, $type: 'string' } 
    } 
  }
);

// Pre-save hook to generate a clean, unique customer VPA
userSchema.pre('save', async function (next) {
  if (this.role === 'customer' && !this.vpa) {
    const baseVpa = `${this.firstName.toLowerCase()}.${this.lastName.toLowerCase()}`.replace(/[^a-z0-9.]/g, '');
    let candidate = `${baseVpa}@vaultbank`;
    let exists = await mongoose.models.User.findOne({ vpa: candidate });
    let counter = 1;
    while (exists) {
      candidate = `${baseVpa}${counter}@vaultbank`;
      exists = await mongoose.models.User.findOne({ vpa: candidate });
      counter++;
    }
    this.vpa = candidate;
  }
  next();
});

// Virtual: full name
userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Ensure virtuals are serialized
userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('User', userSchema);
