const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Message = require('../models/Message');
const DataConsent = require('../models/DataConsent');
const { sendTransactionEmail, sendTransactionSMS } = require('../utils/notifications');

// GET /api/employee/customers
exports.getBranchCustomers = async (req, res) => {
  try {
    const employee = req.user;
    if (!employee.assignedBranchId) {
      return res.status(400).json({
        success: false,
        message: 'No branch assigned to this employee.',
      });
    }

    // Customers don't have branches directly — we use a convention:
    // customers are assigned to branches via an assignedBranchId field
    // For this system, we'll consider all customers visible to all employees
    // since customers aren't branch-specific in the schema. 
    // A more complex system would add assignedBranchId to customers too.
    const customers = await User.find({ role: 'customer', isActive: true })
      .select('-password')
      .sort({ lastName: 1 });

    res.json({ success: true, customers });
  } catch (error) {
    console.error('Get branch customers error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// GET /api/employee/customers/:id/ledger
exports.getCustomerLedger = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const customer = await User.findOne({
      _id: req.params.id,
      role: 'customer',
    }).select('-password');

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found.',
      });
    }

    const query = {
      $or: [
        { senderUserId: customer._id },
        { receiverUserId: customer._id },
      ],
    };

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    // Check for active Account Aggregator consent
    const consent = await DataConsent.findOne({
      customerId: customer._id,
      status: 'granted',
      expiresAt: { $gt: new Date() }
    });

    if (!consent) {
      return res.json({ success: true, customer, consentGranted: false, transactions: [] });
    }

    let queryBuilder = Transaction.find(query).sort({ createdAt: -1 });
    if (!startDate && !endDate) {
      queryBuilder = queryBuilder.limit(100);
    }

    const transactions = await queryBuilder
      .populate('senderUserId', 'firstName lastName')
      .populate('receiverUserId', 'firstName lastName');

    res.json({ success: true, customer, consentGranted: true, transactions });
  } catch (error) {
    console.error('Get customer ledger error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// GET /api/employee/pending
exports.getPendingTransactions = async (req, res) => {
  try {
    const pendingTxns = await Transaction.find({ status: 'pending' })
      .sort({ createdAt: -1 })
      .populate('senderUserId', 'firstName lastName')
      .populate('receiverUserId', 'firstName lastName');

    res.json({ success: true, transactions: pendingTxns });
  } catch (error) {
    console.error('Get pending transactions error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// PATCH /api/employee/transactions/:id
exports.resolveTransaction = async (req, res) => {
  try {
    const { action } = req.body; // 'approve' or 'reject'

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Action must be "approve" or "reject".',
      });
    }

    const transaction = await Transaction.findById(req.params.id)
      .populate('senderUserId')
      .populate('receiverUserId');
      
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found.',
      });
    }

    if (transaction.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Transaction is already ${transaction.status}.`,
      });
    }

    const sender = transaction.senderUserId;
    const receiver = transaction.receiverUserId;
    const senderName = sender ? `${sender.firstName} ${sender.lastName}` : 'Self';
    const receiverName = receiver ? `${receiver.firstName} ${receiver.lastName}` : 'N/A';

    if (action === 'approve') {
      if (transaction.type === 'deposit') {
        // Just credit the receiver
        await User.updateOne(
          { _id: receiver._id, 'accounts.accountNumber': transaction.receiverAccountNum },
          { $inc: { 'accounts.$.balance': transaction.amount } }
        );
      } else {
        const senderAccount = sender.accounts.find(
          (acc) => acc.accountNumber === transaction.senderAccountNum
        );

        if (!senderAccount || senderAccount.balance < transaction.amount) {
          return res.status(400).json({
            success: false,
            message: 'Sender has insufficient funds to complete this transfer.',
          });
        }

        // Execute the transfer
        await User.updateOne(
          { _id: sender._id, 'accounts.accountNumber': transaction.senderAccountNum },
          { $inc: { 'accounts.$.balance': -transaction.amount } }
        );

        await User.updateOne(
          { _id: receiver._id, 'accounts.accountNumber': transaction.receiverAccountNum },
          { $inc: { 'accounts.$.balance': transaction.amount } }
        );
      }
      transaction.status = 'completed';
    } else {
      transaction.status = 'rejected';
      transaction.rejectionReason = req.body.rejectionReason || 'No reason provided by manager.';

      // Feature 5: Freeze credit card on large transfer rejection (≥ ₹50,000)
      if (transaction.type === 'transfer' && transaction.amount >= 50000 && sender) {
        const senderFresh = await User.findById(sender._id);
        if (senderFresh.creditCard && senderFresh.creditCard.status === 'active') {
          senderFresh.creditCard.status = 'frozen';
          await senderFresh.save();
          console.log(`Credit card FROZEN for ${senderFresh.firstName} ${senderFresh.lastName} due to rejected ₹${transaction.amount} transfer.`);
        }
      }
    }

    transaction.approvedBy = req.user._id;
    await transaction.save();

    // Send notifications to sender & receiver
    if (action === 'approve') {
      if (transaction.type === 'deposit') {
        sendTransactionEmail({
          email: receiver.email,
          name: receiverName,
          subject: `Deposit Request Approved: Credit Alert`,
          amount: transaction.amount,
          type: 'Credit',
          accountNum: transaction.receiverAccountNum,
          status: 'completed',
          counterpartyName: 'Self-Deposit',
          accountNumber: 'N/A',
        }).catch(() => {});

        if (receiver.phone) {
          sendTransactionSMS(receiver.phone, `VaultBank: Your deposit request of ₹${transaction.amount.toLocaleString('en-IN')} to A/C ••${transaction.receiverAccountNum.slice(-4)} was APPROVED.`);
        }
      } else {
        sendTransactionEmail({
          email: sender.email,
          name: senderName,
          subject: `Transaction Approved: Debit Alert`,
          amount: transaction.amount,
          type: 'Debit',
          accountNum: transaction.senderAccountNum,
          status: 'completed',
          counterpartyName: receiverName,
          accountNumber: transaction.receiverAccountNum,
        }).catch(() => {});

        sendTransactionEmail({
          email: receiver.email,
          name: receiverName,
          subject: `Transaction Alert: Credit`,
          amount: transaction.amount,
          type: 'Credit',
          accountNum: transaction.receiverAccountNum,
          status: 'completed',
          counterpartyName: senderName,
          accountNumber: transaction.senderAccountNum,
        }).catch(() => {});

        if (sender.phone) {
          sendTransactionSMS(sender.phone, `VaultBank: Your transfer of ₹${transaction.amount.toLocaleString('en-IN')} to ${receiverName} was APPROVED by branch manager.`);
        }
        if (receiver.phone) {
          sendTransactionSMS(receiver.phone, `VaultBank: ₹${transaction.amount.toLocaleString('en-IN')} credited to A/C ••${transaction.receiverAccountNum.slice(-4)} from ${senderName}.`);
        }
      }
    } else {
      if (transaction.type === 'deposit') {
        sendTransactionEmail({
          email: receiver.email,
          name: receiverName,
          subject: `Deposit Request Rejected`,
          amount: transaction.amount,
          type: 'Credit',
          accountNum: transaction.receiverAccountNum,
          status: 'rejected',
          counterpartyName: 'Self-Deposit',
          accountNumber: 'N/A',
          rejectionReason: transaction.rejectionReason,
        }).catch(() => {});

        if (receiver.phone) {
          sendTransactionSMS(receiver.phone, `VaultBank: Your deposit request of ₹${transaction.amount.toLocaleString('en-IN')} was REJECTED by branch manager. Reason: ${transaction.rejectionReason}`);
        }
      } else {
        sendTransactionEmail({
          email: sender.email,
          name: senderName,
          subject: `Transaction Rejected: Transfer Cancelled`,
          amount: transaction.amount,
          type: 'Debit',
          accountNum: transaction.senderAccountNum,
          status: 'rejected',
          counterpartyName: receiverName,
          accountNumber: transaction.receiverAccountNum,
          rejectionReason: transaction.rejectionReason,
        }).catch(() => {});

        if (sender.phone) {
          sendTransactionSMS(sender.phone, `VaultBank: Your transfer of ₹${transaction.amount.toLocaleString('en-IN')} to ${receiverName} was REJECTED by branch manager. Reason: ${transaction.rejectionReason}`);
        }
      }
    }

    const populatedTx = await Transaction.findById(transaction._id)
      .populate('senderUserId', 'firstName lastName')
      .populate('receiverUserId', 'firstName lastName')
      .populate('approvedBy', 'firstName lastName');

    // Emit real-time status update to both parties
    const io = req.app.get('io');
    if (populatedTx.senderUserId) {
      io.to('user:' + populatedTx.senderUserId._id).emit('transaction:status_update', { transaction: populatedTx });
    }
    if (populatedTx.receiverUserId) {
      io.to('user:' + populatedTx.receiverUserId._id).emit('transaction:status_update', { transaction: populatedTx });
    }

    res.json({
      success: true,
      message: `Transaction ${action}d successfully.`,
      transaction: populatedTx,
    });
  } catch (error) {
    console.error('Resolve transaction error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// PATCH /api/employee/customers/:id/freeze
exports.toggleAccountFreeze = async (req, res) => {
  try {
    const { accountNumber, frozen } = req.body;

    if (!accountNumber || typeof frozen !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'accountNumber and frozen (boolean) are required.',
      });
    }

    const customer = await User.findOne({
      _id: req.params.id,
      role: 'customer',
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found.',
      });
    }

    const account = customer.accounts.find(
      (acc) => acc.accountNumber === accountNumber
    );

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found.',
      });
    }

    await User.updateOne(
      { _id: customer._id, 'accounts.accountNumber': accountNumber },
      { $set: { 'accounts.$.isFrozen': frozen } }
    );

    res.json({
      success: true,
      message: `Account ${accountNumber} has been ${frozen ? 'frozen' : 'unfrozen'}.`,
    });
  } catch (error) {
    console.error('Toggle freeze error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// GET /api/employee/credit-cards/pending
exports.getPendingCreditCards = async (req, res) => {
  try {
    const pendingCustomers = await User.find({
      role: 'customer',
      'creditCard.status': 'applied'
    }).select('firstName lastName email creditCard');
    
    res.json({ success: true, customers: pendingCustomers });
  } catch (error) {
    console.error('Get pending credit cards error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// PATCH /api/employee/credit-cards/:customerId/resolve
exports.resolveCreditCard = async (req, res) => {
  try {
    const { action } = req.body;
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Invalid action.' });
    }

    const customer = await User.findById(req.params.customerId);
    if (!customer || customer.role !== 'customer') {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    if (customer.creditCard.status !== 'applied') {
      return res.status(400).json({ success: false, message: 'No pending application for this customer.' });
    }

    if (action === 'approve') {
      let cardNum = '4111';
      for (let i = 0; i < 12; i++) {
        cardNum += Math.floor(Math.random() * 10).toString();
      }

      const billingDate = new Date();
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 45);

      customer.creditCard = {
        status: 'active',
        cardNumber: cardNum,
        cardLimit: 10000,
        availableLimit: 10000,
        outstandingAmount: 0,
        interestAccrued: 0,
        lastBillingDate: billingDate,
        dueDate: dueDate,
        cibilScore: customer.creditCard.cibilScore || 750,
        applicationDate: customer.creditCard.applicationDate,
      };
    } else {
      customer.creditCard = {
        status: 'rejected',
        cibilScore: customer.creditCard.cibilScore || 750,
      };
    }

    await customer.save();
    res.json({ success: true, message: `Credit card application ${action}d successfully.`, customer });
  } catch (error) {
    console.error('Resolve credit card error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// GET /api/employee/messages
exports.getReceivedMessages = async (req, res) => {
  try {
    const messages = await Message.find({ receiverUserId: req.user._id })
      .sort({ createdAt: -1 })
      .populate('senderUserId', 'firstName lastName email');
    res.json({ success: true, messages });
  } catch (error) {
    console.error('Get employee messages error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// PATCH /api/employee/messages/:id/reply
exports.replyMessage = async (req, res) => {
  try {
    const { replyText } = req.body;
    if (!replyText || !replyText.trim()) {
      return res.status(400).json({ success: false, message: 'Reply text is required.' });
    }

    const message = await Message.findOne({ _id: req.params.id, receiverUserId: req.user._id });
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found.' });
    }

    message.replyText = replyText;
    message.isReplied = true;
    await message.save();

    // Emit real-time message update to customer
    req.app.get('io').to('user:' + message.senderUserId).emit('message:received', { message });

    res.json({ success: true, message: 'Reply submitted successfully.', data: message });
  } catch (error) {
    console.error('Reply message error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// GET /api/employee/credit-cards/overview
exports.getAllCustomerCardStatuses = async (req, res) => {
  try {
    // Get all customers assigned to this manager
    const customers = await User.find({
      role: 'customer',
      assignedEmployeeId: req.user._id
    }).select('firstName lastName email creditCard accounts');

    const overview = customers.map(c => {
      const totalBalance = c.accounts.reduce((sum, a) => sum + a.balance, 0);
      const cc = c.creditCard || { status: 'none' };
      return {
        _id: c._id,
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email,
        totalBalance,
        creditCard: {
          status: cc.status || 'none',
          cardNumber: cc.cardNumber,
          cardLimit: cc.cardLimit || 0,
          availableLimit: cc.availableLimit || 0,
          outstandingAmount: cc.outstandingAmount || 0,
          interestAccrued: cc.interestAccrued || 0,
          dueDate: cc.dueDate,
          cibilScore: cc.cibilScore || 750,
        }
      };
    });

    res.json({ success: true, overview });
  } catch (error) {
    console.error('Get customer card overview error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// POST /api/employee/messages/send
exports.sendCustomerMessage = async (req, res) => {
  try {
    const { customerId, messageText } = req.body;
    if (!customerId || !messageText || !messageText.trim()) {
      return res.status(400).json({ success: false, message: 'Customer ID and message text are required.' });
    }

    const customer = await User.findOne({ _id: customerId, role: 'customer' });
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    const newMessage = await Message.create({
      senderUserId: req.user._id,
      receiverUserId: customer._id,
      messageText: messageText.trim(),
    });

    // Emit real-time message update to customer
    req.app.get('io').to('user:' + customer._id).emit('message:received', { message: newMessage });

    res.status(201).json({ success: true, message: 'Message sent to customer successfully.', data: newMessage });
  } catch (error) {
    console.error('Send customer message error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// GET /api/employee/transactions/:id/risk-context
exports.getTransactionRiskContext = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found.' });
    }

    const customerId = transaction.senderUserId;
    if (!customerId) {
      return res.status(400).json({ success: false, message: 'Transaction has no sender.' });
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // 1. Core historical aggregation
    const statsArray = await Transaction.aggregate([
      {
        $match: {
          senderUserId: customerId,
          status: 'completed',
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: null,
          avgAmount: { $avg: '$amount' },
          maxAmount: { $max: '$amount' },
          txCount: { $sum: 1 },
          uniqueRecipients: { $addToSet: '$receiverAccountNum' }
        }
      }
    ]);

    const stats = statsArray[0] || {
      avgAmount: 0,
      maxAmount: 0,
      txCount: 0,
      uniqueRecipients: []
    };

    // 2. Transaction times distribution
    const timeDistribution = await Transaction.aggregate([
      {
        $match: {
          senderUserId: customerId,
          status: 'completed',
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $project: {
          hour: { $hour: '$createdAt' }
        }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $and: [{ $gte: ['$hour', 6] }, { $lt: ['$hour', 12] }] }, 'Morning (6am-12pm)',
              { $cond: [
                { $and: [{ $gte: ['$hour', 12] }, { $lt: ['$hour', 17] }] }, 'Afternoon (12pm-5pm)',
                { $cond: [
                  { $and: [{ $gte: ['$hour', 17] }, { $lt: ['$hour', 21] }] }, 'Evening (5pm-9pm)',
                  'Night (9pm-6am)'
                ]}
              ]}
            ]
          },
          count: { $sum: 1 }
        }
      }
    ]);

    // Format times into a clean object
    const times = {
      'Morning (6am-12pm)': 0,
      'Afternoon (12pm-5pm)': 0,
      'Evening (5pm-9pm)': 0,
      'Night (9pm-6am)': 0
    };
    timeDistribution.forEach(item => {
      if (item._id) {
        times[item._id] = item.count;
      }
    });

    // 3. Count past transactions to this specific recipient
    const previousTransfersCount = await Transaction.countDocuments({
      senderUserId: customerId,
      receiverAccountNum: transaction.receiverAccountNum,
      status: 'completed'
    });

    res.json({
      success: true,
      riskMetrics: {
        avgAmount30Days: Math.round(stats.avgAmount),
        maxAmount30Days: stats.maxAmount,
        txCount30Days: stats.txCount,
        uniqueRecipients30Days: stats.uniqueRecipients.length,
        previousTransfersToRecipient: previousTransfersCount,
        isNewRecipient: previousTransfersCount === 0,
        timeDistribution: times,
        weeklyFrequency: parseFloat((stats.txCount / 4.2).toFixed(1))
      }
    });
  } catch (error) {
    console.error('Get transaction risk context error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// POST /api/employee/customers/:id/consent-request
exports.requestCustomerConsent = async (req, res) => {
  try {
    const customerId = req.params.id;
    const customer = await User.findOne({ _id: customerId, role: 'customer' });
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    // Create a pending consent request
    const consent = await DataConsent.create({
      customerId,
      requestedBy: req.user._id,
      purpose: 'extended_financial_review (Manager Ledger Review)',
      dataScope: ['transactions_6m', 'account_summary'],
      status: 'pending'
    });

    // Populate requestedBy for UI consistency
    const populatedConsent = await DataConsent.findById(consent._id)
      .populate('requestedBy', 'firstName lastName email role');

    // Push real-time event to customer room
    const io = req.app.get('io');
    io.to('user:' + customerId).emit('consent:requested', { consent: populatedConsent });

    res.status(201).json({
      success: true,
      message: 'Extended review consent request sent to customer successfully.',
      consent: populatedConsent
    });
  } catch (error) {
    console.error('Request customer consent error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

