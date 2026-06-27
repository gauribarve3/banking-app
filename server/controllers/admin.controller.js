const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Branch = require('../models/Branch');
const crypto = require('crypto');

// GET /api/admin/analytics
exports.getAnalytics = async (req, res) => {
  try {
    // Total transaction volume (sum of completed transactions)
    const volumeResult = await Transaction.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, totalVolume: { $sum: '$amount' } } },
    ]);
    const totalVolume = volumeResult.length > 0 ? volumeResult[0].totalVolume : 0;

    // System liquidity (sum of all account balances)
    const liquidityResult = await User.aggregate([
      { $match: { role: 'customer' } },
      { $unwind: '$accounts' },
      { $group: { _id: null, totalLiquidity: { $sum: '$accounts.balance' } } },
    ]);
    const systemLiquidity = liquidityResult.length > 0 ? liquidityResult[0].totalLiquidity : 0;

    // Active user counts
    const activeCustomers = await User.countDocuments({ role: 'customer', isActive: true });
    const activeEmployees = await User.countDocuments({ role: 'employee', isActive: true });

    // Pending transfers
    const pendingTransfers = await Transaction.countDocuments({ status: 'pending' });

    // Total transactions count
    const totalTransactions = await Transaction.countDocuments();

    // Branch liquidity aggregation
    const branchLiquidity = await User.aggregate([
      { $match: { role: 'customer', assignedBranchId: { $ne: null } } },
      { $unwind: '$accounts' },
      {
        $group: {
          _id: '$assignedBranchId',
          totalLiquidity: { $sum: '$accounts.balance' }
        }
      },
      {
        $lookup: {
          from: 'branches',
          localField: '_id',
          foreignField: '_id',
          as: 'branch'
        }
      },
      { $unwind: '$branch' },
      {
        $project: {
          branchName: '$branch.name',
          totalLiquidity: 1
        }
      }
    ]);

    // Transaction status breakdown
    const statusCounts = await Transaction.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // User roles breakdown
    const userRoles = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      analytics: {
        totalVolume,
        systemLiquidity,
        activeCustomers,
        activeEmployees,
        pendingTransfers,
        totalTransactions,
        branchLiquidity,
        statusCounts,
        userRoles,
      },
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// GET /api/admin/employees
exports.getEmployees = async (req, res) => {
  try {
    const employees = await User.find({ role: 'employee' })
      .select('-password')
      .populate('assignedBranchId')
      .sort({ lastName: 1 });

    res.json({ success: true, employees });
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// POST /api/admin/employees
exports.createEmployee = async (req, res) => {
  try {
    const { firstName, lastName, email, password, assignedBranchId } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'firstName, lastName, email, and password are required.',
      });
    }

    // Check for duplicate email
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      });
    }

    // Verify branch exists if provided
    if (assignedBranchId) {
      const branch = await Branch.findById(assignedBranchId);
      if (!branch) {
        return res.status(404).json({
          success: false,
          message: 'Branch not found.',
        });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const employee = await User.create({
      firstName,
      lastName,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: 'employee',
      assignedBranchId: assignedBranchId || undefined,
    });

    const employeeObj = employee.toJSON();
    delete employeeObj.password;

    res.status(201).json({ success: true, employee: employeeObj });
  } catch (error) {
    console.error('Create employee error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// DELETE /api/admin/employees/:id
exports.deactivateEmployee = async (req, res) => {
  try {
    const employee = await User.findOne({
      _id: req.params.id,
      role: 'employee',
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found.',
      });
    }

    employee.isActive = false;
    await employee.save();

    res.json({
      success: true,
      message: `Employee ${employee.firstName} ${employee.lastName} has been deactivated.`,
    });
  } catch (error) {
    console.error('Deactivate employee error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// GET /api/admin/branches
exports.getBranches = async (req, res) => {
  try {
    const branches = await Branch.find().sort({ name: 1 });

    // Enrich with counts
    const enrichedBranches = await Promise.all(
      branches.map(async (branch) => {
        const employeeCount = await User.countDocuments({
          role: 'employee',
          assignedBranchId: branch._id,
          isActive: true,
        });

        return {
          ...branch.toJSON(),
          employeeCount,
        };
      })
    );

    res.json({ success: true, branches: enrichedBranches });
  } catch (error) {
    console.error('Get branches error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// POST /api/admin/branches
exports.createBranch = async (req, res) => {
  try {
    const { name, code, location } = req.body;

    if (!name || !code) {
      return res.status(400).json({
        success: false,
        message: 'Branch name and code are required.',
      });
    }

    const existing = await Branch.findOne({ code: code.toUpperCase() });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'A branch with this code already exists.',
      });
    }

    const branch = await Branch.create({
      name,
      code: code.toUpperCase(),
      location: location || '',
    });

    res.status(201).json({ success: true, branch });
  } catch (error) {
    console.error('Create branch error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// PATCH /api/admin/customers/:id/reassign
exports.reassignCustomer = async (req, res) => {
  try {
    const { branchId } = req.body;

    if (!branchId) {
      return res.status(400).json({
        success: false,
        message: 'branchId is required.',
      });
    }

    const branch = await Branch.findById(branchId);
    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'Branch not found.',
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

    customer.assignedBranchId = branchId;
    await customer.save();

    res.json({
      success: true,
      message: `Customer ${customer.firstName} ${customer.lastName} reassigned to ${branch.name}.`,
    });
  } catch (error) {
    console.error('Reassign customer error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// GET /api/admin/customers
exports.getCustomers = async (req, res) => {
  try {
    const customers = await User.find({ role: 'customer' })
      .select('-password')
      .populate('assignedBranchId')
      .sort({ lastName: 1 });

    res.json({ success: true, customers });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// GET /api/admin/transactions
exports.getRecentTransactions = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = {};

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
    console.error('Get recent transactions error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// PATCH /api/admin/employees/:id
exports.updateEmployee = async (req, res) => {
  try {
    const { assignedBranchId, salary } = req.body;
    const employee = await User.findOne({ _id: req.params.id, role: 'employee' });

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    if (assignedBranchId) {
      const branch = await Branch.findById(assignedBranchId);
      if (!branch) {
        return res.status(404).json({ success: false, message: 'Branch not found.' });
      }
      employee.assignedBranchId = assignedBranchId;
    }

    if (salary !== undefined) {
      const parsedSalary = parseFloat(salary);
      if (isNaN(parsedSalary) || parsedSalary < 0) {
        return res.status(400).json({ success: false, message: 'Salary must be a non-negative number.' });
      }
      employee.salary = parsedSalary;
    }

    await employee.save();

    const updatedEmployee = await User.findById(employee._id)
      .select('-password')
      .populate('assignedBranchId');

    res.json({
      success: true,
      message: 'Employee updated successfully.',
      employee: updatedEmployee
    });
  } catch (error) {
    console.error('Update employee error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// PATCH /api/admin/customers/:id
exports.updateCustomer = async (req, res) => {
  try {
    const { assignedEmployeeId } = req.body;
    const customer = await User.findOne({ _id: req.params.id, role: 'customer' });

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    if (assignedEmployeeId) {
      const employee = await User.findOne({ _id: assignedEmployeeId, role: 'employee' });
      if (!employee) {
        return res.status(404).json({ success: false, message: 'Branch Manager not found.' });
      }
      customer.assignedEmployeeId = assignedEmployeeId;
    }

    await customer.save();

    const updatedCustomer = await User.findById(customer._id)
      .select('-password')
      .populate('assignedBranchId')
      .populate('assignedEmployeeId', 'firstName lastName email');

    res.json({
      success: true,
      message: 'Customer POC updated successfully.',
      customer: updatedCustomer
    });
  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};
