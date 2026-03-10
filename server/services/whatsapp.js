const axios = require('axios');
const { query } = require('../db');

const WA_API_URL = `https://graph.facebook.com/v19.0/${process.env.META_PHONE_NUMBER_ID}/messages`;
const WA_TOKEN   = process.env.META_WA_ACCESS_TOKEN;
const ADMIN_PHONE = process.env.ADMIN_WHATSAPP_NUMBER; // e.g. "919876543210" (country code + number)

// ─── Core send function ───────────────────────────────────────
async function sendWhatsAppMessage(to, templateName, components = []) {
  if (!WA_TOKEN || !process.env.META_PHONE_NUMBER_ID) {
    console.warn('⚠️  WhatsApp: META_PHONE_NUMBER_ID or META_WA_ACCESS_TOKEN not configured. Skipping.');
    return null;
  }

  // Normalize phone: strip spaces, dashes; add 91 if missing country code
  let phone = to.replace(/[\s\-\(\)]/g, '');
  if (phone.startsWith('0')) phone = '91' + phone.slice(1);
  if (!phone.startsWith('91') && phone.length === 10) phone = '91' + phone;

  try {
    const res = await axios.post(
      WA_API_URL,
      {
        messaging_product: 'whatsapp',
        to: phone,
        type: 'template',
        template: {
          name: templateName,
          language: { code: 'en' },
          components,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${WA_TOKEN}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    const msgId = res.data?.messages?.[0]?.id;
    console.log(`✅ WhatsApp sent — template: ${templateName}, to: ${phone}, id: ${msgId}`);
    return msgId;
  } catch (err) {
    const errMsg = err.response?.data?.error?.message || err.message;
    console.error(`❌ WhatsApp error — template: ${templateName}, to: ${phone}: ${errMsg}`);
    return null;
  }
}

// ─── Log to DB ────────────────────────────────────────────────
async function logMessage({ recipientType, recipientId, phone, templateName, messageSid }) {
  try {
    await query(
      `INSERT INTO whatsapp_logs (recipient_type, recipient_id, phone_number, template_name, message_sid)
       VALUES ($1,$2,$3,$4,$5)`,
      [recipientType, recipientId || null, phone, templateName, messageSid || null]
    );
  } catch (err) {
    console.error('WA log error:', err.message);
  }
}

// ─── Template: Order Confirmed ────────────────────────────────
// Template name: mjt_order_confirmed
// Parameters: customer_name, order_number, total_amount, balance_amount
async function sendOrderConfirmed({ customerName, orderNumber, totalAmount, balanceAmount, phone, customerId }) {
  const components = [
    {
      type: 'body',
      parameters: [
        { type: 'text', text: customerName },
        { type: 'text', text: orderNumber },
        { type: 'text', text: `₹${Number(totalAmount).toLocaleString('en-IN')}` },
        { type: 'text', text: `₹${Number(balanceAmount).toLocaleString('en-IN')}` },
      ],
    },
  ];
  const sid = await sendWhatsAppMessage(phone, 'mjt_order_confirmed', components);
  if (sid) await logMessage({ recipientType: 'customer', recipientId: customerId, phone, templateName: 'mjt_order_confirmed', messageSid: sid });
  return sid;
}

// ─── Template: Payment Received ──────────────────────────────
// Template name: mjt_payment_received
// Parameters: customer_name, amount, order_number, balance_amount
async function sendPaymentReceived({ customerName, amount, orderNumber, balanceAmount, phone, customerId }) {
  const components = [
    {
      type: 'body',
      parameters: [
        { type: 'text', text: customerName },
        { type: 'text', text: `₹${Number(amount).toLocaleString('en-IN')}` },
        { type: 'text', text: orderNumber },
        { type: 'text', text: `₹${Number(balanceAmount).toLocaleString('en-IN')}` },
      ],
    },
  ];
  const sid = await sendWhatsAppMessage(phone, 'mjt_payment_received', components);
  if (sid) await logMessage({ recipientType: 'customer', recipientId: customerId, phone, templateName: 'mjt_payment_received', messageSid: sid });
  return sid;
}

// ─── Template: Balance Reminder ──────────────────────────────
// Template name: mjt_balance_reminder
// Parameters: customer_name, balance_amount, business_name, phone_number
async function sendBalanceReminder({ customerName, balanceAmount, phone, customerId }) {
  const components = [
    {
      type: 'body',
      parameters: [
        { type: 'text', text: customerName },
        { type: 'text', text: `₹${Number(balanceAmount).toLocaleString('en-IN')}` },
        { type: 'text', text: 'Maa Jagdambey Trading' },
        { type: 'text', text: ADMIN_PHONE ? ADMIN_PHONE.slice(-10) : '9999999999' },
      ],
    },
  ];
  const sid = await sendWhatsAppMessage(phone, 'mjt_balance_reminder', components);
  if (sid) await logMessage({ recipientType: 'customer', recipientId: customerId, phone, templateName: 'mjt_balance_reminder', messageSid: sid });
  return sid;
}

// ─── Template: Low Stock Alert (to admin) ────────────────────
// Template name: mjt_low_stock_alert
// Parameters: product_name, current_stock, sku
async function sendLowStockAlert({ productName, currentStock, sku }) {
  if (!ADMIN_PHONE) {
    console.warn('⚠️  ADMIN_WHATSAPP_NUMBER not set. Skipping low stock alert.');
    return null;
  }
  const components = [
    {
      type: 'body',
      parameters: [
        { type: 'text', text: productName },
        { type: 'text', text: String(currentStock) },
        { type: 'text', text: sku || 'N/A' },
      ],
    },
  ];
  const sid = await sendWhatsAppMessage(ADMIN_PHONE, 'mjt_low_stock_alert', components);
  if (sid) await logMessage({ recipientType: 'admin', phone: ADMIN_PHONE, templateName: 'mjt_low_stock_alert', messageSid: sid });
  return sid;
}

// ─── Weekly Balance Reminder Job ─────────────────────────────
// Called by node-cron every Monday 9am
async function runWeeklyBalanceReminders() {
  console.log('📲 Running weekly WhatsApp balance reminders...');
  try {
    const result = await query(
      `SELECT customer_id, name, contact_number, current_balance
       FROM customers
       WHERE current_balance > 0
         AND status = 'Active'
         AND contact_number IS NOT NULL
       ORDER BY current_balance DESC`
    );

    console.log(`Found ${result.rows.length} customers with outstanding balance.`);
    let sent = 0;

    for (const customer of result.rows) {
      // Rate limit: 1 message per second
      await new Promise((r) => setTimeout(r, 1000));
      const sid = await sendBalanceReminder({
        customerName: customer.name,
        balanceAmount: customer.current_balance,
        phone: customer.contact_number,
        customerId: customer.customer_id,
      });
      if (sid) sent++;
    }

    console.log(`✅ Weekly reminders sent: ${sent}/${result.rows.length}`);
  } catch (err) {
    console.error('❌ Weekly reminder job failed:', err.message);
  }
}

// ─── Low Stock Check (call after order creation) ─────────────
async function checkAndAlertLowStock(productId) {
  try {
    const LOW_STOCK_THRESHOLD = parseInt(process.env.LOW_STOCK_THRESHOLD) || 3;
    const res = await query(
      'SELECT product_id, product_name, current_stock, sku FROM products WHERE product_id = $1',
      [productId]
    );
    if (res.rows.length === 0) return;
    const prod = res.rows[0];
    if (prod.current_stock <= LOW_STOCK_THRESHOLD) {
      await sendLowStockAlert({
        productName: prod.product_name,
        currentStock: prod.current_stock,
        sku: prod.sku,
      });
    }
  } catch (err) {
    console.error('Low stock check error:', err.message);
  }
}

module.exports = {
  sendOrderConfirmed,
  sendPaymentReceived,
  sendBalanceReminder,
  sendLowStockAlert,
  checkAndAlertLowStock,
  runWeeklyBalanceReminders,
};
