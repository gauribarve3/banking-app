const Transaction = require('../models/Transaction');
const User = require('../models/User');

/**
 * Fraud detection middleware for the transfer route.
 * Checks for suspicious patterns and returns a warning instead of processing.
 * If the request includes fraudAcknowledged: true and acknowledgementText: "I UNDERSTAND",
 * it bypasses the check and allows the transfer to proceed.
 */
const fraudCheck = async (req, res, next) => {
  try {
    const { fromAccountNum, toAccountNum, amount, fraudAcknowledged, acknowledgementText } = req.body;

    // If user already acknowledged the fraud warning, let the transfer proceed
    if (fraudAcknowledged === true && acknowledgementText === 'I UNDERSTAND') {
      return next();
    }

    const transferAmount = parseFloat(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      return next(); // Let the controller handle validation
    }

    const warnings = [];

    // Check 1: Amount unusually high compared to user's transaction history
    const recentTransactions = await Transaction.find({
      senderUserId: req.user._id,
      status: 'completed',
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('amount');

    if (recentTransactions.length > 0) {
      const avgAmount = recentTransactions.reduce((sum, tx) => sum + tx.amount, 0) / recentTransactions.length;
      if (transferAmount > avgAmount * 3) {
        warnings.push({
          code: 'UNUSUAL_AMOUNT',
          title: 'Unusually High Amount',
          description: `This transfer of ₹${transferAmount.toLocaleString('en-IN')} is more than 3× your average transaction of ₹${Math.round(avgAmount).toLocaleString('en-IN')}. Scammers often trick victims into sending large sums.`,
        });
      }
    }

    // Check 2: Receiver account created less than 24 hours ago
    if (toAccountNum) {
      const receiver = await User.findOne({
        'accounts.accountNumber': toAccountNum,
        role: 'customer',
      }).select('createdAt');

      if (receiver) {
        const hoursSinceCreation = (Date.now() - new Date(receiver.createdAt).getTime()) / (1000 * 60 * 60);
        if (hoursSinceCreation < 24) {
          warnings.push({
            code: 'NEW_ACCOUNT',
            title: 'Newly Created Account',
            description: 'The recipient\'s account was created less than 24 hours ago. New accounts are commonly used in fraudulent schemes.',
          });
        }
      }
    }

    // Check 3: Late-night transfer (12 AM - 5 AM IST)
    const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const hourIST = nowIST.getHours();
    if (hourIST >= 0 && hourIST < 5) {
      warnings.push({
        code: 'LATE_NIGHT',
        title: 'Late Night Transaction',
        description: `You are making a transfer at ${nowIST.toLocaleTimeString('en-IN')} IST. A disproportionate number of fraud-induced transfers occur between 12 AM and 5 AM.`,
      });
    }

    // If there are warnings, return them instead of proceeding
    if (warnings.length > 0) {
      return res.status(200).json({
        success: false,
        fraudWarning: true,
        message: 'This transaction has been flagged for review. Please verify before proceeding.',
        warnings,
      });
    }

    // No fraud signals detected — proceed to the transfer controller
    next();
  } catch (error) {
    console.error('Fraud check error:', error);
    // On error, let the transfer proceed rather than blocking
    next();
  }
};

module.exports = fraudCheck;
