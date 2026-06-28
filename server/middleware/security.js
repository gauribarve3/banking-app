// Anti NoSQL Injection & Input Sanitization Middleware

const sanitizeValue = (val) => {
  if (typeof val === 'string') {
    // 1. Strip basic HTML tags (simple XSS prevention)
    let sanitized = val.replace(/<[^>]*>/g, '');
    
    // 2. Escape typical script tags or event handlers
    sanitized = sanitized.replace(/javascript:/gi, '');
    sanitized = sanitized.replace(/onload=/gi, '');
    sanitized = sanitized.replace(/onerror=/gi, '');
    sanitized = sanitized.replace(/onclick=/gi, '');

    return sanitized.trim();
  }
  
  if (Array.isArray(val)) {
    return val.map(sanitizeValue);
  }

  if (typeof val === 'object' && val !== null) {
    return sanitizeObject(val);
  }

  return val;
};

const sanitizeObject = (obj) => {
  const sanitized = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      // Prevent NoSQL operator injection ($gt, $ne, $where etc)
      if (key.startsWith('$')) {
        // Strip the dollar sign or skip
        continue;
      }
      sanitized[key] = sanitizeValue(obj[key]);
    }
  }
  return sanitized;
};

// Main middleware
exports.securityGuard = (req, res, next) => {
  // 1. Reject oversized requests (Body size limit 1MB)
  const contentLength = req.headers['content-length'];
  if (contentLength && parseInt(contentLength, 10) > 1024 * 1024) {
    return res.status(413).json({
      success: false,
      message: 'Payload too large. Maximum size is 1MB.'
    });
  }

  // 2. Sanitize body, query parameters, and route parameters
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }

  // 3. Strict schema validations for auth routes
  if (req.path === '/login' || req.path === '/signup') {
    const { email, password } = req.body;
    
    if (req.path === '/login') {
      if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required.' });
      }
    }
    
    if (req.path === '/signup') {
      const { firstName, lastName } = req.body;
      if (!firstName || !lastName || !email || !password) {
        return res.status(400).json({ success: false, message: 'All required fields must be supplied.' });
      }
      if (typeof email === 'string' && !email.includes('@')) {
        return res.status(400).json({ success: false, message: 'Invalid email address format.' });
      }
      if (password && password.length < 6) {
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
      }
    }
  }

  next();
};
