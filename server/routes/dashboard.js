const express = require('express');
const { query } = require('../db');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/dashboard/stats
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const [
      customersResult,
      productsResult,
      ordersResult,
      revenueResult,
      lowStockResult,
      recentOrdersResult,
      pendingPaymentsResult,
    ] = await Promise.all([
      query("SELECT COUNT(*) AS total FROM customers WHERE status = 'Active'"),
      query("SELECT COUNT(*) AS total FROM products WHERE is_active = TRUE"),
      query("SELECT COUNT(*) AS total FROM orders WHERE order_date >= CURRENT_DATE - INTERVAL '30 days'"),
      query("SELECT COALESCE(SUM(total_amount), 0) AS total FROM orders WHERE order_date >= CURRENT_DATE - INTERVAL '30 days'"),
      query('SELECT COUNT(*) AS total FROM products WHERE current_stock <= minimum_stock AND is_active = TRUE'),
      query(`
        SELECT o.order_id, o.order_number, o.order_date, o.total_amount, o.order_status, o.payment_status,
               c.name AS customer_name, c.shop_name
        FROM orders o
        JOIN customers c ON o.customer_id = c.customer_id
        ORDER BY o.created_at DESC
        LIMIT 5
      `),
      query(`
        SELECT COALESCE(SUM(balance_amount), 0) AS total
        FROM orders
        WHERE payment_status IN ('Unpaid', 'Partial')
      `),
    ]);

    res.json({
      success: true,
      stats: {
        totalCustomers: parseInt(customersResult.rows[0].total),
        totalProducts: parseInt(productsResult.rows[0].total),
        monthlyOrders: parseInt(ordersResult.rows[0].total),
        monthlyRevenue: parseFloat(revenueResult.rows[0].total),
        lowStockCount: parseInt(lowStockResult.rows[0].total),
        pendingPayments: parseFloat(pendingPaymentsResult.rows[0].total),
      },
      recentOrders: recentOrdersResult.rows,
    });
  } catch (err) {
    console.error('Dashboard stats error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard stats.' });
  }
});

// GET /api/dashboard/low-stock — products below minimum stock
router.get('/low-stock', verifyToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT p.product_id, p.product_name, p.sku, p.brand, p.current_stock, p.minimum_stock,
             pc.category_name
      FROM products p
      LEFT JOIN product_categories pc ON p.category_id = pc.category_id
      WHERE p.current_stock <= p.minimum_stock AND p.is_active = TRUE
      ORDER BY p.current_stock ASC
      LIMIT 20
    `);

    res.json({ success: true, products: result.rows });
  } catch (err) {
    console.error('Low stock error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch low stock products.' });
  }
});

module.exports = router;
