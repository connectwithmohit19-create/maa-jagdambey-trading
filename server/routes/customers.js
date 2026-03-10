const express = require('express');
const { query } = require('../db');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/customers — list all customers with filters
router.get('/', verifyToken, async (req, res) => {
  try {
    const { search, price_category, status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let conditions = [];
    let params = [];
    let paramIdx = 1;

    if (search) {
      conditions.push(`(c.name ILIKE $${paramIdx} OR c.shop_name ILIKE $${paramIdx} OR c.contact_number ILIKE $${paramIdx})`);
      params.push(`%${search}%`);
      paramIdx++;
    }

    if (price_category) {
      conditions.push(`c.price_category_id = $${paramIdx}`);
      params.push(parseInt(price_category));
      paramIdx++;
    }

    if (status) {
      conditions.push(`c.status = $${paramIdx}`);
      params.push(status);
      paramIdx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await query(
      `SELECT COUNT(*) AS total FROM customers c ${whereClause}`,
      params
    );

    const result = await query(
      `SELECT c.*, pc.category_name AS price_category_name, pc.category_code
       FROM customers c
       LEFT JOIN price_categories pc ON c.price_category_id = pc.category_id
       ${whereClause}
       ORDER BY c.created_at DESC
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      success: true,
      customers: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].total),
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(parseInt(countResult.rows[0].total) / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error('Get customers error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch customers.' });
  }
});

// GET /api/customers/:id — single customer with details
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT c.*, pc.category_name AS price_category_name, pc.category_code
       FROM customers c
       LEFT JOIN price_categories pc ON c.price_category_id = pc.category_id
       WHERE c.customer_id = $1`,
      [parseInt(req.params.id)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    // Get recent orders for this customer
    const ordersResult = await query(
      `SELECT order_id, order_number, order_date, total_amount, order_status, payment_status
       FROM orders WHERE customer_id = $1
       ORDER BY created_at DESC LIMIT 5`,
      [parseInt(req.params.id)]
    );

    res.json({
      success: true,
      customer: result.rows[0],
      recentOrders: ordersResult.rows,
    });
  } catch (err) {
    console.error('Get customer error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch customer.' });
  }
});

// POST /api/customers — create customer
router.post('/', verifyToken, async (req, res) => {
  try {
    const {
      name, shop_name, contact_number, alternate_number, email,
      address, city, state, pincode, gst_number, pan_number,
      price_category_id, credit_limit, customer_type,
    } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Customer name is required.' });
    }
    if (!contact_number) {
      return res.status(400).json({ success: false, message: 'Contact number is required.' });
    }

    // Auto-generate customer code
    const countResult = await query('SELECT COUNT(*) AS total FROM customers');
    const count = parseInt(countResult.rows[0].total) + 1;
    const customerCode = `CUST-${String(count).padStart(4, '0')}`;

    const result = await query(
      `INSERT INTO customers (
        customer_code, name, shop_name, contact_number, alternate_number, email,
        address, city, state, pincode, gst_number, pan_number,
        price_category_id, credit_limit, customer_type
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15
      ) RETURNING *`,
      [
        customerCode, name, shop_name || null, contact_number,
        alternate_number || null, email || null, address || null,
        city || 'Lucknow', state || 'Uttar Pradesh', pincode || null,
        gst_number || null, pan_number || null,
        price_category_id ? parseInt(price_category_id) : null,
        parseFloat(credit_limit) || 0,
        customer_type || 'Retailer',
      ]
    );

    res.status(201).json({ success: true, message: 'Customer created successfully.', customer: result.rows[0] });
  } catch (err) {
    console.error('Create customer error:', err.message);
    if (err.code === '23505') {
      return res.status(400).json({ success: false, message: 'Customer with this contact number already exists.' });
    }
    res.status(500).json({ success: false, message: 'Failed to create customer.' });
  }
});

// PUT /api/customers/:id — update customer
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const {
      name, shop_name, contact_number, alternate_number, email,
      address, city, state, pincode, gst_number, pan_number,
      price_category_id, credit_limit, customer_type, status,
    } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Customer name is required.' });
    }

    const result = await query(
      `UPDATE customers SET
        name = $1, shop_name = $2, contact_number = $3, alternate_number = $4,
        email = $5, address = $6, city = $7, state = $8, pincode = $9,
        gst_number = $10, pan_number = $11, price_category_id = $12,
        credit_limit = $13, customer_type = $14, status = $15,
        updated_at = NOW()
      WHERE customer_id = $16
      RETURNING *`,
      [
        name, shop_name || null, contact_number, alternate_number || null,
        email || null, address || null, city || 'Lucknow',
        state || 'Uttar Pradesh', pincode || null,
        gst_number || null, pan_number || null,
        price_category_id ? parseInt(price_category_id) : null,
        parseFloat(credit_limit) || 0,
        customer_type || 'Retailer',
        status || 'Active',
        parseInt(req.params.id),
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    res.json({ success: true, message: 'Customer updated successfully.', customer: result.rows[0] });
  } catch (err) {
    console.error('Update customer error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to update customer.' });
  }
});

// DELETE /api/customers/:id — soft delete
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const result = await query(
      "UPDATE customers SET status = 'Inactive', updated_at = NOW() WHERE customer_id = $1 RETURNING customer_id",
      [parseInt(req.params.id)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    res.json({ success: true, message: 'Customer deactivated successfully.' });
  } catch (err) {
    console.error('Delete customer error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to delete customer.' });
  }
});

// GET /api/customers/price-categories/all — get all price categories
router.get('/price-categories/all', verifyToken, async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM price_categories WHERE is_active = TRUE ORDER BY category_id'
    );
    res.json({ success: true, categories: result.rows });
  } catch (err) {
    console.error('Get price categories error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch price categories.' });
  }
});

module.exports = router;
