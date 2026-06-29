#!/bin/bash

set -Eeuo pipefail

echo "🚀 Iniciando deploy Helo Cosméticos..."

PROJECT_DIR="$HOME/helo-cosmeticos"

BACKEND_DIR="$PROJECT_DIR/backend"

FRONTEND_DIR="$PROJECT_DIR/frontend"

PM2_APP_NAME="${PM2_APP_NAME:-helo-backend}"

# -----------------------------
# Atualiza projeto
# -----------------------------
echo "📦 Atualizando repositório..."

cd "$PROJECT_DIR"

git pull --ff-only

echo "📌 Commit em produção:"
git log -1 --oneline

echo "📌 Branch/status:"
git status -sb

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

echo "🔎 Validando correção da IA do WhatsApp..."

if [ ! -f "$BACKEND_DIR/src/modules/ai/services/product-intro-response.service.ts" ]; then
  echo "ERRO: correção da primeira resposta do produto não está no src. Confira se o commit foi enviado para o servidor."
  exit 1
fi

if [ ! -f "$BACKEND_DIR/dist/modules/ai/services/product-intro-response.service.js" ]; then
  echo "ERRO: correção da primeira resposta do produto não entrou no build dist."
  exit 1
fi

if ! grep -q 'buildProductIntroResponse' "$BACKEND_DIR/dist/modules/ai/workers/ai.worker.js"; then
  echo "ERRO: worker da IA no dist não está usando buildProductIntroResponse."
  exit 1
fi

echo "✅ Correção da IA do WhatsApp presente no build."

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
SEO_SAMPLE_FLAT_FILE="$(find "$FRONTEND_DIR/dist/produto" -maxdepth 1 -name '*.html' | head -n 1 || true)"

if [ -z "$SEO_SAMPLE_FILE" ]; then
  echo "ERRO: nenhuma página SEO de produto foi gerada em $FRONTEND_DIR/dist/produto."
  exit 1
fi

if [ -z "$SEO_SAMPLE_FLAT_FILE" ]; then
  echo "ERRO: nenhuma página SEO sem barra final foi gerada em $FRONTEND_DIR/dist/produto."
  exit 1
fi

if ! grep -q 'property="og:type" content="product"' "$SEO_SAMPLE_FILE"; then
  echo "ERRO: página SEO gerada sem Open Graph de produto: $SEO_SAMPLE_FILE"
  exit 1
fi

if ! grep -q 'property="og:type" content="product"' "$SEO_SAMPLE_FLAT_FILE"; then
  echo "ERRO: página SEO sem barra final gerada sem Open Graph de produto: $SEO_SAMPLE_FLAT_FILE"
  exit 1
fi

echo "✅ Página SEO de produto validada: $SEO_SAMPLE_FILE"
echo "✅ Página SEO sem barra final validada: $SEO_SAMPLE_FLAT_FILE"

# -----------------------------
# Reinicia backend PM2
# -----------------------------
echo "🔄 Reiniciando backend..."

EXPECTED_PM2_SCRIPT="$BACKEND_DIR/dist/server.js"

if ! pm2 describe "$PM2_APP_NAME" >/dev/null 2>&1; then
  echo "ℹ️ App PM2 '$PM2_APP_NAME' não encontrado. Criando com cwd do backend..."
  pm2 start "$EXPECTED_PM2_SCRIPT" --name "$PM2_APP_NAME" --cwd "$BACKEND_DIR" --update-env
else
  PM2_INFO="$(pm2 jlist)"
  PM2_CURRENT_CWD="$(printf '%s' "$PM2_INFO" | node -e 'const fs = require("fs"); const name = process.argv[1]; const apps = JSON.parse(fs.readFileSync(0, "utf8")); const app = apps.find((item) => item.name === name); process.stdout.write(app?.pm2_env?.pm_cwd || "");' "$PM2_APP_NAME")"
  PM2_CURRENT_SCRIPT="$(printf '%s' "$PM2_INFO" | node -e 'const fs = require("fs"); const name = process.argv[1]; const apps = JSON.parse(fs.readFileSync(0, "utf8")); const app = apps.find((item) => item.name === name); process.stdout.write(app?.pm2_env?.pm_exec_path || "");' "$PM2_APP_NAME")"

  if [ "$PM2_CURRENT_CWD" != "$BACKEND_DIR" ] || [ "$PM2_CURRENT_SCRIPT" != "$EXPECTED_PM2_SCRIPT" ]; then
    echo "⚠️ PM2 '$PM2_APP_NAME' está com cwd/script diferente do backend."
    echo "   cwd atual: ${PM2_CURRENT_CWD:-N/A}"
    echo "   script atual: ${PM2_CURRENT_SCRIPT:-N/A}"
    echo "   Recriando processo com cwd: $BACKEND_DIR"
    pm2 delete "$PM2_APP_NAME"
    pm2 start "$EXPECTED_PM2_SCRIPT" --name "$PM2_APP_NAME" --cwd "$BACKEND_DIR" --update-env
  else
    pm2 restart "$PM2_APP_NAME" --update-env
  fi
fi

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
