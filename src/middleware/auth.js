const { verifyToken } = require('../utils/jwt');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  console.log('Auth header:', authHeader); // Debug log

  const token = authHeader && authHeader.split(' ')[1];
  console.log('Extracted token:', token); // Debug log

  if (!token) {
    return res.status(401).json({ message: 'Authentication token required' });
  }

  try {
    const decoded = verifyToken(token);
    console.log('Decoded token:', decoded); // Debug log
    req.user = { id: decoded.userId };
    next();
  } catch (error) {
    console.error('Token verification error:', error); // Debug log
    return res.status(403).json({ message: 'Invalid token' });
  }
};

module.exports = {
  authenticateToken
}; 