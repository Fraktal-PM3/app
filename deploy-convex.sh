#!/bin/bash

# Load admin keys from .env.convex
if [ ! -f .env.convex ]; then
  echo "Error: .env.convex file not found!"
  echo "Please run ./setup-convex.sh first to generate admin keys."
  exit 1
fi

# Source the .env.convex file
source .env.convex

echo "Deploying Convex schema to all backends..."
echo ""

echo "=== Deploying to SENDER Backend (port 3210) ==="
CONVEX_SELF_HOSTED_URL='http://127.0.0.1:3210' \
CONVEX_SELF_HOSTED_ADMIN_KEY="$CONVEX_ADMIN_KEY_SENDER" \
npx convex deploy
echo ""

echo "=== Deploying to TRANSPORTER Backend (port 3220) ==="
CONVEX_SELF_HOSTED_URL='http://127.0.0.1:3220' \
CONVEX_SELF_HOSTED_ADMIN_KEY="$CONVEX_ADMIN_KEY_TRANSPORTER" \
npx convex deploy
echo ""

echo "=== Deploying to RECEIVER Backend (port 3230) ==="
CONVEX_SELF_HOSTED_URL='http://127.0.0.1:3230' \
CONVEX_SELF_HOSTED_ADMIN_KEY="$CONVEX_ADMIN_KEY_RECEIVER" \
npx convex deploy
echo ""

echo "✅ All deployments complete!"
