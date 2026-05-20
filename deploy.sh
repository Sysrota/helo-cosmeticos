#!/bin/bash

set -e

echo "🚀 Iniciando deploy Helo Cosméticos..."

PROJECT_DIR=~/helo-cosmeticos

BACKEND_DIR=$PROJECT_DIR/backend

FRONTEND_DIR=$PROJECT_DIR/frontend

# -----------------------------
# Atualiza projeto
# -----------------------------
echo "📦 Atualizando repositório..."

cd $PROJECT_DIR

git pull

# -----------------------------
# Backend
# -----------------------------
echo "📦 Instalando dependências backend..."

cd $BACKEND_DIR

yarn

echo "🧬 Prisma generate..."

yarn prisma generate

echo "🗄️ Prisma migrate deploy..."

yarn prisma migrate deploy

echo "🏗️ Build backend..."

yarn build

# -----------------------------
# Frontend
# -----------------------------
echo "📦 Instalando dependências frontend..."

cd $FRONTEND_DIR

yarn

echo "🏗️ Build frontend..."

yarn build

# -----------------------------
# Reinicia backend PM2
# -----------------------------
echo "🔄 Reiniciando backend..."

pm2 delete helo-backend || true

pm2 start $BACKEND_DIR/dist/server.js \
  --name helo-backend

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
