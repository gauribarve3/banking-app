const Mandate = require('../models/Mandate');
const User = require('../models/User');

// GET /api/customer/mandates
exports.getMandates = async (req, res) => {
  try {
    const mandates = await Mandate.find({ customerUserId: req.user._id })
      .sort({ status: 1, nextDeductionDate: 1 });

    res.json({ success: true, mandates });
  } catch (error) {
    console.error('Get mandates error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// POST /api/customer/mandates
exports.createMandate = async (req, res) => {
  try {
    const { customerAccountNum, merchantName, amount, frequency, category, nextDeductionDate } = req.body;

    if (!customerAccountNum || !merchantName || !amount || !nextDeductionDate) {
      return res.status(400).json({
        success: false,
        message: 'Account, merchant name, amount, and next deduction date are required.',
      });
    }

    // Verify account exists and belongs to user
    const user = await User.findById(req.user._id);
    const account = user.accounts.find(a => a.accountNumber === customerAccountNum);
    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found.' });
    }
    if (account.isFrozen) {
      return res.status(403).json({ success: false, message: 'Account is frozen.' });
    }
    if (account.accountType === 'FD') {
      return res.status(400).json({ success: false, message: 'Cannot set up mandates on FD accounts.' });
    }

    const mandate = await Mandate.create({
      customerUserId: req.user._id,
      customerAccountNum,
      merchantName,
      amount: parseFloat(amount),
      frequency: frequency || 'monthly',
      category: category || 'other',
      nextDeductionDate: new Date(nextDeductionDate),
    });

    res.status(201).json({
      success: true,
      message: `Mandate for ${merchantName} created successfully.`,
      mandate,
    });
  } catch (error) {
    console.error('Create mandate error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// PATCH /api/customer/mandates/:id/pause
exports.pauseMandate = async (req, res) => {
  try {
    const mandate = await Mandate.findOne({
      _id: req.params.id,
      customerUserId: req.user._id,
    });

    if (!mandate) {
      return res.status(404).json({ success: false, message: 'Mandate not found.' });
    }
    if (mandate.status !== 'active') {
      return res.status(400).json({ success: false, message: `Cannot pause a ${mandate.status} mandate.` });
    }

    mandate.status = 'paused';
    await mandate.save();

    res.json({ success: true, message: `Mandate for ${mandate.merchantName} paused.`, mandate });
  } catch (error) {
    console.error('Pause mandate error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// PATCH /api/customer/mandates/:id/resume
exports.resumeMandate = async (req, res) => {
  try {
    const mandate = await Mandate.findOne({
      _id: req.params.id,
      customerUserId: req.user._id,
    });

    if (!mandate) {
      return res.status(404).json({ success: false, message: 'Mandate not found.' });
    }
    if (mandate.status !== 'paused') {
      return res.status(400).json({ success: false, message: `Cannot resume a ${mandate.status} mandate.` });
    }

    mandate.status = 'active';
    // If next deduction date is in the past, advance it
    if (mandate.nextDeductionDate < new Date()) {
      mandate.nextDeductionDate = new Date();
      mandate.nextDeductionDate.setDate(mandate.nextDeductionDate.getDate() + 1);
    }
    await mandate.save();

    res.json({ success: true, message: `Mandate for ${mandate.merchantName} resumed.`, mandate });
  } catch (error) {
    console.error('Resume mandate error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// PATCH /api/customer/mandates/:id/revoke
exports.revokeMandate = async (req, res) => {
  try {
    const mandate = await Mandate.findOne({
      _id: req.params.id,
      customerUserId: req.user._id,
    });

    if (!mandate) {
      return res.status(404).json({ success: false, message: 'Mandate not found.' });
    }
    if (mandate.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Mandate is already cancelled.' });
    }

    mandate.status = 'cancelled';
    await mandate.save();

    res.json({ success: true, message: `Mandate for ${mandate.merchantName} has been cancelled.`, mandate });
  } catch (error) {
    console.error('Revoke mandate error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};
