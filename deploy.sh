#!/bin/bash
set -e  # Para parar se algum comando falhar

echo "🚀 Iniciando deploy do Site Helo Cosméticos..."

# -----------------------------
# 1️⃣ Atualiza barepositorio
# -----------------------------
echo "📦 Atualizando respositorio..."
cd ~/helo-cosmeticos/helo-api
git pull
echo "📦 Atualizando dependencias do Backend"
yarn

echo "📦 Atualizando dependencias front"
cd ~/helo-cosmeticos/
yarn


# Garante que devDependencies estão instaladas
yarn install --frozen-lockfile --production=false

# Força PATH para binários locais
export PATH="$PWD/node_modules/.bin:$PATH"

# Build
yarn build


# -----------------------------
# 4️⃣ Reinicia backend no PM2
# -----------------------------
echo "🔄 Reiniciando backend..."
cd ~/helo-cosmeticos/helo-api
pm2 delete helo-api || true
pm2 start src/server.js --name helo-api
pm2 save

# -----------------------------
# 5️⃣ Mostra logs
# -----------------------------
echo "📄 Últimos logs do backend:"
pm2 logs helo-api --lines 50
