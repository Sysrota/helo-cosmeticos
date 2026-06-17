#!/bin/bash

set -Eeuo pipefail

echo "🚀 Iniciando deploy Helo Cosméticos..."

PROJECT_DIR="$HOME/helo-cosmeticos"

BACKEND_DIR="$PROJECT_DIR/backend"

FRONTEND_DIR="$PROJECT_DIR/frontend"

# -----------------------------
# Atualiza projeto
# -----------------------------
echo "📦 Atualizando repositório..."

cd "$PROJECT_DIR"

git pull --ff-only

# -----------------------------
# Backend
# -----------------------------
echo "📦 Instalando dependências backend..."

cd "$BACKEND_DIR"

npm ci --no-audit --no-fund

echo "🧬 Prisma generate..."

npx prisma generate

echo "🗄️ Prisma migrate deploy..."

npx prisma migrate deploy

echo "🏗️ Build backend..."

npm run build

# O Node executa o dist diretamente e não resolve alias "@/".
if grep -R 'require("@/' "$BACKEND_DIR/dist" >/dev/null 2>&1; then
  echo "ERRO: build backend contém import '@/'. Corrija antes de reiniciar o PM2."
  exit 1
fi

# -----------------------------
# Frontend
# -----------------------------
echo "📦 Instalando dependências frontend..."

cd "$FRONTEND_DIR"

yarn install --frozen-lockfile

echo "🏗️ Build frontend..."

yarn build

echo "🔎 Gerando páginas SEO de produtos..."

cd "$PROJECT_DIR"

node tools/generate-product-seo-pages.mjs

SEO_SAMPLE_FILE="$(find "$FRONTEND_DIR/dist/produto" -mindepth 2 -maxdepth 2 -name index.html | head -n 1 || true)"

if [ -z "$SEO_SAMPLE_FILE" ]; then
  echo "ERRO: nenhuma página SEO de produto foi gerada em $FRONTEND_DIR/dist/produto."
  exit 1
fi

if ! grep -q 'property="og:type" content="product"' "$SEO_SAMPLE_FILE"; then
  echo "ERRO: página SEO gerada sem Open Graph de produto: $SEO_SAMPLE_FILE"
  exit 1
fi

echo "✅ Página SEO de produto validada: $SEO_SAMPLE_FILE"

# -----------------------------
# Reinicia backend PM2
# -----------------------------
echo "🔄 Reiniciando backend..."

pm2 restart helo-backend --update-env
pm2 save

# -----------------------------
# Reload nginx
# -----------------------------
echo "🌐 Reload nginx..."

sudo systemctl reload nginx

# -----------------------------
# Final
# -----------------------------
echo "✅ Deploy finalizado!"

pm2 list
