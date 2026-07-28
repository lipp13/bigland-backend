const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'bigland_sentul_jwt_secret_key_2026';

// Verify JWT token and attach user to request
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token tidak ditemukan. Silakan login terlebih dahulu.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token tidak valid atau sudah kedaluwarsa.' });
  }
};

// Require ADMIN or SUPERADMIN role
const requireAdmin = (req, res, next) => {
  if (!req.user || (req.user.role !== 'ADMIN' && req.user.role !== 'SUPERADMIN')) {
    return res.status(403).json({ message: 'Akses ditolak. Membutuhkan hak akses Administrator.' });
  }
  next();
};

// Require SUPERADMIN role only
const requireSuperAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'SUPERADMIN') {
    return res.status(403).json({ message: 'Akses ditolak. Membutuhkan hak akses Super Administrator.' });
  }
  next();
};

module.exports = { authenticate, requireAdmin, requireSuperAdmin, JWT_SECRET };
