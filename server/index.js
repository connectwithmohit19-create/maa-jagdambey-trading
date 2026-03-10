require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const path = require('path');
const { pool } = require('./db');

(async () => {
  try {
    await pool.query('SELECT NOW()');
    console.log('Database test successful');
  } catch (err) {
    console.error('Database test failed:', err.message);
  }
})();

const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const productRoutes = require('./routes/products');
const customerRoutes = require('./routes/customers');
const orderRoutes = require('./routes/orders');
const paymentRoutes = require('./routes/payments');
const employeeRoutes = require('./routes/employees');
const reportsRoutes = require('./routes/reports');
const portalRoutes = require('./routes/portal');
const catalogueRoutes = require('./routes/catalogue');

const { runWeeklyBalanceReminders } = require('./services/whatsapp');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── CORS ─────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:3000',
];
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Health check ─────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Maa Jagdambey Trading API', version: '4.0.0', timestamp: new Date().toISOString() });
});

// ─── API Routes ───────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/products', productRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/portal', portalRoutes);
app.use('/api/catalogue', catalogueRoutes);

// ─── Serve React build in production ─────────────────────────
if (process.env.NODE_ENV === 'production') {
  const buildPath = path.join(__dirname, '../client/dist');
  app.use(express.static(buildPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(buildPath, 'index.html'));
    }
  });
}

// ─── Weekly WhatsApp balance reminder — Every Monday 9:00am IST
cron.schedule('0 9 * * 1', () => {
  console.log('⏰ Cron: Weekly balance reminder triggered');
  runWeeklyBalanceReminders().catch(console.error);
}, { timezone: 'Asia/Kolkata' });

// ─── 404 ──────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found.` });
});

// ─── Error handler ────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ success: false, message: 'An unexpected error occurred.' });
});

// ─── Start ────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('╔═══════════════════════════════════════════╗');
  console.log('║  Maa Jagdambey Trading — API Server v4   ║');
  console.log(`║  http://localhost:${PORT}                    ║`);
  console.log('╚═══════════════════════════════════════════╝');
  console.log('');
  console.log('📅 Cron: Weekly WA reminder — Every Monday 9AM IST');
});

module.exports = app;


