const express = require('express');
const { query, getClient } = require('../db');
const { verifyToken } = require('../middleware/auth');

const { sendOrderConfirmed, sendPaymentReceived, checkAndAlertLowStock } = require('../services/whatsapp');
const router = express.Router();

// ─── GET /api/orders — list orders with filters ───────────────
router.get('/', verifyToken, async (req, res) => {
  try {
    const { search, status, payment_status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let conditions = [];
    let params = [];
    let idx = 1;

    if (search) {
      conditions.push(`(o.order_number ILIKE $${idx} OR c.name ILIKE $${idx} OR c.shop_name ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }
    if (status) {
      conditions.push(`o.order_status = $${idx}`);
      params.push(status);
      idx++;
    }
    if (payment_status) {
      conditions.push(`o.payment_status = $${idx}`);
      params.push(payment_status);
      idx++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await query(
      `SELECT COUNT(*) AS total FROM orders o JOIN customers c ON o.customer_id = c.customer_id ${where}`,
      params
    );

    const result = await query(
      `SELECT o.*,
              c.name AS customer_name, c.shop_name, c.contact_number,
              pc.category_name AS price_category_name
       FROM orders o
       JOIN customers c ON o.customer_id = c.customer_id
       LEFT JOIN price_categories pc ON c.price_category_id = pc.category_id
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
    console.error('Get orders error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch orders.' });
  }
});

// ─── GET /api/orders/:id — single order with items ────────────
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const orderRes = await query(
      `SELECT o.*,
              c.name AS customer_name, c.shop_name, c.contact_number,
              c.address AS customer_address, c.city, c.state, c.pincode,
              c.gst_number AS customer_gst, c.pan_number AS customer_pan,
              pc.category_name AS price_category_name, pc.category_code
       FROM orders o
       JOIN customers c ON o.customer_id = c.customer_id
       LEFT JOIN price_categories pc ON c.price_category_id = pc.category_id
       WHERE o.order_id = $1`,
      [parseInt(req.params.id)]
    );

    if (orderRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const itemsRes = await query(
      `SELECT oi.*,
              p.product_name, p.sku, p.brand, p.model_number,
              p.hsn_code, p.unit, p.gst_percentage
       FROM order_items oi
       JOIN products p ON oi.product_id = p.product_id
       WHERE oi.order_id = $1
       ORDER BY oi.order_item_id`,
      [parseInt(req.params.id)]
    );

    const paymentsRes = await query(
      `SELECT * FROM customer_payments WHERE order_id = $1 ORDER BY payment_date DESC`,
      [parseInt(req.params.id)]
    );

    res.json({
      success: true,
      order: orderRes.rows[0],
      items: itemsRes.rows,
      payments: paymentsRes.rows,
    });
  } catch (err) {
    console.error('Get order error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch order.' });
  }
});

// ─── POST /api/orders — create order ─────────────────────────
router.post('/', verifyToken, async (req, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const {
      customer_id, order_date, items, payment_method = 'Credit',
      delivery_address, delivery_date, notes, delivery_type = 'Pickup',
      paid_amount = 0,
    } = req.body;

    if (!customer_id) throw new Error('Customer is required.');
    if (!items || items.length === 0) throw new Error('At least one product is required.');

    // Get customer's price category
    const custRes = await client.query(
      `SELECT c.customer_id, c.price_category_id, pc.category_code
       FROM customers c
       LEFT JOIN price_categories pc ON c.price_category_id = pc.category_id
       WHERE c.customer_id = $1`,
      [parseInt(customer_id)]
    );
    if (custRes.rows.length === 0) throw new Error('Customer not found.');
    const customer = custRes.rows[0];
    const categoryCode = customer.category_code || 'RTL';

    // Build order items with correct pricing
    let subtotal = 0;
    let totalTax = 0;
    let totalDiscount = 0;
    const processedItems = [];

    for (const item of items) {
      const prodRes = await client.query(
        `SELECT product_id, product_name, retail_price, lko_local_price,
                outer_market_price, special_rate_price, gst_percentage,
                current_stock, unit, hsn_code
         FROM products WHERE product_id = $1 AND is_active = TRUE`,
        [parseInt(item.product_id)]
      );
      if (prodRes.rows.length === 0) throw new Error(`Product ID ${item.product_id} not found.`);

      const prod = prodRes.rows[0];

      // Check stock
      if (prod.current_stock < parseInt(item.quantity)) {
        throw new Error(`Insufficient stock for "${prod.product_name}". Available: ${prod.current_stock}`);
      }

      // Auto-pick price based on customer category
      let unitPrice = parseFloat(item.unit_price); // allow manual override
      if (!unitPrice) {
        const priceMap = {
          'LKO': parseFloat(prod.lko_local_price),
          'OUT': parseFloat(prod.outer_market_price),
          'SPL': parseFloat(prod.special_rate_price),
          'RTL': parseFloat(prod.retail_price),
        };
        unitPrice = priceMap[categoryCode] || parseFloat(prod.retail_price);
      }

      const qty = parseInt(item.quantity);
      const discPct = parseFloat(item.discount_percentage) || 0;
      const lineGross = unitPrice * qty;
      const discAmt = (lineGross * discPct) / 100;
      const afterDisc = lineGross - discAmt;
      const gstPct = parseFloat(prod.gst_percentage) || 18;
      const taxAmt = (afterDisc * gstPct) / 100;
      const lineTotal = afterDisc + taxAmt;

      subtotal      += lineGross;
      totalTax      += taxAmt;
      totalDiscount += discAmt;

      processedItems.push({
        product_id: prod.product_id,
        quantity: qty,
        unit_price: unitPrice,
        discount_percentage: discPct,
        discount_amount: discAmt,
        tax_percentage: gstPct,
        tax_amount: taxAmt,
        total_amount: lineTotal,
        price_category_used: categoryCode,
      });
    }

    const totalAmount  = subtotal - totalDiscount + totalTax;
    const paidAmt      = parseFloat(paid_amount) || 0;
    const balanceAmt   = totalAmount - paidAmt;
    const paymentStatus = paidAmt >= totalAmount ? 'Paid' : paidAmt > 0 ? 'Partial' : 'Unpaid';

    // Insert order
    const orderRes = await client.query(
      `INSERT INTO orders (
        customer_id, order_date, order_status, payment_status,
        subtotal, tax_amount, discount_amount, total_amount,
        paid_amount, balance_amount, payment_method,
        delivery_address, delivery_date, delivery_type, notes, created_by
      ) VALUES ($1,$2,'Confirmed',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      RETURNING *`,
      [
        parseInt(customer_id),
        order_date || new Date().toISOString().split('T')[0],
        paymentStatus,
        subtotal.toFixed(2), totalTax.toFixed(2), totalDiscount.toFixed(2),
        totalAmount.toFixed(2), paidAmt.toFixed(2), balanceAmt.toFixed(2),
        payment_method, delivery_address || null, delivery_date || null,
        delivery_type, notes || null, req.user.userId,
      ]
    );

    const order = orderRes.rows[0];

    // Insert order items + deduct stock
    for (const item of processedItems) {
      await client.query(
        `INSERT INTO order_items (
          order_id, product_id, quantity, unit_price,
          discount_percentage, discount_amount,
          tax_percentage, tax_amount, total_amount, price_category_used
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          order.order_id, item.product_id, item.quantity, item.unit_price,
          item.discount_percentage, item.discount_amount,
          item.tax_percentage, item.tax_amount, item.total_amount,
          item.price_category_used,
        ]
      );

      // Deduct stock
      await client.query(
        `UPDATE products SET current_stock = current_stock - $1, updated_at = NOW()
         WHERE product_id = $2`,
        [item.quantity, item.product_id]
      );

      // Record inventory transaction
      await client.query(
        `INSERT INTO inventory_transactions (product_id, transaction_type, quantity, reference_type, reference_id, transaction_date, created_by)
         VALUES ($1, 'OUT', $2, 'Order', $3, CURRENT_DATE, $4)`,
        [item.product_id, item.quantity, order.order_id, req.user.userId]
      );
    }

    // If paid_amount > 0, record payment
    if (paidAmt > 0) {
      await client.query(
        `INSERT INTO customer_payments (customer_id, order_id, payment_date, amount, payment_method, notes, recorded_by)
         VALUES ($1, $2, CURRENT_DATE, $3, $4, 'Payment at order creation', $5)`,
        [parseInt(customer_id), order.order_id, paidAmt, payment_method, req.user.userId]
      );
    }

    // Update customer balance
    await client.query(
      `UPDATE customers SET current_balance = current_balance + $1, updated_at = NOW()
       WHERE customer_id = $2`,
      [balanceAmt.toFixed(2), parseInt(customer_id)]
    );

    await client.query('COMMIT');

    // ── Post-commit: WhatsApp + low stock (non-blocking) ──────
    const custForWA = await query(
      'SELECT name, contact_number FROM customers WHERE customer_id = $1', [parseInt(customer_id)]
    ).catch(() => null);
    if (custForWA?.rows?.[0]?.contact_number) {
      sendOrderConfirmed({
        customerName:  custForWA.rows[0].name,
        orderNumber:   order.order_number,
        totalAmount:   totalAmount,
        balanceAmount: balanceAmt,
        phone:         custForWA.rows[0].contact_number,
        customerId:    parseInt(customer_id),
      }).catch(console.error);
    }
    for (const item of processedItems) {
      checkAndAlertLowStock(item.product_id).catch(console.error);
    }

    res.status(201).json({
      success: true,
      message: 'Order created successfully.',
      order: { ...order, items: processedItems },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Create order error:', err.message);
    res.status(400).json({ success: false, message: err.message || 'Failed to create order.' });
  } finally {
    client.release();
  }
});

// ─── PATCH /api/orders/:id/status — update order status ──────
router.patch('/:id/status', verifyToken, async (req, res) => {
  try {
    const { order_status } = req.body;
    const validStatuses = ['Pending', 'Confirmed', 'Delivered', 'Cancelled'];
    if (!validStatuses.includes(order_status)) {
      return res.status(400).json({ success: false, message: 'Invalid status.' });
    }

    const result = await query(
      `UPDATE orders SET order_status = $1, updated_at = NOW()
       WHERE order_id = $2 RETURNING *`,
      [order_status, parseInt(req.params.id)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    res.json({ success: true, message: `Order marked as ${order_status}.`, order: result.rows[0] });
  } catch (err) {
    console.error('Update order status error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to update order status.' });
  }
});

// ─── POST /api/orders/:id/payment — record payment for order ─
router.post('/:id/payment', verifyToken, async (req, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { amount, payment_method = 'Cash', transaction_ref, notes } = req.body;
    const orderId = parseInt(req.params.id);
    const payAmount = parseFloat(amount);

    if (!payAmount || payAmount <= 0) throw new Error('Payment amount must be greater than 0.');

    // Get order
    const orderRes = await client.query(
      'SELECT * FROM orders WHERE order_id = $1', [orderId]
    );
    if (orderRes.rows.length === 0) throw new Error('Order not found.');
    const order = orderRes.rows[0];

    if (payAmount > parseFloat(order.balance_amount)) {
      throw new Error(`Payment (₹${payAmount}) cannot exceed balance (₹${order.balance_amount}).`);
    }

    // Record payment
    await client.query(
      `INSERT INTO customer_payments (customer_id, order_id, payment_date, amount, payment_method, transaction_ref, notes, recorded_by)
       VALUES ($1, $2, CURRENT_DATE, $3, $4, $5, $6, $7)`,
      [order.customer_id, orderId, payAmount, payment_method, transaction_ref || null, notes || null, req.user.userId]
    );

    const newPaid    = parseFloat(order.paid_amount) + payAmount;
    const newBalance = parseFloat(order.total_amount) - newPaid;
    const newStatus  = newBalance <= 0 ? 'Paid' : 'Partial';

    // Update order
    await client.query(
      `UPDATE orders SET paid_amount = $1, balance_amount = $2, payment_status = $3, updated_at = NOW()
       WHERE order_id = $4`,
      [newPaid.toFixed(2), Math.max(0, newBalance).toFixed(2), newStatus, orderId]
    );

    // Update customer balance
    await client.query(
      `UPDATE customers SET current_balance = current_balance - $1, updated_at = NOW()
       WHERE customer_id = $2`,
      [payAmount, order.customer_id]
    );

    await client.query('COMMIT');

    // WhatsApp payment notification (non-blocking)
    query('SELECT name, contact_number FROM customers WHERE customer_id = $1', [order.customer_id]).then(custRes => {
      if (custRes.rows[0]?.contact_number) {
        sendPaymentReceived({ customerName: custRes.rows[0].name, amount: payAmount, orderNumber: order.order_number, balanceAmount: Math.max(0, newBalance), phone: custRes.rows[0].contact_number, customerId: order.customer_id }).catch(console.error);
      }
    }).catch(console.error);

    res.json({ success: true, message: 'Payment recorded successfully.', newBalance: Math.max(0, newBalance) });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Record payment error:', err.message);
    res.status(400).json({ success: false, message: err.message || 'Failed to record payment.' });
  } finally {
    client.release();
  }
});

// ─── GET /api/orders/customer/:id — orders for a customer ────
router.get('/customer/:id', verifyToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT o.*, c.name AS customer_name
       FROM orders o
       JOIN customers c ON o.customer_id = c.customer_id
       WHERE o.customer_id = $1
       ORDER BY o.created_at DESC`,
      [parseInt(req.params.id)]
    );
    res.json({ success: true, orders: result.rows });
  } catch (err) {
    console.error('Get customer orders error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch customer orders.' });
  }
});

module.exports = router;
