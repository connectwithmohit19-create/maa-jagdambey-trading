const express = require('express');
const { query } = require('../db');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/products — list all products with filters
router.get('/', verifyToken, async (req, res) => {
  try {
    const { search, category, status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let conditions = [];
    let params = [];
    let paramIdx = 1;

    if (search) {
      conditions.push(`(p.product_name ILIKE $${paramIdx} OR p.sku ILIKE $${paramIdx} OR p.brand ILIKE $${paramIdx})`);
      params.push(`%${search}%`);
      paramIdx++;
    }

    if (category) {
      conditions.push(`p.category_id = $${paramIdx}`);
      params.push(parseInt(category));
      paramIdx++;
    }

    if (status === 'active') {
      conditions.push(`p.is_active = TRUE`);
    } else if (status === 'inactive') {
      conditions.push(`p.is_active = FALSE`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await query(
      `SELECT COUNT(*) AS total FROM products p ${whereClause}`,
      params
    );

    const result = await query(
      `SELECT p.*, pc.category_name
       FROM products p
       LEFT JOIN product_categories pc ON p.category_id = pc.category_id
       ${whereClause}
       ORDER BY p.created_at DESC
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      success: true,
      products: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].total),
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(parseInt(countResult.rows[0].total) / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error('Get products error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch products.' });
  }
});

// GET /api/products/:id — single product
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT p.*, pc.category_name
       FROM products p
       LEFT JOIN product_categories pc ON p.category_id = pc.category_id
       WHERE p.product_id = $1`,
      [parseInt(req.params.id)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    res.json({ success: true, product: result.rows[0] });
  } catch (err) {
    console.error('Get product error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch product.' });
  }
});

// POST /api/products — create product
router.post('/', verifyToken, async (req, res) => {
  try {
    const {
      sku, product_name, category_id, brand, model_number, description,
      warranty_period, warranty_type, purchase_price, retail_price,
      lko_local_price, outer_market_price, special_rate_price,
      current_stock, minimum_stock, unit, hsn_code, gst_percentage,
    } = req.body;

    if (!product_name) {
      return res.status(400).json({ success: false, message: 'Product name is required.' });
    }

    // Auto-generate SKU if not provided
    const finalSku = sku || `PRD-${Date.now()}`;

    const result = await query(
      `INSERT INTO products (
        sku, product_name, category_id, brand, model_number, description,
        warranty_period, warranty_type, purchase_price, retail_price,
        lko_local_price, outer_market_price, special_rate_price,
        current_stock, minimum_stock, unit, hsn_code, gst_percentage
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18
      ) RETURNING *`,
      [
        finalSku, product_name, category_id || null, brand || null, model_number || null,
        description || null, warranty_period || null, warranty_type || null,
        parseFloat(purchase_price) || 0, parseFloat(retail_price) || 0,
        parseFloat(lko_local_price) || 0, parseFloat(outer_market_price) || 0,
        parseFloat(special_rate_price) || 0,
        parseInt(current_stock) || 0, parseInt(minimum_stock) || 5,
        unit || 'Piece', hsn_code || null, parseFloat(gst_percentage) || 18.00,
      ]
    );

    res.status(201).json({ success: true, message: 'Product created successfully.', product: result.rows[0] });
  } catch (err) {
    console.error('Create product error:', err.message);
    if (err.code === '23505') {
      return res.status(400).json({ success: false, message: 'SKU already exists. Use a different SKU.' });
    }
    res.status(500).json({ success: false, message: 'Failed to create product.' });
  }
});

// PUT /api/products/:id — update product
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const {
      product_name, category_id, brand, model_number, description,
      warranty_period, warranty_type, purchase_price, retail_price,
      lko_local_price, outer_market_price, special_rate_price,
      current_stock, minimum_stock, unit, hsn_code, gst_percentage, is_active,
    } = req.body;

    if (!product_name) {
      return res.status(400).json({ success: false, message: 'Product name is required.' });
    }

    const result = await query(
      `UPDATE products SET
        product_name = $1, category_id = $2, brand = $3, model_number = $4,
        description = $5, warranty_period = $6, warranty_type = $7,
        purchase_price = $8, retail_price = $9, lko_local_price = $10,
        outer_market_price = $11, special_rate_price = $12,
        current_stock = $13, minimum_stock = $14, unit = $15,
        hsn_code = $16, gst_percentage = $17, is_active = $18,
        updated_at = NOW()
      WHERE product_id = $19
      RETURNING *`,
      [
        product_name, category_id || null, brand || null, model_number || null,
        description || null, warranty_period || null, warranty_type || null,
        parseFloat(purchase_price) || 0, parseFloat(retail_price) || 0,
        parseFloat(lko_local_price) || 0, parseFloat(outer_market_price) || 0,
        parseFloat(special_rate_price) || 0,
        parseInt(current_stock) || 0, parseInt(minimum_stock) || 5,
        unit || 'Piece', hsn_code || null, parseFloat(gst_percentage) || 18.00,
        is_active !== undefined ? is_active : true,
        parseInt(req.params.id),
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    res.json({ success: true, message: 'Product updated successfully.', product: result.rows[0] });
  } catch (err) {
    console.error('Update product error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to update product.' });
  }
});

// DELETE /api/products/:id — soft delete (deactivate)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const result = await query(
      'UPDATE products SET is_active = FALSE, updated_at = NOW() WHERE product_id = $1 RETURNING product_id',
      [parseInt(req.params.id)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    res.json({ success: true, message: 'Product deactivated successfully.' });
  } catch (err) {
    console.error('Delete product error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to delete product.' });
  }
});

// GET /api/products/categories/all — get all product categories
router.get('/categories/all', verifyToken, async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM product_categories WHERE is_active = TRUE ORDER BY display_order, category_name'
    );
    res.json({ success: true, categories: result.rows });
  } catch (err) {
    console.error('Get categories error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch categories.' });
  }
});

module.exports = router;
