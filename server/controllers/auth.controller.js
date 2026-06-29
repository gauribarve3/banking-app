const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account has been deactivated. Contact an administrator.',
      });
    }

    // Google-only users cannot login with password
    if (!user.password) {
      return res.status(401).json({
        success: false,
        message: 'This account uses Google Sign-In. Please use the Google button.',
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.',
      });
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Strip password from response
    const userObj = user.toJSON();
    delete userObj.password;

    res.json({
      success: true,
      token,
      user: userObj,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// POST /api/auth/signup
exports.signup = async (req, res) => {
  try {
    const { firstName, lastName, email, password, confirmPassword, dateOfBirth, phone } = req.body;

    // Validation
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'First name, last name, email, and password are required.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters.',
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match.',
      });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate 12-digit Indian account numbers (9090xxxxxxxx)
    const generateIndianAccNum = () => {
      let digits = '9090';
      for (let i = 0; i < 8; i++) {
        digits += Math.floor(Math.random() * 10).toString();
      }
      return digits;
    };
    const currentAccNum = generateIndianAccNum();
    const savingsAccNum = generateIndianAccNum();

    // Assign to a random employee (branch manager) if available
    const employees = await User.find({ role: 'employee', isActive: true }).select('_id assignedBranchId');
    const assignedEmployee = employees.length > 0
      ? employees[Math.floor(Math.random() * employees.length)]
      : null;

    // Create user
    const newUser = await User.create({
      firstName,
      lastName,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: 'customer',
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      phone: phone || '',
      assignedEmployeeId: assignedEmployee?._id,
      assignedBranchId: assignedEmployee?.assignedBranchId,
      accounts: [
        { accountType: 'Current', accountNumber: currentAccNum, balance: 0 },
        { accountType: 'Savings', accountNumber: savingsAccNum, balance: 0 },
      ],
    });

    // Generate JWT
    const token = jwt.sign(
      { userId: newUser._id, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    const userObj = newUser.toJSON();
    delete userObj.password;

    res.status(201).json({
      success: true,
      message: 'Account created successfully! Welcome to VaultBank.',
      token,
      user: userObj,
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// GET /api/auth/me
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password')
      .populate('assignedBranchId');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    res.json({ success: true, user });
  } catch (error) {
    console.error('GetMe error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// PATCH /api/auth/change-password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required.',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters.',
      });
    }

    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({
        success: false,
        message: 'New passwords do not match.',
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (!user.password) {
      return res.status(400).json({
        success: false,
        message: 'This account uses Google Sign-In and does not have a password to change.',
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect.',
      });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully.',
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// GET /api/auth/google — Redirect to Google OAuth
exports.googleAuth = (req, res, next) => {
  const passport = require('passport');
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
};

// GET /api/auth/google/callback — Handle Google OAuth callback
exports.googleCallback = (req, res, next) => {
  const passport = require('passport');
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

  passport.authenticate('google', { session: false, failureRedirect: '/login?error=google_auth_failed' }, async (err, profile) => {
    if (err || !profile) {
      return res.redirect(`${clientUrl}/login?error=google_auth_failed`);
    }

    try {
      let user = await User.findOne({ googleId: profile.id });

      if (!user) {
        // Check if email already exists
        user = await User.findOne({ email: profile.emails[0].value.toLowerCase() });
        if (user) {
          // Link Google ID to existing user
          user.googleId = profile.id;
          await user.save();
        } else {
          // Create new user from Google profile (Hardcoded 12-digit Indian account numbers)
          const generateIndianAccNum = () => {
            let digits = '9090';
            for (let i = 0; i < 8; i++) {
              digits += Math.floor(Math.random() * 10).toString();
            }
            return digits;
          };
          const currentAccNum = generateIndianAccNum();
          const savingsAccNum = generateIndianAccNum();

          user = await User.create({
            googleId: profile.id,
            firstName: profile.name?.givenName || 'User',
            lastName: profile.name?.familyName || 'GoogleUser',
            email: profile.emails[0].value.toLowerCase(),
            role: 'customer',
            assignedEmployeeId: null, // First-time Google customers choose their invited manager
            assignedBranchId: null,
            accounts: [
              { accountType: 'Current', accountNumber: currentAccNum, balance: 0 },
              { accountType: 'Savings', accountNumber: savingsAccNum, balance: 0 },
            ],
          });
        }
      }

      // Generate JWT
      const token = jwt.sign(
        { userId: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Redirect to frontend with token
      res.redirect(`${clientUrl}/auth/google/callback?token=${token}`);
    } catch (error) {
      console.error('Google callback error:', error);
      res.redirect(`${clientUrl}/login?error=server_error`);
    }
  })(req, res, next);
};
