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

const { authRateLimiter } = require('../middleware/rateLimiter');

router.post('/login', authRateLimiter, login);
router.post('/signup', authRateLimiter, signup);
router.get('/me', auth, getMe);
router.patch('/change-password', auth, changePassword);

// Google OAuth routes
router.get('/google', googleAuth);
router.get('/google/callback', googleCallback);

module.exports = router;
