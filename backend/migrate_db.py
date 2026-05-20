import sqlite3
conn = sqlite3.connect('supply_chain_app/backend/supply_chain.db')
c = conn.cursor()

# Check inventory columns
cols = [r[1] for r in c.execute('PRAGMA table_info(inventory)').fetchall()]
print('Inventory cols:', cols)

if 'profit_rate' not in cols:
    c.execute('ALTER TABLE inventory ADD COLUMN profit_rate REAL DEFAULT 10.0')
    conn.commit()
    print('Added profit_rate column')
else:
    print('profit_rate column already exists')

# Create orders table
c.execute('''CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT,
    total_amount REAL DEFAULT 0,
    total_profit REAL DEFAULT 0,
    item_count INTEGER DEFAULT 0
)''')

# Create order_items table
c.execute('''CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER REFERENCES orders(id),
    product_id INTEGER,
    product_name TEXT,
    quantity INTEGER DEFAULT 1,
    unit_price REAL DEFAULT 0,
    profit_rate REAL DEFAULT 0,
    subtotal REAL DEFAULT 0,
    profit REAL DEFAULT 0
)''')

conn.commit()
tables = [r[0] for r in c.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
print('All tables:', tables)
conn.close()
print('Migration complete!')
