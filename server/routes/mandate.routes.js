const router = require('express').Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/rbac');
const {
  getMandates,
  createMandate,
  pauseMandate,
  resumeMandate,
  revokeMandate,
} = require('../controllers/mandate.controller');

router.use(auth, authorize('customer'));

router.get('/', getMandates);
router.post('/', createMandate);
router.patch('/:id/pause', pauseMandate);
router.patch('/:id/resume', resumeMandate);
router.patch('/:id/revoke', revokeMandate);

module.exports = router;
