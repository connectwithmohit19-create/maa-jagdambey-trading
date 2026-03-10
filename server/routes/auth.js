const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../db');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required.' });
    }

    const result = await query(
      'SELECT * FROM admin_users WHERE username = $1 AND is_active = TRUE',
      [username.trim().toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid username or password.' });
    }

    const user = result.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid username or password.' });
    }

    // Update last login
    await query('UPDATE admin_users SET last_login = NOW() WHERE user_id = $1', [user.user_id]);

    const token = jwt.sign(
      {
        userId: user.user_id,
        username: user.username,
        role: user.role,
        fullName: user.full_name,
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        userId: user.user_id,
        username: user.username,
        fullName: user.full_name,
        role: user.role,
        email: user.email,
      },
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

// GET /api/auth/me — get current logged-in user info
router.get('/me', verifyToken, async (req, res) => {
  try {
    const result = await query(
      'SELECT user_id, username, full_name, email, contact_number, role, last_login FROM admin_users WHERE user_id = $1',
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    console.error('Get user error:', err.message);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// POST /api/auth/change-password
router.post('/change-password', verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Both current and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
    }

    const result = await query('SELECT password_hash FROM admin_users WHERE user_id = $1', [req.user.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const isValid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await query('UPDATE admin_users SET password_hash = $1 WHERE user_id = $2', [newHash, req.user.userId]);

    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err) {
    console.error('Change password error:', err.message);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
