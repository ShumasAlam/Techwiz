#!/usr/bin/env bash
set -e

# -------------------------------------------------
# Install / build Frontend
# -------------------------------------------------
echo "Installing Frontend dependencies..."
cd Frontend
npm ci
npm run build

# -------------------------------------------------
# Install / start Backend
# -------------------------------------------------
echo "Installing Backend dependencies..."
cd ../Backend
npm ci

# -------------------------------------------------
# Copy built frontend assets so Backend can serve them
# -------------------------------------------------
mkdir -p public
cp -R ../Frontend/dist/* ./public/

# -------------------------------------------------
# Launch the API server
# -------------------------------------------------
echo "Starting Backend server..."
node server.js
