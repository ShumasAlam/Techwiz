#!/usr/bin/env bash
set -e

# -------------------------------------------------
# Install / build Frontend
# -------------------------------------------------
echo "🚧 Installing Frontend dependencies..."
cd Frontend
npm ci          # clean install (no package-lock changes)
npm run build   # creates ./dist (static assets)

# -------------------------------------------------
# Install / start Backend
# -------------------------------------------------
echo "🚧 Installing Backend dependencies..."
cd ../Backend
npm ci

# -------------------------------------------------
# Optionally copy built frontend assets so Backend can serve them
# -------------------------------------------------
# Adjust the destination folder if your Backend serves static files elsewhere.
mkdir -p uploads/public
cp -R ../../Frontend/dist/* ./uploads/public/

# -------------------------------------------------
# Launch the API server
# -------------------------------------------------
echo "🚀 Starting Backend server..."
node server.js
