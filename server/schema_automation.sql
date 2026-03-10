-- ============================================================
-- MAA JAGDAMBEY TRADING — Part 2: Automation & Indexes
-- Run this SECOND (after 01_tables.sql)
-- ============================================================

-- Set the schema

CREATE SCHEMA IF NOT EXISTS public;

SET search_path TO public;

-- 14. WHATSAPP LOGS TABLE
CREATE TABLE IF NOT EXISTS whatsapp_logs (
  log_id         SERIAL PRIMARY KEY,
  recipient_type VARCHAR(20) NOT NULL,
  recipient_id   INTEGER,
  phone_number   VARCHAR(20) NOT NULL,
  template_name  VARCHAR(100) NOT NULL,
  message_sid    VARCHAR(255),
  status         VARCHAR(50) DEFAULT 'sent',
  sent_at        TIMESTAMP DEFAULT NOW()
);

-- SEQUENCES
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;
CREATE SEQUENCE IF NOT EXISTS payment_number_seq START 1;

-- FUNCTION: Auto-generate order numbers
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL THEN
    NEW.order_number := 'ORD-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('order_number_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- FUNCTION: Auto-generate payment numbers
CREATE OR REPLACE FUNCTION generate_payment_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_number IS NULL THEN
    NEW.payment_number := 'PAY-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('payment_number_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- TRIGGER: Order number auto-generation
DROP TRIGGER IF EXISTS trg_order_number ON orders;
CREATE TRIGGER trg_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION generate_order_number();

-- TRIGGER: Payment number auto-generation
DROP TRIGGER IF EXISTS trg_payment_number ON customer_payments;
CREATE TRIGGER trg_payment_number
  BEFORE INSERT ON customer_payments
  FOR EACH ROW EXECUTE FUNCTION generate_payment_number();

-- INDEXES for performance
CREATE INDEX IF NOT EXISTS idx_customers_contact ON customers(contact_number);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_portal_username ON customers(portal_username) WHERE portal_username IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(order_date);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_attendance_employee ON employee_attendance(employee_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_recipient ON whatsapp_logs(recipient_type, recipient_id);

SELECT 'Part 2: Automation & Indexes created successfully! ✅' AS message;