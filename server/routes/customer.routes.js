const router = require('express').Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/rbac');
const fraudCheck = require('../middleware/fraudCheck');
const {
  getAccounts,
  getTransactions,
  getProfile,
  updateProfile,
  initiateTransfer,
  createFD,
  getManagers,
  assignManager,
  requestDeposit,
  applyForCreditCard,
  spendCreditCard,
  repayCreditCard,
  sendMessage,
  getMessages,
} = require('../controllers/customer.controller');

router.use(auth, authorize('customer'));

router.get('/accounts', getAccounts);
router.get('/transactions', getTransactions);
router.get('/profile', getProfile);
router.patch('/profile', updateProfile);
router.post('/transfer', fraudCheck, initiateTransfer);
router.post('/fd/create', createFD);

// Setup Manager Invite
router.get('/managers', getManagers);
router.patch('/assign-manager', assignManager);

// Deposits
router.post('/deposit', requestDeposit);

// Credit Card
router.post('/credit-card/apply', applyForCreditCard);
router.post('/credit-card/spend', spendCreditCard);
router.post('/credit-card/pay', repayCreditCard);

// Persistent Messages
router.post('/messages', sendMessage);
router.get('/messages', getMessages);

module.exports = router;
