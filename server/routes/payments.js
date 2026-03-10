const express = require('express');
const { query } = require('../db');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/payments — list all payments
router.get('/', verifyToken, async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let conditions = [];
    let params = [];
    let idx = 1;

    if (search) {
      conditions.push(`(c.name ILIKE $${idx} OR c.shop_name ILIKE $${idx} OR cp.payment_number ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await query(
      `SELECT COUNT(*) AS total
       FROM customer_payments cp
       JOIN customers c ON cp.customer_id = c.customer_id
       ${where}`,
      params
    );

    const result = await query(
      `SELECT cp.*,
              c.name AS customer_name, c.shop_name,
              o.order_number
       FROM customer_payments cp
       JOIN customers c ON cp.customer_id = c.customer_id
       LEFT JOIN orders o ON cp.order_id = o.order_id
       ${where}
       ORDER BY cp.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, parseInt(limit), offset]
    );

    // Total collected
    const totalRes = await query(
      'SELECT COALESCE(SUM(amount), 0) AS total FROM customer_payments'
    );

    res.json({
      success: true,
      payments: result.rows,
      totalCollected: parseFloat(totalRes.rows[0].total),
      pagination: {
        total: parseInt(countRes.rows[0].total),
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(parseInt(countRes.rows[0].total) / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error('Get payments error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch payments.' });
  }
});

module.exports = router;
