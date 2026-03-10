const express = require('express');
const { query } = require('../db');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// ─── GET /api/reports/sales ──────────────────────────────────
// Query params: period = 'today' | 'week' | 'month' | 'year' | 'custom'
//               from_date, to_date (for custom)
router.get('/sales', verifyToken, async (req, res) => {
  try {
    const { period = 'month', from_date, to_date } = req.query;

    let startDate, endDate;
    const now = new Date();

    switch (period) {
      case 'today':
        startDate = now.toISOString().split('T')[0];
        endDate   = startDate;
        break;
      case 'week':
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        startDate = new Date(now.setDate(diff)).toISOString().split('T')[0];
        endDate   = new Date().toISOString().split('T')[0];
        break;
      case 'month':
        startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2,'0')}-01`;
        endDate   = new Date().toISOString().split('T')[0];
        break;
      case 'year':
        startDate = `${now.getFullYear()}-01-01`;
        endDate   = new Date().toISOString().split('T')[0];
        break;
      case 'custom':
        startDate = from_date;
        endDate   = to_date;
        break;
      default:
        startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2,'0')}-01`;
        endDate   = new Date().toISOString().split('T')[0];
    }

    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'Invalid date range.' });
    }

    // Overall summary
    const summaryRes = await query(
      `SELECT
         COUNT(*)                                            AS total_orders,
         COUNT(*) FILTER (WHERE order_status = 'Delivered') AS delivered_orders,
         COALESCE(SUM(total_amount),0)                      AS total_revenue,
         COALESCE(SUM(paid_amount),0)                       AS total_collected,
         COALESCE(SUM(balance_amount),0)                    AS total_outstanding,
         COALESCE(SUM(tax_amount),0)                        AS total_gst,
         COALESCE(SUM(discount_amount),0)                   AS total_discount
       FROM orders
       WHERE order_date BETWEEN $1 AND $2
         AND order_status != 'Cancelled'`,
      [startDate, endDate]
    );

    // Daily sales for chart (last 30 days or custom range)
    const dailyRes = await query(
      `SELECT
         order_date::DATE          AS date,
         COUNT(*)                  AS orders,
         COALESCE(SUM(total_amount),0)  AS revenue,
         COALESCE(SUM(paid_amount),0)   AS collected
       FROM orders
       WHERE order_date BETWEEN $1 AND $2
         AND order_status != 'Cancelled'
       GROUP BY order_date::DATE
       ORDER BY order_date::DATE`,
      [startDate, endDate]
    );

    // Top 10 products by revenue
    const topProductsRes = await query(
      `SELECT
         p.product_name, p.sku, p.brand,
         SUM(oi.quantity)                   AS total_qty,
         COALESCE(SUM(oi.total_amount),0)   AS total_revenue
       FROM order_items oi
       JOIN products p ON oi.product_id = p.product_id
       JOIN orders o ON oi.order_id = o.order_id
       WHERE o.order_date BETWEEN $1 AND $2
         AND o.order_status != 'Cancelled'
       GROUP BY p.product_id, p.product_name, p.sku, p.brand
       ORDER BY total_revenue DESC
       LIMIT 10`,
      [startDate, endDate]
    );

    // Top 10 customers by revenue
    const topCustomersRes = await query(
      `SELECT
         c.name, c.shop_name, c.contact_number,
         COUNT(o.order_id)                  AS total_orders,
         COALESCE(SUM(o.total_amount),0)    AS total_revenue,
         COALESCE(SUM(o.balance_amount),0)  AS outstanding
       FROM orders o
       JOIN customers c ON o.customer_id = c.customer_id
       WHERE o.order_date BETWEEN $1 AND $2
         AND o.order_status != 'Cancelled'
       GROUP BY c.customer_id, c.name, c.shop_name, c.contact_number
       ORDER BY total_revenue DESC
       LIMIT 10`,
      [startDate, endDate]
    );

    // Payment method breakdown
    const payMethodRes = await query(
      `SELECT payment_method, COUNT(*) AS count, COALESCE(SUM(total_amount),0) AS total
       FROM orders
       WHERE order_date BETWEEN $1 AND $2 AND order_status != 'Cancelled'
       GROUP BY payment_method ORDER BY total DESC`,
      [startDate, endDate]
    );

    res.json({
      success: true,
      period: { startDate, endDate },
      summary:         summaryRes.rows[0],
      dailySales:      dailyRes.rows,
      topProducts:     topProductsRes.rows,
      topCustomers:    topCustomersRes.rows,
      paymentMethods:  payMethodRes.rows,
    });
  } catch (err) {
    console.error('Sales report error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to generate sales report.' });
  }
});

// ─── GET /api/reports/outstanding ────────────────────────────
router.get('/outstanding', verifyToken, async (req, res) => {
  try {
    const { min_balance = 0 } = req.query;

    // Customer-wise outstanding
    const customersRes = await query(
      `SELECT
         c.customer_id, c.name, c.shop_name, c.contact_number,
         c.current_balance, pc.category_name AS price_category,
         COUNT(o.order_id) FILTER (WHERE o.payment_status != 'Paid') AS unpaid_orders,
         MAX(o.order_date) AS last_order_date,
         MIN(o.order_date) FILTER (WHERE o.payment_status != 'Paid') AS oldest_unpaid_date
       FROM customers c
       LEFT JOIN price_categories pc ON c.price_category_id = pc.category_id
       LEFT JOIN orders o ON c.customer_id = o.customer_id AND o.order_status != 'Cancelled'
       WHERE c.current_balance > $1 AND c.status = 'Active'
       GROUP BY c.customer_id, c.name, c.shop_name, c.contact_number, c.current_balance, pc.category_name
       ORDER BY c.current_balance DESC`,
      [parseFloat(min_balance)]
    );

    // Summary stats
    const summaryRes = await query(
      `SELECT
         COUNT(*) FILTER (WHERE current_balance > 0)      AS customers_with_dues,
         COALESCE(SUM(current_balance) FILTER (WHERE current_balance > 0), 0) AS total_outstanding,
         MAX(current_balance)                             AS highest_balance,
         COALESCE(AVG(current_balance) FILTER (WHERE current_balance > 0), 0) AS avg_balance
       FROM customers WHERE status = 'Active'`
    );

    // Aging buckets (based on oldest unpaid order)
    const agingRes = await query(
      `SELECT
         CASE
           WHEN CURRENT_DATE - MIN(o.order_date) FILTER (WHERE o.payment_status != 'Paid') <= 30  THEN '0-30 days'
           WHEN CURRENT_DATE - MIN(o.order_date) FILTER (WHERE o.payment_status != 'Paid') <= 60  THEN '31-60 days'
           WHEN CURRENT_DATE - MIN(o.order_date) FILTER (WHERE o.payment_status != 'Paid') <= 90  THEN '61-90 days'
           ELSE '90+ days'
         END AS bucket,
         COUNT(DISTINCT c.customer_id) AS customers,
         COALESCE(SUM(c.current_balance),0) AS amount
       FROM customers c
       JOIN orders o ON c.customer_id = o.customer_id
       WHERE c.current_balance > 0 AND c.status = 'Active'
         AND o.order_status != 'Cancelled' AND o.payment_status != 'Paid'
       GROUP BY 1
       ORDER BY MIN(CURRENT_DATE - MIN(o.order_date) FILTER (WHERE o.payment_status != 'Paid'))`
    );

    res.json({
      success: true,
      summary:   summaryRes.rows[0],
      customers: customersRes.rows,
      aging:     agingRes.rows,
    });
  } catch (err) {
    console.error('Outstanding report error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to generate outstanding report.' });
  }
});

// ─── GET /api/reports/stock ───────────────────────────────────
router.get('/stock', verifyToken, async (req, res) => {
  try {
    const { category } = req.query;

    const params = [];
    let catFilter = '';
    if (category) {
      catFilter = 'AND pc2.category_id = $1';
      params.push(parseInt(category));
    }

    const productsRes = await query(
      `SELECT
         p.product_id, p.product_name, p.sku, p.brand,
         p.current_stock, p.min_stock_level,
         p.retail_price, p.purchase_price,
         pc2.category_name,
         (p.current_stock * COALESCE(p.purchase_price, 0)) AS stock_value,
         CASE
           WHEN p.current_stock = 0          THEN 'Out of Stock'
           WHEN p.current_stock <= p.min_stock_level THEN 'Low Stock'
           ELSE 'In Stock'
         END AS stock_status,
         (SELECT COALESCE(SUM(oi.quantity),0)
          FROM order_items oi
          JOIN orders o ON oi.order_id = o.order_id
          WHERE oi.product_id = p.product_id
            AND o.order_date >= CURRENT_DATE - INTERVAL '30 days'
            AND o.order_status != 'Cancelled') AS sold_last_30_days
       FROM products p
       LEFT JOIN product_categories pc2 ON p.category_id = pc2.category_id
       WHERE p.is_active = TRUE ${catFilter}
       ORDER BY p.current_stock ASC, p.product_name`,
      params
    );

    // Summary
    const summaryRes = await query(
      `SELECT
         COUNT(*)                                                          AS total_products,
         COUNT(*) FILTER (WHERE current_stock = 0)                        AS out_of_stock,
         COUNT(*) FILTER (WHERE current_stock > 0 AND current_stock <= min_stock_level) AS low_stock,
         COUNT(*) FILTER (WHERE current_stock > min_stock_level)          AS in_stock,
         COALESCE(SUM(current_stock * COALESCE(purchase_price,0)),0)      AS total_stock_value
       FROM products WHERE is_active = TRUE`
    );

    // Category-wise stock
    const categoryRes = await query(
      `SELECT
         pc2.category_name,
         COUNT(p.product_id) AS products,
         COALESCE(SUM(p.current_stock),0) AS total_units,
         COALESCE(SUM(p.current_stock * COALESCE(p.purchase_price,0)),0) AS value
       FROM products p
       JOIN product_categories pc2 ON p.category_id = pc2.category_id
       WHERE p.is_active = TRUE
       GROUP BY pc2.category_id, pc2.category_name
       ORDER BY value DESC`
    );

    res.json({
      success: true,
      summary:    summaryRes.rows[0],
      products:   productsRes.rows,
      categories: categoryRes.rows,
    });
  } catch (err) {
    console.error('Stock report error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to generate stock report.' });
  }
});

// ─── GET /api/reports/employees ──────────────────────────────
router.get('/employees', verifyToken, async (req, res) => {
  try {
    const { month, year } = req.query;
    const m = parseInt(month) || new Date().getMonth() + 1;
    const y = parseInt(year)  || new Date().getFullYear();
    const startDate = `${y}-${String(m).padStart(2,'0')}-01`;
    const daysInMonth = new Date(y, m, 0).getDate();

    const result = await query(
      `SELECT
         e.employee_id, e.name, e.designation, e.employee_code,
         e.monthly_salary, e.status,
         COUNT(a.attendance_id) FILTER (WHERE a.status = 'Present')   AS present_days,
         COUNT(a.attendance_id) FILTER (WHERE a.status = 'Half-day')  AS half_days,
         COUNT(a.attendance_id) FILTER (WHERE a.status = 'Absent')    AS absent_days,
         COUNT(a.attendance_id) FILTER (WHERE a.status = 'Leave')     AS leave_days,
         COALESCE(SUM(sp.amount) FILTER (WHERE sp.payment_date BETWEEN $2 AND $3), 0) AS total_paid,
         COALESCE(SUM(sp.amount) FILTER (WHERE sp.payment_type = 'Advance' AND sp.payment_date BETWEEN $2 AND $3), 0) AS advance_paid
       FROM employees e
       LEFT JOIN employee_attendance a
         ON e.employee_id = a.employee_id
         AND a.attendance_date BETWEEN $2 AND $3
       LEFT JOIN employee_salary_payments sp ON e.employee_id = sp.employee_id
       WHERE e.status = 'Active'
       GROUP BY e.employee_id, e.name, e.designation, e.employee_code, e.monthly_salary, e.status
       ORDER BY e.name`,
      [null, startDate, new Date(y, m, 0).toISOString().split('T')[0]]
    );

    // Calculate salary earned per employee
    const employees = result.rows.map((e) => {
      const presentDays = parseFloat(e.present_days) + parseFloat(e.half_days) * 0.5;
      const salaryEarned = (parseFloat(e.monthly_salary) / daysInMonth) * presentDays;
      const totalPaid    = parseFloat(e.total_paid);
      const netPayable   = salaryEarned - totalPaid;
      return { ...e, presentDays, salaryEarned: salaryEarned.toFixed(2), totalPaid: totalPaid.toFixed(2), netPayable: netPayable.toFixed(2) };
    });

    const totalSalaryBill    = employees.reduce((s, e) => s + parseFloat(e.salaryEarned), 0);
    const totalPaid          = employees.reduce((s, e) => s + parseFloat(e.totalPaid), 0);
    const totalPending       = employees.reduce((s, e) => s + Math.max(0, parseFloat(e.netPayable)), 0);

    res.json({
      success: true,
      month: m, year: y, daysInMonth,
      employees,
      summary: {
        totalEmployees:  employees.length,
        totalSalaryBill: totalSalaryBill.toFixed(2),
        totalPaid:       totalPaid.toFixed(2),
        totalPending:    totalPending.toFixed(2),
      },
    });
  } catch (err) {
    console.error('Employee report error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to generate employee report.' });
  }
});

module.exports = router;
