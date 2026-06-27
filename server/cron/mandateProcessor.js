const cron = require('node-cron');
const Mandate = require('../models/Mandate');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { sendMandateEmail, sendTransactionSMS } = require('../utils/notifications');

/**
 * Process mandates that are due today or earlier.
 * Runs daily at 6:00 AM IST (0:30 UTC).
 */
const processMandates = async () => {
  console.log('[CRON] Running mandate processor...');
  const today = new Date();
  today.setHours(23, 59, 59, 999); // End of today

  try {
    const dueMandates = await Mandate.find({
      status: 'active',
      nextDeductionDate: { $lte: today },
    }).populate('customerUserId', 'firstName lastName email phone');

    if (dueMandates.length === 0) {
      console.log('[CRON] No mandates due today.');
      return;
    }

    console.log(`[CRON] Found ${dueMandates.length} mandate(s) to process.`);

    for (const mandate of dueMandates) {
      try {
        // Find user and their account
        const user = await User.findById(mandate.customerUserId._id || mandate.customerUserId);
        if (!user) {
          console.log(`[CRON] User not found for mandate ${mandate._id}, skipping.`);
          continue;
        }

        const account = user.accounts.find(a => a.accountNumber === mandate.customerAccountNum);
        if (!account) {
          console.log(`[CRON] Account ${mandate.customerAccountNum} not found, skipping.`);
          continue;
        }

        if (account.isFrozen) {
          console.log(`[CRON] Account ${mandate.customerAccountNum} is frozen, skipping.`);
          continue;
        }

        if (account.balance < mandate.amount) {
          console.log(`[CRON] Insufficient balance for mandate ${mandate._id} (need ₹${mandate.amount}, have ₹${account.balance}), skipping.`);
          continue;
        }

        // Deduct amount
        await User.updateOne(
          { _id: user._id, 'accounts.accountNumber': mandate.customerAccountNum },
          { $inc: { 'accounts.$.balance': -mandate.amount } }
        );

        // Create transaction record
        await Transaction.create({
          senderUserId: user._id,
          senderAccountNum: mandate.customerAccountNum,
          receiverUserId: user._id, // Self-reference for mandate deductions
          receiverAccountNum: mandate.customerAccountNum,
          amount: mandate.amount,
          type: 'withdrawal',
          status: 'completed',
          description: `Auto-debit: ${mandate.merchantName} (${mandate.category || 'mandate'})`,
        });

        // Advance next deduction date
        const nextDate = new Date(mandate.nextDeductionDate);
        switch (mandate.frequency) {
          case 'monthly':
            nextDate.setMonth(nextDate.getMonth() + 1);
            break;
          case 'quarterly':
            nextDate.setMonth(nextDate.getMonth() + 3);
            break;
          case 'yearly':
            nextDate.setFullYear(nextDate.getFullYear() + 1);
            break;
        }

        mandate.nextDeductionDate = nextDate;
        mandate.lastDeductionDate = new Date();
        mandate.totalDeducted = (mandate.totalDeducted || 0) + mandate.amount;
        await mandate.save();

        // Send email notification
        const customerEmail = mandate.customerUserId?.email || user.email;
        if (customerEmail) {
          sendMandateEmail(customerEmail, {
            merchantName: mandate.merchantName,
            amount: mandate.amount,
            accountNumber: mandate.customerAccountNum,
            nextDate: nextDate,
          }).catch(() => {}); // Fire and forget
        }

        // SMS notification
        const phone = mandate.customerUserId?.phone || user.phone;
        if (phone) {
          sendTransactionSMS(phone, `VaultBank: ₹${mandate.amount} auto-debited for ${mandate.merchantName}. Bal: ₹${(account.balance - mandate.amount).toFixed(2)}`);
        }

        console.log(`[CRON] Processed mandate ${mandate._id}: ₹${mandate.amount} for ${mandate.merchantName}`);
      } catch (err) {
        console.error(`[CRON] Error processing mandate ${mandate._id}:`, err.message);
      }
    }

    console.log('[CRON] Mandate processing complete.');
  } catch (error) {
    console.error('[CRON] Mandate processor error:', error);
  }
};

/**
 * Start the cron schedule.
 * Runs daily at 6:00 AM IST (00:30 UTC).
 */
const startMandateCron = () => {
  // Run at 6:00 AM IST daily = 00:30 UTC
  cron.schedule('30 0 * * *', processMandates, {
    timezone: 'Asia/Kolkata',
  });

  console.log('[CRON] Mandate processor scheduled: daily at 6:00 AM IST');
};

module.exports = { startMandateCron, processMandates };
