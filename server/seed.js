const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
require('dotenv').config();

const User = require('./models/User');
const Transaction = require('./models/Transaction');
const Branch = require('./models/Branch');
const Message = require('./models/Message');

const generateAccountNumber = () => {
  let digits = '9090';
  for (let i = 0; i < 8; i++) {
    digits += Math.floor(Math.random() * 10).toString();
  }
  return digits;
};

const seed = async () => {
  try {
    // Standard connection string resolved earlier
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB for seeding...');

    // Clear existing data
    await User.deleteMany({});
    await Transaction.deleteMany({});
    await Branch.deleteMany({});
    await Message.deleteMany({});
    try {
      await User.collection.dropIndexes();
      console.log('Dropped existing indexes on User collection.');
    } catch (err) {
      console.log('No indexes to drop or collection does not exist yet.');
    }
    console.log('Cleared existing data.');

    // Hash password (shared for all demo accounts)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    // Create branches
    const branch1 = await Branch.create({
      name: 'Mumbai Central',
      code: 'MUM-001',
      location: 'Nariman Point, Mumbai, Maharashtra 400021',
    });

    const branch2 = await Branch.create({
      name: 'Delhi Connaught Place',
      code: 'DEL-002',
      location: 'Block A, Connaught Place, New Delhi 110001',
    });

    console.log('Created 2 branches.');

    // Create admin
    const admin = await User.create({
      firstName: 'Sarah',
      lastName: 'Mitchell',
      email: 'admin@vaultbank.com',
      password: hashedPassword,
      role: 'admin',
    });

    // Create employees with salaries
    const employee1 = await User.create({
      firstName: 'James',
      lastName: 'Anderson',
      email: 'james@vaultbank.com',
      password: hashedPassword,
      role: 'employee',
      assignedBranchId: branch1._id,
      salary: 75000,
    });

    const employee2 = await User.create({
      firstName: 'Maria',
      lastName: 'Santos',
      email: 'maria@vaultbank.com',
      password: hashedPassword,
      role: 'employee',
      assignedBranchId: branch2._id,
      salary: 78000,
    });

    console.log('Created 1 admin and 2 employees.');

    // Pre-generate account numbers for mapping in transactions (Hardcoded 12-digit Indian account numbers)
    const accNums = {
      alice: { current: '909012340001', savings: '909012340002' },
      bob: { current: '909012340003', savings: '909012340004' },
      david: { current: '909012340005', savings: '909012340006' },
      eva: { current: '909012340007', savings: '909012340008' },
      carol: { current: '909012340009', savings: '909012340010' },
      frank: { current: '909012340011', savings: '909012340012' },
      grace: { current: '909012340013', savings: '909012340014' },
      henry: { current: '909012340015', savings: '909012340016' },
    };

    // James Customers (1 - 4)
    const alice = await User.create({
      firstName: 'Alice',
      lastName: 'Johnson',
      email: 'alice@email.com',
      password: hashedPassword,
      role: 'customer',
      assignedBranchId: branch1._id,
      assignedEmployeeId: employee1._id,
      accounts: [
        { accountType: 'Current', accountNumber: accNums.alice.current, balance: 500000.0 },
        { accountType: 'Savings', accountNumber: accNums.alice.savings, balance: 250000.0 },
      ],
      creditCard: {
        status: 'eligible',
        cibilScore: 750,
      }
    });

    const bob = await User.create({
      firstName: 'Bob',
      lastName: 'Williams',
      email: 'bob@email.com',
      password: hashedPassword,
      role: 'customer',
      assignedBranchId: branch1._id,
      assignedEmployeeId: employee1._id,
      accounts: [
        { accountType: 'Current', accountNumber: accNums.bob.current, balance: 500000.0 },
        { accountType: 'Savings', accountNumber: accNums.bob.savings, balance: 180000.0 },
      ],
      creditCard: {
        status: 'active',
        cardNumber: '4111880022334455',
        cardLimit: 10000,
        availableLimit: 6000,
        outstandingAmount: 4000,
        interestAccrued: 0,
        lastBillingDate: new Date(Date.now() - 50 * 86400000),
        dueDate: new Date(Date.now() - 5 * 86400000),
        cibilScore: 720,
        applicationDate: new Date(Date.now() - 55 * 86400000)
      }
    });

    const david = await User.create({
      firstName: 'David',
      lastName: 'Miller',
      email: 'david@email.com',
      password: hashedPassword,
      role: 'customer',
      assignedBranchId: branch1._id,
      assignedEmployeeId: employee1._id,
      accounts: [
        { accountType: 'Current', accountNumber: accNums.david.current, balance: 500000.0 },
        { accountType: 'Savings', accountNumber: accNums.david.savings, balance: 95000.0 },
      ],
    });

    const eva = await User.create({
      firstName: 'Eva',
      lastName: 'Smith',
      email: 'eva@email.com',
      password: hashedPassword,
      role: 'customer',
      assignedBranchId: branch1._id,
      assignedEmployeeId: employee1._id,
      accounts: [
        { accountType: 'Current', accountNumber: accNums.eva.current, balance: 500000.0 },
        { accountType: 'Savings', accountNumber: accNums.eva.savings, balance: 300000.0 },
      ],
    });

    // Maria Customers (5 - 8)
    const carol = await User.create({
      firstName: 'Carol',
      lastName: 'Davis',
      email: 'carol@email.com',
      password: hashedPassword,
      role: 'customer',
      assignedBranchId: branch2._id,
      assignedEmployeeId: employee2._id,
      accounts: [
        { accountType: 'Current', accountNumber: accNums.carol.current, balance: 500000.0 },
        { accountType: 'Savings', accountNumber: accNums.carol.savings, balance: 450000.0 },
      ],
      creditCard: {
        status: 'applied',
        cibilScore: 780,
        applicationDate: new Date(Date.now() - 1 * 86400000)
      }
    });

    const frank = await User.create({
      firstName: 'Frank',
      lastName: 'Jones',
      email: 'frank@email.com',
      password: hashedPassword,
      role: 'customer',
      assignedBranchId: branch2._id,
      assignedEmployeeId: employee2._id,
      accounts: [
        { accountType: 'Current', accountNumber: accNums.frank.current, balance: 500000.0 },
        { accountType: 'Savings', accountNumber: accNums.frank.savings, balance: 120000.0 },
      ],
    });

    const grace = await User.create({
      firstName: 'Grace',
      lastName: 'Taylor',
      email: 'grace@email.com',
      password: hashedPassword,
      role: 'customer',
      assignedBranchId: branch2._id,
      assignedEmployeeId: employee2._id,
      accounts: [
        { accountType: 'Current', accountNumber: accNums.grace.current, balance: 500000.0 },
        { accountType: 'Savings', accountNumber: accNums.grace.savings, balance: 550000.0 },
      ],
    });

    const henry = await User.create({
      firstName: 'Henry',
      lastName: 'Wilson',
      email: 'henry@email.com',
      password: hashedPassword,
      role: 'customer',
      assignedBranchId: branch2._id,
      assignedEmployeeId: employee2._id,
      accounts: [
        { accountType: 'Current', accountNumber: accNums.henry.current, balance: 500000.0 },
        { accountType: 'Savings', accountNumber: accNums.henry.savings, balance: 140000.0 },
      ],
    });

    console.log('Created 8 customers with exactly 1 POC each (4 customers per employee POC).');

    // Create sample transactions over the last 30 days
    const now = Date.now();
    const DAY = 86400000;

    const transactions = [
      {
        senderUserId: alice._id,
        senderAccountNum: accNums.alice.current,
        receiverUserId: bob._id,
        receiverAccountNum: accNums.bob.current,
        amount: 2500.0,
        type: 'transfer',
        status: 'completed',
        description: 'Office supply share',
        createdAt: new Date(now - 28 * DAY),
      },
      {
        senderUserId: bob._id,
        senderAccountNum: accNums.bob.current,
        receiverUserId: carol._id,
        receiverAccountNum: accNums.carol.current,
        amount: 15000.0,
        type: 'transfer',
        status: 'completed',
        description: 'Monthly business consulting',
        createdAt: new Date(now - 25 * DAY),
      },
      {
        senderUserId: carol._id,
        senderAccountNum: accNums.carol.savings,
        receiverUserId: alice._id,
        receiverAccountNum: accNums.alice.savings,
        amount: 30000.0,
        type: 'transfer',
        status: 'completed',
        description: 'Real estate investment dividend',
        createdAt: new Date(now - 20 * DAY),
      },
      {
        senderUserId: alice._id,
        senderAccountNum: accNums.alice.current,
        receiverUserId: carol._id,
        receiverAccountNum: accNums.carol.current,
        amount: 5000.0,
        type: 'transfer',
        status: 'completed',
        description: 'Cousin birthday gift',
        createdAt: new Date(now - 15 * DAY),
      },
      {
        senderUserId: bob._id,
        senderAccountNum: accNums.bob.savings,
        receiverUserId: alice._id,
        receiverAccountNum: accNums.alice.current,
        amount: 7500.0,
        type: 'transfer',
        status: 'completed',
        description: 'Freelance web development services',
        createdAt: new Date(now - 10 * DAY),
      },
      {
        senderUserId: carol._id,
        senderAccountNum: accNums.carol.current,
        receiverUserId: bob._id,
        receiverAccountNum: accNums.bob.current,
        amount: 2000.0,
        type: 'transfer',
        status: 'completed',
        description: 'Event catering deposit',
        createdAt: new Date(now - 7 * DAY),
      },
      {
        senderUserId: alice._id,
        senderAccountNum: accNums.alice.savings,
        receiverUserId: bob._id,
        receiverAccountNum: accNums.bob.savings,
        amount: 50000.0,
        type: 'transfer',
        status: 'completed',
        description: 'Loan repayment',
        createdAt: new Date(now - 5 * DAY),
      },
      // Large transfer > 10,000 requiring employee approval (pending)
      {
        senderUserId: bob._id,
        senderAccountNum: accNums.bob.current,
        receiverUserId: carol._id,
        receiverAccountNum: accNums.carol.savings,
        amount: 120000.0,
        type: 'transfer',
        status: 'pending',
        description: 'Car purchase (pending manager review)',
        createdAt: new Date(now - 2 * DAY),
      },
      // Rejected transfer with reason
      {
        senderUserId: frank._id,
        senderAccountNum: accNums.frank.current,
        receiverUserId: alice._id,
        receiverAccountNum: accNums.alice.current,
        amount: 45000.0,
        type: 'transfer',
        status: 'rejected',
        rejectionReason: 'Invalid recipient details and high risk transaction profile.',
        description: 'Vendor payment',
        approvedBy: employee2._id,
        createdAt: new Date(now - 3 * DAY),
      },
      {
        senderUserId: alice._id,
        senderAccountNum: accNums.alice.current,
        receiverUserId: carol._id,
        receiverAccountNum: accNums.carol.current,
        amount: 3200.0,
        type: 'transfer',
        status: 'completed',
        description: 'Dinner party split',
        createdAt: new Date(now - 1 * DAY),
      },
      // Large transfer > 10,000 requiring employee approval (pending)
      {
        senderUserId: carol._id,
        senderAccountNum: accNums.carol.current,
        receiverUserId: alice._id,
        receiverAccountNum: accNums.alice.current,
        amount: 150000.0,
        type: 'transfer',
        status: 'pending',
        description: 'Home renovation deposit (pending review)',
        createdAt: new Date(now - 0.5 * DAY),
      },
    ];

    await Transaction.insertMany(transactions);
    console.log('Created 11 sample transactions (2 pending, 1 rejected with reason, 8 completed).');

    // Seed persistent messages
    const sampleMessages = [
      {
        senderUserId: alice._id,
        receiverUserId: employee1._id,
        messageText: "Hello James, I need clarification on my recent transfer. Has it been approved?",
        replyText: "Hi Alice, yes, I have approved it just now. You should see the credit reflect in Bob's account.",
        isReplied: true,
        createdAt: new Date(now - 5 * DAY),
      },
      {
        senderUserId: bob._id,
        receiverUserId: employee1._id,
        messageText: "Can I increase my credit limit to ₹25,000?",
        isReplied: false,
        createdAt: new Date(now - 1 * DAY),
      },
      {
        senderUserId: carol._id,
        receiverUserId: employee2._id,
        messageText: "Hi Maria, I have applied for a premium credit card. Please let me know if any other documents are required.",
        isReplied: false,
        createdAt: new Date(now - 0.5 * DAY),
      }
    ];
    await Message.insertMany(sampleMessages);
    console.log('Created 3 sample persistent messages.');

    // Summary
    console.log('\n=== SEED COMPLETE ===');
    console.log('Login credentials (all accounts use the same password):');
    console.log('  Password: password123\n');
    console.log('  Admin:    admin@vaultbank.com');
    console.log('  Employee: james@vaultbank.com');
    console.log('  Employee: maria@vaultbank.com');
    console.log('  Customer: alice@email.com');
    console.log('  Customer: bob@email.com');
    console.log('  Customer: carol@email.com');
    console.log('  Customer: david@email.com');
    console.log('  Customer: eva@email.com');
    console.log('  Customer: frank@email.com');
    console.log('  Customer: grace@email.com');
    console.log('  Customer: henry@email.com');

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB.');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seed();
