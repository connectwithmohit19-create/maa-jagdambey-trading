const express = require('express');
const { query } = require('../db');

const router = express.Router();
// ⚠️  No auth middleware on any catalogue route — fully public

// ── GET /api/catalogue/categories ────────────────────────────
router.get('/categories', async (req, res) => {
  try {
    const result = await query(
      `SELECT category_id, category_name, description, display_order
       FROM product_categories
       WHERE is_active = TRUE
       ORDER BY display_order ASC, category_name ASC`
    );
    res.json({ success: true, categories: result.rows });
  } catch (err) {
    console.error('Catalogue categories error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to load categories.' });
  }
});

// ── GET /api/catalogue/products ───────────────────────────────
// Params: search, category_id, economy_series (boolean), page, limit
router.get('/products', async (req, res) => {
  try {
    const { search, category_id, economy_series, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let conditions = ['p.is_active = TRUE', 'p.current_stock > 0'];
    let params = [];
    let idx = 1;

    if (search) {
      conditions.push(`(p.product_name ILIKE $${idx} OR p.brand ILIKE $${idx} OR p.model_number ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    if (category_id) {
      conditions.push(`p.category_id = $${idx}`);
      params.push(parseInt(category_id));
      idx++;
    }

    // Economy Series is a TAG FILTER (AND on top of category)
    if (economy_series === 'true') {
      conditions.push(`p.is_economy_series = TRUE`);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const countRes = await query(
      `SELECT COUNT(*) AS total FROM products p ${where}`, params
    );

    const result = await query(
      `SELECT
         p.product_id,
         p.product_name,
         p.brand,
         p.model_number,
         p.description,
         p.warranty_period,
         p.warranty_type,
         p.unit,
         p.hsn_code,
         p.gst_percentage,
         p.product_image_url,
         p.specifications,
         p.current_stock,
         p.is_economy_series,
         pc.category_name,
         pc.category_id,
         p.created_at
       FROM products p
       LEFT JOIN product_categories pc ON p.category_id = pc.category_id
       ${where}
       ORDER BY p.is_economy_series ASC, pc.display_order ASC, p.product_name ASC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, parseInt(limit), offset]
    );
    // ⚠️  NO price fields in response — intentional

    res.json({
      success: true,
      products: result.rows,
      pagination: {
        total: parseInt(countRes.rows[0].total),
        page:  parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(parseInt(countRes.rows[0].total) / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error('Catalogue products error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to load products.' });
  }
});

// ── GET /api/catalogue/products/:id ──────────────────────────
router.get('/products/:id', async (req, res) => {
  try {
    const result = await query(
      `SELECT
         p.product_id, p.product_name, p.brand, p.model_number,
         p.description, p.warranty_period, p.warranty_type,
         p.unit, p.hsn_code, p.gst_percentage,
         p.product_image_url, p.specifications,
         p.current_stock, p.is_economy_series,
         pc.category_name, pc.category_id
       FROM products p
       LEFT JOIN product_categories pc ON p.category_id = pc.category_id
       WHERE p.product_id = $1 AND p.is_active = TRUE`,
      [parseInt(req.params.id)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }
    // ⚠️  NO price fields — intentional
    res.json({ success: true, product: result.rows[0] });
  } catch (err) {
    console.error('Catalogue product detail error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to load product.' });
  }
});

module.exports = router;
