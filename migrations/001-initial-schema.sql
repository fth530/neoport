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
