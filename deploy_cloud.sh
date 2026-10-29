#!/usr/bin/env bash
# ==============================================================================
# NEXORA ONE ENGINE // CLOUD ZERO-EFFORT DEPLOYMENT SCRIPT
# Deploys Nora ITU & Nexora Console to any VPS / Cloud host
# ==============================================================================

set -euo pipefail

echo "====================================================================="
echo "   NEXORA ONE ENGINE // NORA ITU - DEPLOYMENT AUTOMATOR"
echo "   Signature: By Nora"
echo "====================================================================="

if [ ! -f .env.production ]; then
  if [ -f .env.local ]; then
    echo "⚙️  Copiando .env.local hacia .env.production..."
    cp .env.local .env.production
  else
    echo "⚠️  No se encontró .env.production ni .env.local. Creando plantilla desde .env.production.example..."
    cp .env.production.example .env.production
    echo "❗ Por favor configura tus API Keys en .env.production antes de continuar."
    exit 1
  fi
fi

echo "📦 Levantando stack de producción con Docker Compose..."
docker compose -f docker-compose.cloud.yml --env-file .env.production up -d --build

echo "✅ Nora ITU & Nexora Console desplegados con éxito en el puerto 3005."
echo "🔗 Acceso a la consola de cabina: http://localhost:3005/nexora"

