-- ============================================================
-- MAA JAGDAMBEY TRADING — Phase 5 Schema
-- Run AFTER schema.sql and schema_automation.sql
-- ============================================================
-- Economy Series is a CROSS-CATEGORY TAG, not a product category.
-- Example: An AC can be in "Air Conditioner" category AND tagged
-- as Economy Series. A sound system can be in "Sound" AND economy.
-- This lets customers filter "Economy ACs" or "Economy TVs" etc.
-- ============================================================

SET search_path TO public;

-- Add economy series tag to products
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS is_economy_series BOOLEAN DEFAULT FALSE;

-- Fast index for catalogue economy filter
CREATE INDEX IF NOT EXISTS idx_products_economy ON products(is_economy_series)
  WHERE is_economy_series = TRUE;

SELECT 'Phase 5: Economy Series tag column added ✅' AS message;
