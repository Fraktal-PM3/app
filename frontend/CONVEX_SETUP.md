# Convex Multi-Instance Setup

This setup runs 3 separate Convex backends for sender, transporter, and receiver.

## Quick Start

1. **Start Convex backends:**
   ```bash
   docker-compose up -d
   ```

2. **Generate admin keys:**
   ```bash
   ./setup-convex.sh
   ```
   
   This will execute `./generate_admin_key.sh` inside each container and output the keys.
   
   Or generate manually:
   ```bash
   docker compose exec sender-backend ./generate_admin_key.sh
   docker compose exec transporter-backend ./generate_admin_key.sh
   docker compose exec receiver-backend ./generate_admin_key.sh
   ```

3. **Configure environment:**
   Edit `.env.convex` and paste the admin keys from step 2.

4. **Deploy schema to each backend:**
   ```bash
   # For sender
   CONVEX_SELF_HOSTED_URL='http://127.0.0.1:3210' CONVEX_SELF_HOSTED_ADMIN_KEY='<sender-key>' npx convex deploy
   
   # For transporter
   CONVEX_SELF_HOSTED_URL='http://127.0.0.1:3220' CONVEX_SELF_HOSTED_ADMIN_KEY='<transporter-key>' npx convex deploy
   
   # For receiver
   CONVEX_SELF_HOSTED_URL='http://127.0.0.1:3230' CONVEX_SELF_HOSTED_ADMIN_KEY='<receiver-key>' npx convex deploy
   ```

5. **Run the applications:**
   ```bash
   # In separate terminals
   bun run sender       # Port 3001, uses Convex on 3210
   bun run transporter  # Port 3000, uses Convex on 3220
   bun run receiver     # Port 3002, uses Convex on 3230
   ```

## Accessing Dashboards

- Sender: http://localhost:6791
- Transporter: http://localhost:6792
- Receiver: http://localhost:6793

## Port Mapping

| Role        | App Port | Convex Backend | Convex Site | Dashboard |
|-------------|----------|----------------|-------------|-----------|
| Sender      | 3001     | 3210           | 3211        | 6791      |
| Transporter | 3000     | 3220           | 3221        | 6792      |
| Receiver    | 3002     | 3230           | 3231        | 6793      |

## Stopping

```bash
docker-compose down
```

To also remove data:
```bash
docker-compose down -v
```
