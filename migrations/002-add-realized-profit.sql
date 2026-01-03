-- Migration: Add realized_profit column to transactions table
-- This fixes the "table transactions has no column named realized_profit" error

-- Add realized_profit column if it doesn't exist
-- SQLite doesn't support IF NOT EXISTS for ALTER TABLE, so we wrap in try/catch in migrate.js

ALTER TABLE transactions ADD COLUMN realized_profit REAL DEFAULT 0;
