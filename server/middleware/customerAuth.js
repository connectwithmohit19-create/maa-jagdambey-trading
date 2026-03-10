const jwt = require('jsonwebtoken');

const verifyCustomer = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access denied. Please log in.' });
  }

  try {
    const secret = process.env.CUSTOMER_JWT_SECRET || process.env.JWT_SECRET;
    const decoded = jwt.verify(token, secret);
    req.customer = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
  }
};

module.exports = { verifyCustomer };
