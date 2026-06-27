const router = require('express').Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/rbac');
const {
  getAnalytics,
  getEmployees,
  createEmployee,
  deactivateEmployee,
  updateEmployee,
  getBranches,
  createBranch,
  reassignCustomer,
  getCustomers,
  updateCustomer,
  getRecentTransactions,
} = require('../controllers/admin.controller');

router.use(auth, authorize('admin'));

router.get('/analytics', getAnalytics);
router.get('/employees', getEmployees);
router.post('/employees', createEmployee);
router.patch('/employees/:id', updateEmployee);
router.delete('/employees/:id', deactivateEmployee);
router.get('/branches', getBranches);
router.post('/branches', createBranch);
router.get('/customers', getCustomers);
router.patch('/customers/:id/reassign', reassignCustomer);
router.patch('/customers/:id', updateCustomer);
router.get('/transactions', getRecentTransactions);

module.exports = router;
