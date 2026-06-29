const router = require('express').Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/rbac');
const {
  getBranchCustomers,
  getCustomerLedger,
  getPendingTransactions,
  resolveTransaction,
  toggleAccountFreeze,
  getPendingCreditCards,
  resolveCreditCard,
  getAllCustomerCardStatuses,
  getReceivedMessages,
  replyMessage,
  sendCustomerMessage,
  getTransactionRiskContext,
  requestCustomerConsent,
} = require('../controllers/employee.controller');

router.use(auth, authorize('employee'));

router.get('/customers', getBranchCustomers);
router.get('/customers/:id/ledger', getCustomerLedger);
router.post('/customers/:id/consent-request', requestCustomerConsent);
router.get('/pending', getPendingTransactions);
router.get('/transactions/:id/risk-context', getTransactionRiskContext);
router.patch('/transactions/:id', resolveTransaction);
router.patch('/customers/:id/freeze', toggleAccountFreeze);

// Credit Card Reviews
router.get('/credit-cards/pending', getPendingCreditCards);
router.get('/credit-cards/overview', getAllCustomerCardStatuses);
router.patch('/credit-cards/:customerId/resolve', resolveCreditCard);

// Inbox Messaging
router.get('/messages', getReceivedMessages);
router.post('/messages/send', sendCustomerMessage);
router.patch('/messages/:id/reply', replyMessage);

module.exports = router;
