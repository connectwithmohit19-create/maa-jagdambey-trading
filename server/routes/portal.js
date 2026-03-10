const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { query } = require('../db');
const { verifyCustomer } = require('../middleware/customerAuth');

const router = express.Router();

// ─── POST /api/portal/login ───────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required.' });
    }

    const result = await query(
      `SELECT customer_id, name, shop_name, contact_number,
              portal_username, portal_password_hash, portal_enabled,
              current_balance, price_category_id
       FROM customers
       WHERE portal_username = $1`,
      [username.trim().toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid username or password.' });
    }

    const customer = result.rows[0];

    if (!customer.portal_enabled) {
      return res.status(403).json({ success: false, message: 'Portal access not enabled for your account. Please contact us.' });
    }

    const valid = await bcrypt.compare(password, customer.portal_password_hash);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Invalid username or password.' });
    }

    const secret = process.env.CUSTOMER_JWT_SECRET || process.env.JWT_SECRET;
    const token  = jwt.sign(
      { customerId: customer.customer_id, name: customer.name, type: 'customer' },
      secret,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      customer: {
        customerId:      customer.customer_id,
        name:            customer.name,
        shopName:        customer.shop_name,
        contactNumber:   customer.contact_number,
        currentBalance:  customer.current_balance,
      },
    });
  } catch (err) {
    console.error('Portal login error:', err.message);
    res.status(500).json({ success: false, message: 'Login failed. Please try again.' });
  }
});

// ─── GET /api/portal/me ───────────────────────────────────────
router.get('/me', verifyCustomer, async (req, res) => {
  try {
    const result = await query(
      `SELECT c.customer_id, c.name, c.shop_name, c.contact_number,
              c.address, c.city, c.state, c.gst_number,
              c.current_balance, pc.category_name AS price_category
       FROM customers c
       LEFT JOIN price_categories pc ON c.price_category_id = pc.category_id
       WHERE c.customer_id = $1`,
      [req.customer.customerId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }
    res.json({ success: true, customer: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch profile.' });
  }
});

// ─── GET /api/portal/dashboard ───────────────────────────────
router.get('/dashboard', verifyCustomer, async (req, res) => {
  try {
    const cid = req.customer.customerId;

    const custRes = await query(
      'SELECT current_balance FROM customers WHERE customer_id = $1', [cid]
    );

    const statsRes = await query(
      `SELECT
         COUNT(*)                                               AS total_orders,
         COUNT(*) FILTER (WHERE payment_status = 'Paid')       AS paid_orders,
         COUNT(*) FILTER (WHERE payment_status != 'Paid')      AS unpaid_orders,
         COALESCE(SUM(total_amount),0)                         AS total_spent,
         COALESCE(SUM(paid_amount),0)                          AS total_paid
       FROM orders
       WHERE customer_id = $1 AND order_status != 'Cancelled'`,
      [cid]
    );

    const recentOrders = await query(
      `SELECT order_id, order_number, order_date, total_amount, paid_amount,
              balance_amount, order_status, payment_status
       FROM orders
       WHERE customer_id = $1
       ORDER BY created_at DESC LIMIT 5`,
      [cid]
    );

    const stats = statsRes.rows[0];
    res.json({
      success: true,
      balance:      parseFloat(custRes.rows[0]?.current_balance || 0),
      totalOrders:  parseInt(stats.total_orders),
      paidOrders:   parseInt(stats.paid_orders),
      unpaidOrders: parseInt(stats.unpaid_orders),
      totalSpent:   parseFloat(stats.total_spent),
      totalPaid:    parseFloat(stats.total_paid),
      recentOrders: recentOrders.rows,
    });
  } catch (err) {
    console.error('Portal dashboard error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to load dashboard.' });
  }
});

// ─── GET /api/portal/orders ───────────────────────────────────
router.get('/orders', verifyCustomer, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const cid    = req.customer.customerId;

    let conditions = ['o.customer_id = $1'];
    let params     = [cid];
    let idx        = 2;

    if (status) {
      conditions.push(`o.payment_status = $${idx}`);
      params.push(status);
      idx++;
    }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const countRes = await query(`SELECT COUNT(*) AS total FROM orders o ${where}`, params);
    const result   = await query(
      `SELECT o.order_id, o.order_number, o.order_date, o.order_status,
              o.payment_status, o.subtotal, o.tax_amount, o.discount_amount,
              o.total_amount, o.paid_amount, o.balance_amount, o.payment_method,
              o.delivery_type
       FROM orders o
       ${where}
       ORDER BY o.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      success: true,
      orders: result.rows,
      pagination: {
        total: parseInt(countRes.rows[0].total),
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(parseInt(countRes.rows[0].total) / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error('Portal orders error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch orders.' });
  }
});

// ─── GET /api/portal/orders/:id ──────────────────────────────
router.get('/orders/:id', verifyCustomer, async (req, res) => {
  try {
    const cid = req.customer.customerId;

    const orderRes = await query(
      `SELECT o.*,
              c.name AS customer_name, c.shop_name, c.contact_number,
              c.address AS customer_address, c.city, c.state, c.pincode,
              c.gst_number AS customer_gst,
              pc.category_name AS price_category_name
       FROM orders o
       JOIN customers c ON o.customer_id = c.customer_id
       LEFT JOIN price_categories pc ON c.price_category_id = pc.category_id
       WHERE o.order_id = $1 AND o.customer_id = $2`,
      [parseInt(req.params.id), cid]
    );

    if (orderRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const itemsRes = await query(
      `SELECT oi.*, p.product_name, p.brand, p.sku, p.hsn_code, p.unit, p.gst_percentage
       FROM order_items oi
       JOIN products p ON oi.product_id = p.product_id
       WHERE oi.order_id = $1`,
      [parseInt(req.params.id)]
    );

    const paymentsRes = await query(
      'SELECT * FROM customer_payments WHERE order_id = $1 ORDER BY payment_date',
      [parseInt(req.params.id)]
    );

    res.json({
      success: true,
      order:    orderRes.rows[0],
      items:    itemsRes.rows,
      payments: paymentsRes.rows,
    });
  } catch (err) {
    console.error('Portal order detail error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch order.' });
  }
});

// ─── GET /api/portal/payments ────────────────────────────────
router.get('/payments', verifyCustomer, async (req, res) => {
  try {
    const result = await query(
      `SELECT cp.*, o.order_number
       FROM customer_payments cp
       LEFT JOIN orders o ON cp.order_id = o.order_id
       WHERE cp.customer_id = $1
       ORDER BY cp.payment_date DESC LIMIT 20`,
      [req.customer.customerId]
    );
    res.json({ success: true, payments: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch payments.' });
  }
});

// ─── Admin: Set portal credentials for a customer ─────────────
// POST /api/portal/admin/set-credentials
const { verifyToken } = require('../middleware/auth');
router.post('/admin/set-credentials', verifyToken, async (req, res) => {
  try {
    const { customer_id, username, password, enabled = true } = req.body;
    if (!customer_id || !username || !password) {
      return res.status(400).json({ success: false, message: 'customer_id, username and password are required.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const result = await query(
      `UPDATE customers
       SET portal_username = $1, portal_password_hash = $2, portal_enabled = $3, updated_at = NOW()
       WHERE customer_id = $4
       RETURNING customer_id, name, portal_username, portal_enabled`,
      [username.trim().toLowerCase(), hash, enabled, parseInt(customer_id)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    res.json({ success: true, message: 'Portal credentials set successfully.', customer: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ success: false, message: 'Username already taken. Choose a different one.' });
    }
    console.error('Set credentials error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to set credentials.' });
  }
});

module.exports = router;
