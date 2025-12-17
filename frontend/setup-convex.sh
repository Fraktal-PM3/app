#!/bin/bash

echo "Generating admin keys for each Convex backend..."
echo ""

echo "=== SENDER Backend (port 3210) ==="
docker compose exec convex-sender ./generate_admin_key.sh
echo ""

echo "=== TRANSPORTER Backend (port 3220) ==="
docker compose exec convex-transporter ./generate_admin_key.sh
echo ""

echo "=== RECEIVER Backend (port 3230) ==="
docker compose exec convex-receiver ./generate_admin_key.sh
echo ""

echo ""
echo "==================================="
echo "Copy the admin keys above and set them as environment variables:"
echo "CONVEX_ADMIN_KEY_SENDER=<sender-key>"
echo "CONVEX_ADMIN_KEY_TRANSPORTER=<transporter-key>"
echo "CONVEX_ADMIN_KEY_RECEIVER=<receiver-key>"
echo "==================================="
