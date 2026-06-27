const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Message = require('../models/Message');
const { sendTransactionEmail, sendTransactionSMS } = require('../utils/notifications');

const LARGE_TRANSFER_THRESHOLD = 10000;

// GET /api/customer/accounts
exports.getAccounts = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate({
        path: 'assignedEmployeeId',
        select: 'firstName lastName email',
        populate: { path: 'assignedBranchId', select: 'name' }
      });
      
    // Dynamically calculate credit card eligibility and interest if active
    let creditCard = user.creditCard ? user.creditCard.toObject() : null;
    const totalBalance = user.accounts.reduce((sum, acc) => sum + acc.balance, 0);

    if (creditCard && creditCard.status === 'active' && creditCard.outstandingAmount > 0) {
      const now = new Date();
      const due = new Date(creditCard.dueDate);
      if (now > due) {
        const diffTime = Math.abs(now - due);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const monthlyRate = 0.02;
        const calculatedInterest = Math.round(creditCard.outstandingAmount * monthlyRate * (diffDays / 30) * 100) / 100;
        creditCard.interestAccrued = calculatedInterest;
        
        user.creditCard.interestAccrued = calculatedInterest;
        await user.save();
      }
    } else if (!creditCard || creditCard.status === 'none') {
      if (totalBalance >= 50000) {
        user.creditCard = { status: 'eligible' };
        await user.save();
        creditCard = user.creditCard.toObject();
      }
    }

    res.json({
      success: true,
      accounts: user.accounts,
      poc: user.assignedEmployeeId,
      creditCard: creditCard
    });
  } catch (error) {
    console.error('Get accounts error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// GET /api/customer/transactions
exports.getTransactions = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = {
      $or: [
        { senderUserId: req.user._id },
        { receiverUserId: req.user._id },
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

    let queryBuilder = Transaction.find(query).sort({ createdAt: -1 });
    if (!startDate && !endDate) {
      queryBuilder = queryBuilder.limit(50);
    }

    const transactions = await queryBuilder
      .populate('senderUserId', 'firstName lastName')
      .populate('receiverUserId', 'firstName lastName');

    res.json({ success: true, transactions });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// GET /api/customer/profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password')
      .populate('assignedBranchId', 'name location')
      .populate('assignedEmployeeId', 'firstName lastName email');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    res.json({ success: true, profile: user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// PATCH /api/customer/profile
exports.updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, phone, address, dateOfBirth } = req.body;

    const updateData = {};
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (dateOfBirth) updateData.dateOfBirth = new Date(dateOfBirth);

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Profile updated successfully.',
      profile: user,
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// POST /api/customer/transfer
exports.initiateTransfer = async (req, res) => {
  try {
    const { fromAccountNum, toAccountNum, amount, description } = req.body;

    // Validation
    if (!fromAccountNum || !toAccountNum || !amount) {
      return res.status(400).json({
        success: false,
        message: 'fromAccountNum, toAccountNum, and amount are required.',
      });
    }

    const transferAmount = parseFloat(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be a positive number.',
      });
    }

    if (fromAccountNum === toAccountNum) {
      return res.status(400).json({
        success: false,
        message: 'Cannot transfer to the same account.',
      });
    }

    // Verify sender account
    const sender = await User.findById(req.user._id);
    const senderAccount = sender.accounts.find(
      (acc) => acc.accountNumber === fromAccountNum
    );

    if (!senderAccount) {
      return res.status(404).json({
        success: false,
        message: 'Sender account not found.',
      });
    }

    if (senderAccount.isFrozen) {
      return res.status(403).json({
        success: false,
        message: 'Your account is frozen. Contact your branch manager.',
      });
    }

    if (senderAccount.balance < transferAmount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient funds.',
      });
    }

    // Verify receiver account
    const receiver = await User.findOne({
      'accounts.accountNumber': toAccountNum,
      role: 'customer',
    });

    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: 'Recipient account not found.',
      });
    }

    const receiverAccount = receiver.accounts.find(
      (acc) => acc.accountNumber === toAccountNum
    );

    if (receiverAccount.isFrozen) {
      return res.status(403).json({
        success: false,
        message: 'Recipient account is frozen.',
      });
    }

    // Determine if this needs approval
    const needsApproval = transferAmount > LARGE_TRANSFER_THRESHOLD;
    const status = needsApproval ? 'pending' : 'completed';

    // Create transaction record
    const transaction = await Transaction.create({
      senderUserId: sender._id,
      senderAccountNum: fromAccountNum,
      receiverUserId: receiver._id,
      receiverAccountNum: toAccountNum,
      amount: transferAmount,
      type: 'transfer',
      status,
      description: description || '',
    });

    // If no approval needed, execute the transfer immediately
    if (!needsApproval) {
      // Debit sender
      await User.updateOne(
        { _id: sender._id, 'accounts.accountNumber': fromAccountNum },
        { $inc: { 'accounts.$.balance': -transferAmount } }
      );

      // Credit receiver
      await User.updateOne(
        { _id: receiver._id, 'accounts.accountNumber': toAccountNum },
        { $inc: { 'accounts.$.balance': transferAmount } }
      );
    }

    const populatedTx = await Transaction.findById(transaction._id)
      .populate('senderUserId', 'firstName lastName')
      .populate('receiverUserId', 'firstName lastName');

    // Send notifications (fire and forget)
    const senderName = `${sender.firstName} ${sender.lastName}`;
    const receiverName = `${receiver.firstName} ${receiver.lastName}`;

    // Notify sender (debit)
    sendTransactionEmail(sender.email, {
      type: 'debit',
      amount: transferAmount,
      description: description || 'Fund Transfer',
      counterpartyName: receiverName,
      status,
      accountNumber: fromAccountNum,
    }).catch(() => {});

    // Notify receiver (credit)
    sendTransactionEmail(receiver.email, {
      type: 'credit',
      amount: transferAmount,
      description: description || 'Fund Transfer',
      counterpartyName: senderName,
      status,
      accountNumber: toAccountNum,
    }).catch(() => {});

    // SMS notifications
    if (sender.phone) {
      sendTransactionSMS(sender.phone, `VaultBank: ₹${transferAmount.toLocaleString('en-IN')} ${status === 'completed' ? 'debited from' : 'transfer pending for'} A/C ••${fromAccountNum.slice(-4)} to ${receiverName}. ${description || ''}`);
    }
    if (receiver.phone) {
      sendTransactionSMS(receiver.phone, `VaultBank: ₹${transferAmount.toLocaleString('en-IN')} ${status === 'completed' ? 'credited to' : 'incoming transfer pending for'} A/C ••${toAccountNum.slice(-4)} from ${senderName}.`);
    }

    res.status(201).json({
      success: true,
      message: needsApproval
        ? 'Transfer submitted for approval (amount exceeds ₹10,000).'
        : 'Transfer completed successfully.',
      transaction: populatedTx,
    });
  } catch (error) {
    console.error('Transfer error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// POST /api/customer/fd/create
exports.createFD = async (req, res) => {
  try {
    const { sourceAccountNumber, amount, tenureMonths } = req.body;
    const fdAmount = parseFloat(amount);
    const months = parseInt(tenureMonths);

    if (isNaN(fdAmount) || fdAmount <= 0) {
      return res.status(400).json({ success: false, message: 'FD amount must be a positive number.' });
    }
    if (isNaN(months) || ![12, 36, 60].includes(months)) {
      return res.status(400).json({ success: false, message: 'Invalid tenure. Choose 12, 36, or 60 months.' });
    }

    const user = await User.findById(req.user._id);
    const sourceAccount = user.accounts.find(acc => acc.accountNumber === sourceAccountNumber);

    if (!sourceAccount) {
      return res.status(404).json({ success: false, message: 'Source account not found.' });
    }
    if (sourceAccount.accountType === 'FD') {
      return res.status(400).json({ success: false, message: 'Cannot open an FD using another FD account.' });
    }
    if (sourceAccount.isFrozen) {
      return res.status(403).json({ success: false, message: 'Source account is frozen.' });
    }
    if (sourceAccount.balance < fdAmount) {
      return res.status(400).json({ success: false, message: 'Insufficient funds in the selected source account.' });
    }

    // Calculate interest details (7.1% p.a. compounded annually)
    const rate = 0.071;
    const years = months / 12;
    const maturityAmount = Math.round(fdAmount * Math.pow(1 + rate, years) * 100) / 100;
    const maturityDate = new Date();
    maturityDate.setMonth(maturityDate.getMonth() + months);

    // Debit source account
    await User.updateOne(
      { _id: user._id, 'accounts.accountNumber': sourceAccountNumber },
      { $inc: { 'accounts.$.balance': -fdAmount } }
    );

    // Create unique 12-digit account number for FD starting with 9090
    let fdAccountNumber = '9090';
    for (let i = 0; i < 8; i++) {
      fdAccountNumber += Math.floor(Math.random() * 10).toString();
    }

    // Create the FD subdocument
    const newFD = {
      accountType: 'FD',
      accountNumber: fdAccountNumber,
      balance: fdAmount,
      isFrozen: false,
      interestRate: rate * 100, // e.g. 7.1
      maturityDate,
      maturityAmount
    };

    // Push FD to user accounts
    await User.updateOne(
      { _id: user._id },
      { $push: { accounts: newFD } }
    );

    // Create transaction log
    const transaction = await Transaction.create({
      senderUserId: user._id,
      senderAccountNum: sourceAccountNumber,
      receiverUserId: user._id,
      receiverAccountNum: fdAccountNumber,
      amount: fdAmount,
      type: 'transfer',
      status: 'completed',
      description: `Opened ${months}-month Fixed Deposit @ 7.1% p.a.`
    });

    // Send FD creation notification
    sendTransactionEmail(user.email, {
      type: 'debit',
      amount: fdAmount,
      description: `Fixed Deposit opened (${months} months @ 7.1% p.a.)`,
      counterpartyName: 'VaultBank FD',
      status: 'completed',
      accountNumber: sourceAccountNumber,
    }).catch(() => {});

    if (user.phone) {
      sendTransactionSMS(user.phone, `VaultBank: FD of ₹${fdAmount.toLocaleString('en-IN')} created for ${months} months @ 7.1% p.a. Maturity: ₹${maturityAmount.toLocaleString('en-IN')}`);
    }

    res.status(201).json({
      success: true,
      message: 'Fixed Deposit created successfully!',
      transaction,
      fdAccount: newFD
    });

  } catch (error) {
    console.error('Create FD error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// GET /api/customer/managers
exports.getManagers = async (req, res) => {
  try {
    const managers = await User.find({ role: 'employee', isActive: true })
      .select('firstName lastName email')
      .populate('assignedBranchId', 'name location');
    res.json({ success: true, managers });
  } catch (error) {
    console.error('Get managers error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// PATCH /api/customer/assign-manager
exports.assignManager = async (req, res) => {
  try {
    const { employeeId } = req.body;
    if (!employeeId) {
      return res.status(400).json({ success: false, message: 'Employee ID is required.' });
    }

    const employee = await User.findOne({ _id: employeeId, role: 'employee', isActive: true });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Branch manager not found or inactive.' });
    }

    await User.findByIdAndUpdate(req.user._id, {
      $set: {
        assignedEmployeeId: employee._id,
        assignedBranchId: employee.assignedBranchId
      }
    });

    res.json({
      success: true,
      message: `Branch manager ${employee.firstName} ${employee.lastName} successfully assigned.`,
    });
  } catch (error) {
    console.error('Assign manager error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// POST /api/customer/deposit
exports.requestDeposit = async (req, res) => {
  try {
    const { accountNum, amount, depositDate, depositLocation, sourceOfFunds } = req.body;
    
    if (!accountNum || !amount || !depositDate || !depositLocation || !sourceOfFunds) {
      return res.status(400).json({ success: false, message: 'All deposit details are required.' });
    }

    const depositAmount = parseFloat(amount);
    if (isNaN(depositAmount) || depositAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Deposit amount must be a positive number.' });
    }

    const user = await User.findById(req.user._id);
    const selectedAccount = user.accounts.find(a => a.accountNumber === accountNum);
    if (!selectedAccount) {
      return res.status(404).json({ success: false, message: 'Selected account not found.' });
    }
    if (selectedAccount.isFrozen) {
      return res.status(400).json({ success: false, message: 'Selected account is frozen.' });
    }

    const formattedDesc = `Deposit Request: [Source: ${sourceOfFunds}] [Location: ${depositLocation}] [Date: ${new Date(depositDate).toLocaleDateString('en-IN')}]`;

    const transaction = await Transaction.create({
      receiverUserId: user._id,
      receiverAccountNum: accountNum,
      amount: depositAmount,
      type: 'deposit',
      status: 'pending',
      description: formattedDesc
    });

    res.status(201).json({
      success: true,
      message: 'Deposit request submitted successfully to your branch manager for approval.',
      transaction
    });
  } catch (error) {
    console.error('Request deposit error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// POST /api/customer/credit-card/apply
exports.applyForCreditCard = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const totalBalance = user.accounts.reduce((sum, acc) => sum + acc.balance, 0);
    
    if (totalBalance < 50000 && (!user.creditCard || user.creditCard.status !== 'eligible')) {
      return res.status(400).json({ success: false, message: 'You are not eligible for a credit card. Requires minimum ₹50,000 total balance.' });
    }

    if (user.creditCard && ['applied', 'active'].includes(user.creditCard.status)) {
      return res.status(400).json({ success: false, message: 'You have already applied or have an active card.' });
    }

    user.creditCard = {
      ...user.creditCard,
      status: 'applied',
      applicationDate: new Date(),
    };
    await user.save();

    res.json({ success: true, message: 'Credit card application submitted successfully.', creditCard: user.creditCard });
  } catch (error) {
    console.error('Credit card application error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// POST /api/customer/credit-card/spend
exports.spendCreditCard = async (req, res) => {
  try {
    const { amount, merchant } = req.body;
    if (!amount || !merchant) {
      return res.status(400).json({ success: false, message: 'Amount and merchant name are required.' });
    }

    const spendAmount = parseFloat(amount);
    if (isNaN(spendAmount) || spendAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be a positive number.' });
    }

    const user = await User.findById(req.user._id);
    if (!user.creditCard || !['active'].includes(user.creditCard.status)) {
      if (user.creditCard && user.creditCard.status === 'frozen') {
        return res.status(403).json({ success: false, message: 'Your credit card is frozen. Contact your branch manager to unfreeze it.' });
      }
      return res.status(400).json({ success: false, message: 'You do not have an active credit card.' });
    }

    if (spendAmount > user.creditCard.availableLimit) {
      return res.status(400).json({ success: false, message: 'Transaction declined: Limit exceeded.' });
    }

    user.creditCard.outstandingAmount += spendAmount;
    user.creditCard.availableLimit -= spendAmount;

    // Set due date on first spend of a new billing cycle (45-day grace)
    if (!user.creditCard.dueDate || user.creditCard.outstandingAmount === spendAmount) {
      const newDue = new Date();
      newDue.setDate(newDue.getDate() + 45);
      user.creditCard.dueDate = newDue;
      user.creditCard.lastBillingDate = new Date();
    }

    await user.save();

    // Log card spend transaction
    await Transaction.create({
      senderUserId: user._id,
      senderAccountNum: 'CC-' + user.creditCard.cardNumber.slice(-4),
      amount: spendAmount,
      type: 'withdrawal',
      status: 'completed',
      description: `Credit Card Spend: ${merchant}`
    });

    res.json({
      success: true,
      message: `Transaction of ₹${spendAmount.toLocaleString('en-IN')} approved at ${merchant}.`,
      creditCard: user.creditCard
    });
  } catch (error) {
    console.error('Spend credit card error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// POST /api/customer/credit-card/pay
exports.repayCreditCard = async (req, res) => {
  try {
    const { amount, sourceAccountNum } = req.body;
    if (!amount || !sourceAccountNum) {
      return res.status(400).json({ success: false, message: 'Amount and source account are required.' });
    }

    const payAmount = parseFloat(amount);
    if (isNaN(payAmount) || payAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Repayment amount must be a positive number.' });
    }

    const user = await User.findById(req.user._id);
    if (!user.creditCard || !['active'].includes(user.creditCard.status)) {
      if (user.creditCard && user.creditCard.status === 'frozen') {
        return res.status(403).json({ success: false, message: 'Your credit card is frozen. Contact your branch manager to unfreeze it.' });
      }
      return res.status(400).json({ success: false, message: 'You do not have an active credit card.' });
    }

    const outstandingDues = user.creditCard.outstandingAmount + (user.creditCard.interestAccrued || 0);

    if (payAmount > outstandingDues) {
      return res.status(400).json({ success: false, message: `Repayment amount exceeds outstanding dues (Max: ₹${outstandingDues}).` });
    }

    const account = user.accounts.find(a => a.accountNumber === sourceAccountNum);
    if (!account) {
      return res.status(404).json({ success: false, message: 'Source account not found.' });
    }
    if (account.balance < payAmount) {
      return res.status(400).json({ success: false, message: 'Insufficient funds in selected account.' });
    }

    // Deduct from bank account
    account.balance -= payAmount;

    const now = new Date();
    const isLate = now > new Date(user.creditCard.dueDate);
    let cibilChange = isLate ? -35 : 15;
    const newCibil = Math.min(900, Math.max(300, (user.creditCard.cibilScore || 750) + cibilChange));

    // Update CC outstanding
    if (payAmount >= user.creditCard.interestAccrued) {
      const remainingPay = payAmount - user.creditCard.interestAccrued;
      user.creditCard.interestAccrued = 0;
      user.creditCard.outstandingAmount -= remainingPay;
      user.creditCard.availableLimit = Math.min(user.creditCard.cardLimit, user.creditCard.availableLimit + remainingPay);
    } else {
      user.creditCard.interestAccrued -= payAmount;
    }

    user.creditCard.cibilScore = newCibil;

    if (user.creditCard.outstandingAmount === 0 && user.creditCard.interestAccrued === 0) {
      const nextDue = new Date();
      nextDue.setDate(nextDue.getDate() + 45);
      user.creditCard.dueDate = nextDue;
    }

    await user.save();

    // Log repayment transaction
    await Transaction.create({
      senderUserId: user._id,
      senderAccountNum: sourceAccountNum,
      amount: payAmount,
      type: 'transfer',
      status: 'completed',
      description: `Credit Card Repayment (${isLate ? 'Late' : 'On-time'})`
    });

    res.json({
      success: true,
      message: `Repayment of ₹${payAmount.toLocaleString('en-IN')} successful. CIBIL score is now ${newCibil}.`,
      creditCard: user.creditCard,
      accounts: user.accounts
    });
  } catch (error) {
    console.error('Repay credit card error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// POST /api/customer/messages
exports.sendMessage = async (req, res) => {
  try {
    const { messageText } = req.body;
    if (!messageText || !messageText.trim()) {
      return res.status(400).json({ success: false, message: 'Message text is required.' });
    }
    const customer = await User.findById(req.user._id);
    if (!customer.assignedEmployeeId) {
      return res.status(400).json({ success: false, message: 'No branch manager assigned to your account.' });
    }

    const newMessage = await Message.create({
      senderUserId: customer._id,
      receiverUserId: customer.assignedEmployeeId,
      messageText,
    });

    res.status(201).json({ success: true, message: 'Message sent successfully to your branch manager.', data: newMessage });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// GET /api/customer/messages
exports.getMessages = async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { senderUserId: req.user._id },
        { receiverUserId: req.user._id }
      ]
    })
      .sort({ createdAt: 1 })
      .populate('senderUserId', 'firstName lastName email')
      .populate('receiverUserId', 'firstName lastName email');
    res.json({ success: true, messages });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};
