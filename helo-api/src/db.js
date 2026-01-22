import Database from "better-sqlite3";
import path from "path";

// ✅ força usar SEMPRE o banco dentro do projeto da API
// (não depende do "cwd" do pm2)
const DB_PATH = "/home/deploy/helo-cosmeticos/helo-api/data.sqlite";
// alternativa mais flexível:
// const DB_PATH = path.resolve("/home/deploy/helo-cosmeticos/helo-api", "data.sqlite");

const db = new Database(DB_PATH);

// cria tabela se não existir
db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    price_cents INTEGER NOT NULL,
    category TEXT NOT NULL,
    image_url TEXT DEFAULT '',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
  CREATE INDEX IF NOT EXISTS idx_products_title ON products(title);
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS product_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    image_url TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);
`);

// ✅ migração segura: só adiciona colunas se não existirem
function addColumnIfNotExists(table, column, type) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
  if (!cols.includes(column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
  }
}

addColumnIfNotExists("products", "dicas_uso", "TEXT");
addColumnIfNotExists("products", "o_que_vai_sentir", "TEXT");

export default db;
