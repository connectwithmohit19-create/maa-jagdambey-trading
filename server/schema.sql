-- ============================================================
-- MAA JAGDAMBEY TRADING — Part 1: Tables
-- Run this FIRST
-- ============================================================

-- Set the schema

CREATE SCHEMA IF NOT EXISTS public;

SET search_path TO public;

-- 1. PRICE CATEGORIES
CREATE TABLE IF NOT EXISTS price_categories (
  category_id   SERIAL PRIMARY KEY,
  category_name VARCHAR(100) NOT NULL,
  category_code VARCHAR(20) UNIQUE NOT NULL,
  description   TEXT,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMP DEFAULT NOW()
);

-- 2. PRODUCT CATEGORIES
CREATE TABLE IF NOT EXISTS product_categories (
  category_id        SERIAL PRIMARY KEY,
  category_name      VARCHAR(100) NOT NULL,
  parent_category_id INTEGER REFERENCES product_categories(category_id) ON DELETE SET NULL,
  category_image     TEXT,
  description        TEXT,
  display_order      INTEGER DEFAULT 0,
  is_active          BOOLEAN DEFAULT TRUE,
  created_at         TIMESTAMP DEFAULT NOW()
);

-- 3. CUSTOMERS
CREATE TABLE IF NOT EXISTS customers (
  customer_id          SERIAL PRIMARY KEY,
  customer_code        VARCHAR(50) UNIQUE,
  name                 VARCHAR(255) NOT NULL,
  shop_name            VARCHAR(255),
  contact_number       VARCHAR(20) NOT NULL,
  alternate_number     VARCHAR(20),
  email                VARCHAR(255),
  address              TEXT,
  city                 VARCHAR(100) DEFAULT 'Lucknow',
  state                VARCHAR(100) DEFAULT 'Uttar Pradesh',
  pincode              VARCHAR(10),
  gst_number           VARCHAR(15),
  pan_number           VARCHAR(10),
  price_category_id    INTEGER REFERENCES price_categories(category_id) ON DELETE SET NULL,
  credit_limit         DECIMAL(12,2) DEFAULT 0,
  current_balance      DECIMAL(12,2) DEFAULT 0,
  customer_type        VARCHAR(50) DEFAULT 'Retailer',
  is_verified          BOOLEAN DEFAULT FALSE,
  status               VARCHAR(20) DEFAULT 'Active',
  portal_username      VARCHAR(100) UNIQUE,
  portal_password_hash VARCHAR(255),
  portal_enabled       BOOLEAN DEFAULT FALSE,
  created_at           TIMESTAMP DEFAULT NOW(),
  updated_at           TIMESTAMP DEFAULT NOW()
);

-- 4. PRODUCTS
CREATE TABLE IF NOT EXISTS products (
  product_id          SERIAL PRIMARY KEY,
  sku                 VARCHAR(100) UNIQUE,
  product_name        VARCHAR(255) NOT NULL,
  category_id         INTEGER REFERENCES product_categories(category_id) ON DELETE SET NULL,
  brand               VARCHAR(100),
  model_number        VARCHAR(100),
  description         TEXT,
  warranty_period     VARCHAR(50),
  warranty_type       VARCHAR(100),
  purchase_price      DECIMAL(12,2) DEFAULT 0,
  retail_price        DECIMAL(12,2) DEFAULT 0,
  lko_local_price     DECIMAL(12,2) DEFAULT 0,
  outer_market_price  DECIMAL(12,2) DEFAULT 0,
  special_rate_price  DECIMAL(12,2) DEFAULT 0,
  current_stock       INTEGER DEFAULT 0,
  minimum_stock       INTEGER DEFAULT 5,
  unit                VARCHAR(20) DEFAULT 'Piece',
  hsn_code            VARCHAR(20),
  gst_percentage      DECIMAL(5,2) DEFAULT 18.00,
  product_image_url   TEXT,
  specifications      JSONB,
  is_active           BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMP DEFAULT NOW(),
  updated_at          TIMESTAMP DEFAULT NOW()
);

-- 5. ADMIN USERS
CREATE TABLE IF NOT EXISTS admin_users (
  user_id        SERIAL PRIMARY KEY,
  username       VARCHAR(50) UNIQUE NOT NULL,
  password_hash  VARCHAR(255) NOT NULL,
  full_name      VARCHAR(255) NOT NULL,
  email          VARCHAR(255),
  contact_number VARCHAR(20),
  role           VARCHAR(50) DEFAULT 'Admin',
  permissions    JSONB DEFAULT '{}',
  is_active      BOOLEAN DEFAULT TRUE,
  last_login     TIMESTAMP,
  created_at     TIMESTAMP DEFAULT NOW()
);

-- 6. EMPLOYEES
CREATE TABLE IF NOT EXISTS employees (
  employee_id      SERIAL PRIMARY KEY,
  employee_code    VARCHAR(50) UNIQUE,
  name             VARCHAR(255) NOT NULL,
  contact_number   VARCHAR(20) NOT NULL,
  address          TEXT,
  aadhar_number    VARCHAR(12),
  joining_date     DATE NOT NULL,
  designation      VARCHAR(100),
  monthly_salary   DECIMAL(10,2) DEFAULT 0,
  current_balance  DECIMAL(10,2) DEFAULT 0,
  status           VARCHAR(20) DEFAULT 'Active',
  created_at       TIMESTAMP DEFAULT NOW(),
  updated_at       TIMESTAMP DEFAULT NOW()
);

-- 7. EMPLOYEE ATTENDANCE
CREATE TABLE IF NOT EXISTS employee_attendance (
  attendance_id   SERIAL PRIMARY KEY,
  employee_id     INTEGER NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  status          VARCHAR(20) DEFAULT 'Present',
  check_in_time   TIME,
  check_out_time  TIME,
  notes           TEXT,
  marked_by       INTEGER REFERENCES admin_users(user_id) ON DELETE SET NULL,
  created_at      TIMESTAMP DEFAULT NOW(),
  UNIQUE(employee_id, attendance_date)
);

-- 8. EMPLOYEE SALARY PAYMENTS
CREATE TABLE IF NOT EXISTS employee_salary_payments (
  payment_id      SERIAL PRIMARY KEY,
  employee_id     INTEGER NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
  payment_date    DATE NOT NULL,
  amount          DECIMAL(10,2) NOT NULL,
  payment_type    VARCHAR(50) DEFAULT 'Salary',
  month_year      VARCHAR(20),
  payment_method  VARCHAR(50) DEFAULT 'Cash',
  notes           TEXT,
  paid_by         INTEGER REFERENCES admin_users(user_id) ON DELETE SET NULL,
  created_at      TIMESTAMP DEFAULT NOW()
);

-- 9. EMPLOYEE PERSONAL PURCHASES
CREATE TABLE IF NOT EXISTS employee_personal_purchases (
  purchase_id     SERIAL PRIMARY KEY,
  employee_id     INTEGER NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
  product_id      INTEGER REFERENCES products(product_id) ON DELETE SET NULL,
  purchase_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  quantity        INTEGER NOT NULL DEFAULT 1,
  unit_price      DECIMAL(10,2) NOT NULL,
  total_amount    DECIMAL(10,2) NOT NULL,
  payment_status  VARCHAR(50) DEFAULT 'Pending',
  notes           TEXT,
  created_at      TIMESTAMP DEFAULT NOW()
);

-- 10. ORDERS
CREATE TABLE IF NOT EXISTS orders (
  order_id         SERIAL PRIMARY KEY,
  order_number     VARCHAR(50) UNIQUE,
  customer_id      INTEGER NOT NULL REFERENCES customers(customer_id) ON DELETE RESTRICT,
  order_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  order_status     VARCHAR(50) DEFAULT 'Pending',
  payment_status   VARCHAR(50) DEFAULT 'Unpaid',
  subtotal         DECIMAL(12,2) DEFAULT 0,
  tax_amount       DECIMAL(12,2) DEFAULT 0,
  discount_amount  DECIMAL(12,2) DEFAULT 0,
  total_amount     DECIMAL(12,2) DEFAULT 0,
  paid_amount      DECIMAL(12,2) DEFAULT 0,
  balance_amount   DECIMAL(12,2) DEFAULT 0,
  payment_method   VARCHAR(50) DEFAULT 'Credit',
  delivery_address TEXT,
  delivery_date    DATE,
  delivery_type    VARCHAR(20) DEFAULT 'Pickup',
  notes            TEXT,
  created_by       INTEGER REFERENCES admin_users(user_id) ON DELETE SET NULL,
  created_at       TIMESTAMP DEFAULT NOW(),
  updated_at       TIMESTAMP DEFAULT NOW()
);

-- 11. ORDER ITEMS
CREATE TABLE IF NOT EXISTS order_items (
  order_item_id       SERIAL PRIMARY KEY,
  order_id            INTEGER NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  product_id          INTEGER NOT NULL REFERENCES products(product_id) ON DELETE RESTRICT,
  quantity            INTEGER NOT NULL,
  unit_price          DECIMAL(12,2) NOT NULL,
  discount_percentage DECIMAL(5,2) DEFAULT 0,
  discount_amount     DECIMAL(12,2) DEFAULT 0,
  tax_percentage      DECIMAL(5,2) DEFAULT 18.00,
  tax_amount          DECIMAL(12,2) DEFAULT 0,
  total_amount        DECIMAL(12,2) NOT NULL,
  price_category_used VARCHAR(50)
);

-- 12. CUSTOMER PAYMENTS
CREATE TABLE IF NOT EXISTS customer_payments (
  payment_id       SERIAL PRIMARY KEY,
  payment_number   VARCHAR(50) UNIQUE,
  customer_id      INTEGER NOT NULL REFERENCES customers(customer_id) ON DELETE RESTRICT,
  order_id         INTEGER REFERENCES orders(order_id) ON DELETE SET NULL,
  payment_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  amount           DECIMAL(12,2) NOT NULL,
  payment_method   VARCHAR(50) DEFAULT 'Cash',
  transaction_ref  VARCHAR(100),
  notes            TEXT,
  recorded_by      INTEGER REFERENCES admin_users(user_id) ON DELETE SET NULL,
  created_at       TIMESTAMP DEFAULT NOW()
);

-- 13. INVENTORY TRANSACTIONS
CREATE TABLE IF NOT EXISTS inventory_transactions (
  transaction_id   SERIAL PRIMARY KEY,
  product_id       INTEGER NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
  transaction_type VARCHAR(50) NOT NULL,
  quantity         INTEGER NOT NULL,
  reference_type   VARCHAR(50),
  reference_id     INTEGER,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes            TEXT,
  created_by       INTEGER REFERENCES admin_users(user_id) ON DELETE SET NULL,
  created_at       TIMESTAMP DEFAULT NOW()
);

SELECT 'Part 1: Core tables created successfully! ✅ Now run 02_automation_indexes.sql' AS message;