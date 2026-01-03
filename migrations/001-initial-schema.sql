-- Initial Schema Migration

-- Assets Table
CREATE TABLE IF NOT EXISTS assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL CHECK(length(name) > 0 AND length(name) <= 100),
    symbol TEXT NOT NULL CHECK(length(symbol) > 0 AND length(symbol) <= 20),
    type TEXT NOT NULL CHECK(type IN ('crypto', 'stock', 'gold', 'currency')),
    quantity REAL NOT NULL DEFAULT 0 CHECK(quantity >= 0),
    avg_cost REAL NOT NULL DEFAULT 0 CHECK(avg_cost >= 0),
    current_price REAL DEFAULT 0 CHECK(current_price >= 0),
    currency TEXT DEFAULT 'TRY' CHECK(currency IN ('TRY', 'USD', 'EUR')),
    icon TEXT DEFAULT 'fa-solid fa-coins',
    icon_bg TEXT DEFAULT 'gray',
    realized_profit REAL DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(symbol, type)
);

-- Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_id INTEGER NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('buy', 'sell')),
    quantity REAL NOT NULL CHECK(quantity > 0),
    price REAL NOT NULL CHECK(price >= 0),
    total REAL NOT NULL CHECK(total >= 0),
    realized_profit REAL DEFAULT 0,
    date TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_assets_type ON assets(type);
CREATE INDEX IF NOT EXISTS idx_assets_symbol ON assets(symbol);
CREATE INDEX IF NOT EXISTS idx_transactions_asset_id ON transactions(asset_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);

-- Price Alerts Table
CREATE TABLE IF NOT EXISTS price_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_symbol TEXT NOT NULL,
    alert_type TEXT NOT NULL CHECK(alert_type IN ('PRICE_ABOVE', 'PRICE_BELOW')),
    threshold_value REAL NOT NULL,
    current_price REAL DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Alert History Table
CREATE TABLE IF NOT EXISTS alert_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alert_id INTEGER,
    trigger_price REAL,
    message TEXT,
    triggered_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(alert_id) REFERENCES price_alerts(id)
);

-- Indexes for alerts
CREATE INDEX IF NOT EXISTS idx_alerts_symbol ON price_alerts(asset_symbol);
CREATE INDEX IF NOT EXISTS idx_alerts_active ON price_alerts(is_active);
