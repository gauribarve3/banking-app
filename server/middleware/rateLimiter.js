const authAttempts = new Map();
const generalAttempts = new Map();

// Helper to cleanup old timestamps
const cleanupAttempts = (attemptsMap, windowMs) => {
  const now = Date.now();
  for (const [ip, timestamps] of attemptsMap.entries()) {
    const validTimestamps = timestamps.filter(ts => now - ts < windowMs);
    if (validTimestamps.length === 0) {
      attemptsMap.delete(ip);
    } else {
      attemptsMap.set(ip, validTimestamps);
    }
  }
};

// Run cleanup periodically
setInterval(() => {
  const WINDOW_MS = 15 * 60 * 1000;
  cleanupAttempts(authAttempts, WINDOW_MS);
  cleanupAttempts(generalAttempts, WINDOW_MS);
}, 60 * 1000); // every minute

exports.authRateLimiter = (req, res, next) => {
  next();
};

exports.generalRateLimiter = (req, res, next) => {
  // Ignore login and signup since they have a separate stricter limiter
  if (req.path === '/login' || req.path === '/signup') {
    return next();
  }

  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const now = Date.now();
  const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
  const MAX_ATTEMPTS = 300; // General endpoint limit

  if (!generalAttempts.has(ip)) {
    generalAttempts.set(ip, []);
  }

  const timestamps = generalAttempts.get(ip).filter(ts => now - ts < WINDOW_MS);
  timestamps.push(now);
  generalAttempts.set(ip, timestamps);

  if (timestamps.length > MAX_ATTEMPTS) {
    return res.status(429).json({
      success: false,
      message: 'Too many API requests. Please slow down and try again in 15 minutes.'
    });
  }

  next();
};
