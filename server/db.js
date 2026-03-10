const { Pool } = require('pg');
require('dotenv').config();

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set in .env file');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('connect', () => {
  console.log('✅ Connected to Neon DB');
});

pool.on('error', (err) => {
  console.error('❌ Database pool error:', err.message);
});

// Helper: run a query
const query = (text, params) => pool.query(text, params);

// Helper: get a client for transactions
const getClient = () => pool.connect();

module.exports = { query, getClient, pool };
