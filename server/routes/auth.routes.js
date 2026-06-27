const router = require('express').Router();
const auth = require('../middleware/auth');
const {
  login,
  signup,
  getMe,
  changePassword,
  googleAuth,
  googleCallback,
} = require('../controllers/auth.controller');

router.post('/login', login);
router.post('/signup', signup);
router.get('/me', auth, getMe);
router.patch('/change-password', auth, changePassword);

// Google OAuth routes
router.get('/google', googleAuth);
router.get('/google/callback', googleCallback);

module.exports = router;
