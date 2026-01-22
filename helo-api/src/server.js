import express from "express";
import cors from "cors";
import multer from "multer";
import db from "./db.js";
import { productCreateSchema, productUpdateSchema } from "./validators.js";
import path from "path";
import fs from "fs";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";


const UPLOAD_DIR = path.resolve("uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const app = express();
const PORT = process.env.PORT || 3333;

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

const JWT_SECRET = process.env.JWT_SECRET || "namaste@01";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "renato.sysrota@gmail.com";
const ADMIN_PASSWORD_HASH =
  process.env.ADMIN_PASSWORD_HASH ||
  bcrypt.hashSync(process.env.ADMIN_PASSWORD || "admin123", 10);

function auth(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Não autorizado" });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ error: "Token inválido" });
  }
}


app.post("/auth/login", (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Informe email e senha" });

  if (String(email).toLowerCase() !== String(ADMIN_EMAIL).toLowerCase()) {
    return res.status(401).json({ error: "Credenciais inválidas" });
  }

  const ok = bcrypt.compareSync(String(password), ADMIN_PASSWORD_HASH);
  if (!ok) return res.status(401).json({ error: "Credenciais inválidas" });

  const token = jwt.sign({ email: ADMIN_EMAIL, role: "admin" }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ token });
});


/**
 * Upload local (./uploads)
 * - aceita jpg/png/webp
 */
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}_${safe}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const ok = ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype);
    cb(ok ? null : new Error("Formato inválido (use jpg/png/webp)"), ok);
  },
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB
});

/**
 * Helpers
 */
function reaisToCents(v) {
  return Math.round(v * 100);
}
function centsToReais(cents) {
  return Number((cents / 100).toFixed(2));
}
function mapRow(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    price: centsToReais(row.price_cents),
    category: row.category,
    image_url: row.image_url || "",
    is_active: Boolean(row.is_active),
    created_at: row.created_at,
    updated_at: row.updated_at,
    dicas_uso: row.dicas_uso || "",
    o_que_vai_sentir: row.o_que_vai_sentir || "",
  };
}

/**
 * Imagens (galeria)
 */
const stmtFirstImage = db.prepare(`
  SELECT image_url
  FROM product_images
  WHERE product_id = ?
  ORDER BY sort_order ASC, id ASC
  LIMIT 1
`);

const stmtAllImages = db.prepare(`
  SELECT id, image_url, sort_order, created_at
  FROM product_images
  WHERE product_id = ?
  ORDER BY sort_order ASC, id ASC
`);

function getCoverImageUrl(productId, fallback = "") {
  const first = stmtFirstImage.get(productId);
  return first?.image_url || fallback || "";
}

/**
 * GET /products
 * Retorna 1 produto por id + capa (sort_order 0)
 * Inclui dicas_uso e o_que_vai_sentir também.
 */
app.get("/products", (req, res) => {
  const {
    search = "",
    category = "all",
    sort = "new",
    active = "true",
    page = "1",
    limit = "50",
  } = req.query;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
  const offset = (pageNum - 1) * limitNum;

  const where = [];
  const params = {};

  if (active === "true") where.push("p.is_active = 1");
  if (active === "false") where.push("p.is_active = 0");

  if (category && category !== "all") {
    where.push("p.category = @category");
    params.category = String(category);
  }

  if (search) {
    where.push("(p.title LIKE @q OR p.description LIKE @q)");
    params.q = `%${String(search)}%`;
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  let orderSql = "ORDER BY p.created_at DESC";
  if (sort === "low") orderSql = "ORDER BY p.price_cents ASC";
  if (sort === "high") orderSql = "ORDER BY p.price_cents DESC";
  if (sort === "new") orderSql = "ORDER BY p.created_at DESC";

  const countStmt = db.prepare(`SELECT COUNT(*) as total FROM products p ${whereSql}`);
  const { total } = countStmt.get(params);

  const listStmt = db.prepare(`
    SELECT
      p.*,
      COALESCE((
        SELECT pi.image_url
        FROM product_images pi
        WHERE pi.product_id = p.id
        ORDER BY pi.sort_order ASC, pi.id ASC
        LIMIT 1
      ), p.image_url, '') AS cover_image_url
    FROM products p
    ${whereSql}
    ${orderSql}
    LIMIT @limit OFFSET @offset
  `);

  const rows = listStmt.all({ ...params, limit: limitNum, offset });

  const items = rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    price: Number((row.price_cents / 100).toFixed(2)),
    category: row.category,
    image_url: row.cover_image_url,
    is_active: Boolean(row.is_active),
    created_at: row.created_at,
    updated_at: row.updated_at,
    dicas_uso: row.dicas_uso || "",
    o_que_vai_sentir: row.o_que_vai_sentir || "",
  }));

  res.json({ page: pageNum, limit: limitNum, total, items });
});

/**
 * GET /products/:id
 * Retorna produto + images (galeria)
 */
app.get("/products/:id", (req, res) => {
  const id = Number(req.params.id);

  const row = db.prepare("SELECT * FROM products WHERE id = ?").get(id);
  if (!row) return res.status(404).json({ error: "Produto não encontrado" });

  const product = mapRow(row);
  const images = stmtAllImages.all(id).map((i) => ({
    id: i.id,
    image_url: i.image_url,
    sort_order: i.sort_order,
    created_at: i.created_at,
  }));

  product.image_url = getCoverImageUrl(id, product.image_url);

  return res.json({ ...product, images });
});

/**
 * POST /products
 */
app.post("/products",auth, (req, res) => {
  const parsed = productCreateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const data = parsed.data;

  const stmt = db.prepare(`
    INSERT INTO products (
      title, description, price_cents, category, image_url, is_active,
      dicas_uso, o_que_vai_sentir, updated_at
    )
    VALUES (
      @title, @description, @price_cents, @category, @image_url, @is_active,
      @dicas_uso, @o_que_vai_sentir, datetime('now')
    )
  `);

  const info = stmt.run({
    title: data.title,
    description: data.description ?? "",
    price_cents: reaisToCents(data.price),
    category: data.category,
    image_url: data.image_url ?? "",
    is_active: data.is_active ? 1 : 0,
    dicas_uso: data.dicas_uso ?? "",
    o_que_vai_sentir: data.o_que_vai_sentir ?? "",
  });

  const created = db.prepare("SELECT * FROM products WHERE id = ?").get(info.lastInsertRowid);
  const product = mapRow(created);
  product.image_url = getCoverImageUrl(product.id, product.image_url);

  res.status(201).json(product);
});

/**
 * PUT /products/:id
 */
app.put("/products/:id", auth,(req, res) => {
  const id = Number(req.params.id);

  const existing = db.prepare("SELECT * FROM products WHERE id = ?").get(id);
  if (!existing) return res.status(404).json({ error: "Produto não encontrado" });

  const parsed = productUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const data = parsed.data;

  const next = {
    title: data.title ?? existing.title,
    description: data.description ?? existing.description,
    price_cents: data.price != null ? reaisToCents(data.price) : existing.price_cents,
    category: data.category ?? existing.category,
    image_url: data.image_url ?? existing.image_url ?? "",
    is_active:
      data.is_active != null ? (data.is_active ? 1 : 0) : existing.is_active ?? 1,
    dicas_uso: data.dicas_uso ?? existing.dicas_uso ?? "",
    o_que_vai_sentir: data.o_que_vai_sentir ?? existing.o_que_vai_sentir ?? "",
  };

  db.prepare(`
    UPDATE products
    SET
      title=@title,
      description=@description,
      price_cents=@price_cents,
      category=@category,
      image_url=@image_url,
      is_active=@is_active,
      dicas_uso=@dicas_uso,
      o_que_vai_sentir=@o_que_vai_sentir,
      updated_at=datetime('now')
    WHERE id=@id
  `).run({ ...next, id });

  const updated = db.prepare("SELECT * FROM products WHERE id = ?").get(id);
  const product = mapRow(updated);
  const images = stmtAllImages.all(id).map((i) => ({
    id: i.id,
    image_url: i.image_url,
    sort_order: i.sort_order,
    created_at: i.created_at,
  }));

  product.image_url = getCoverImageUrl(id, product.image_url);

  res.json({ ...product, images });
});

/**
 * DELETE /products/:id
 */
app.delete("/products/:id",auth, (req, res) => {
  const id = Number(req.params.id);
  const info = db.prepare("DELETE FROM products WHERE id = ?").run(id);
  if (info.changes === 0) return res.status(404).json({ error: "Produto não encontrado" });
  res.status(204).send();
});

/**
 * POST /products/:id/images
 * body: { image_url: string, sort_order?: number }
 */
app.post("/products/:id/images",auth, (req, res) => {
  const productId = Number(req.params.id);

  const prod = db.prepare("SELECT id FROM products WHERE id = ?").get(productId);
  if (!prod) return res.status(404).json({ error: "Produto não encontrado" });

  const { image_url, sort_order = 0 } = req.body || {};
  if (!image_url) return res.status(400).json({ error: "image_url é obrigatório" });

  const info = db
    .prepare(
      `
      INSERT INTO product_images (product_id, image_url, sort_order)
      VALUES (?, ?, ?)
    `
    )
    .run(productId, String(image_url), Number(sort_order) || 0);

  const created = db.prepare("SELECT * FROM product_images WHERE id = ?").get(info.lastInsertRowid);

  res.status(201).json({
    id: created.id,
    product_id: created.product_id,
    image_url: created.image_url,
    sort_order: created.sort_order,
    created_at: created.created_at,
  });
});

/**
 * PUT /products/:id/images/:imageId
 * body: { sort_order?: number }
 */
app.put("/products/:id/images/:imageId",auth, (req, res) => {
  const productId = Number(req.params.id);
  const imageId = Number(req.params.imageId);

  const existing = db
    .prepare("SELECT * FROM product_images WHERE id = ? AND product_id = ?")
    .get(imageId, productId);

  if (!existing) return res.status(404).json({ error: "Imagem não encontrada" });

  const { sort_order } = req.body || {};
  const nextSort = sort_order != null ? Number(sort_order) || 0 : existing.sort_order;

  db.prepare(
    `
    UPDATE product_images
    SET sort_order = ?
    WHERE id = ? AND product_id = ?
  `
  ).run(nextSort, imageId, productId);

  const updated = db
    .prepare("SELECT * FROM product_images WHERE id = ? AND product_id = ?")
    .get(imageId, productId);

  res.json({
    id: updated.id,
    product_id: updated.product_id,
    image_url: updated.image_url,
    sort_order: updated.sort_order,
    created_at: updated.created_at,
  });
});

/**
 * DELETE /products/:id/images/:imageId
 */
app.delete("/products/:id/images/:imageId",auth, (req, res) => {
  const productId = Number(req.params.id);
  const imageId = Number(req.params.imageId);

  const info = db
    .prepare("DELETE FROM product_images WHERE id = ? AND product_id = ?")
    .run(imageId, productId);

  if (info.changes === 0) return res.status(404).json({ error: "Imagem não encontrada" });
  res.status(204).send();
});

/**
 * POST /upload
 * multipart/form-data com campo: file
 * retorna image_url
 */
app.post("/upload",auth, upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Arquivo não enviado" });
  const image_url = `/uploads/${req.file.filename}`;
  res.status(201).json({ image_url });
});

app.get("/health", (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`API rodando em http://localhost:${PORT}`);
});
