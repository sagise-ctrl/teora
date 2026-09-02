# VPS Migration Guide

> How to migrate the Teora backend from Vercel Function to a VPS (Ubuntu).

This guide is a **backup plan**. The primary deployment target is Vercel Function.
Reference this only if a VPS migration is needed.

**Last updated:** 2026-08-23

---

## When to Use This Guide

- Vercel usage limits reached or cost-prohibitive at scale
- Owner requests VPS deployment
- Specific compliance or data residency requirements

---

## Prerequisites

### Server Requirements

- Ubuntu 22.04 LTS or 24.04 LTS (64-bit)
- 1+ vCPU, 1+ GB RAM (2GB recommended)
- Root or sudo access
- Domain/subdomain pointed to server IP (e.g. `api.teora.com`)

### Required Software

```bash
# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install Nginx (for reverse proxy)
sudo apt-get install -y nginx

# Install Certbot for SSL
sudo apt-get install -y certbot python3-certbot-nginx
```

---

## Environment Variables

Set these as environment variables on the VPS (via PM2 ecosystem config or systemd):

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:...@db.xxx.supabase.co:5432/postgres` |
| `DATABASE_POOLER_URL` | Pooler URL (optional, supersedes DATABASE_URL) | `postgresql://postgres.pooler.xxx.supabase.co:6543/postgres` |
| `SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `SUPABASE_JWT_SECRET` | JWT secret from Supabase | (long secret string) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key | (long secret string) |
| `AI_API_KEY` | AI provider API key | (provider-specific) |
| `NODE_ENV` | Set to `production` | `production` |
| `PORT` | HTTP port (default 8080) | `8080` |

**Note on DATABASE_POOLER_URL vs DATABASE_URL:**
- `DATABASE_URL` connects directly to the Supabase PostgreSQL server (port 5432)
- `DATABASE_POOLER_URL` connects through Supabase's PgBouncer connection pooler (port 6543)
- For Vercel Functions, use `DATABASE_POOLER_URL` (pooled connections handle serverless cold starts better)
- For VPS/PM2, either works — `DATABASE_POOLER_URL` is preferred if available for connection efficiency
- If `DATABASE_POOLER_URL` is not set in env, the app falls back to `DATABASE_URL`

---

## Deployment Steps

### 1. Create Project Directory

```bash
sudo mkdir -p /opt/teora/api
sudo chown $USER:$USER /opt/teora/api
cd /opt/teora/api
```

### 2. Clone Repository

```bash
git clone https://github.com/your-org/teora.git .
cd artifacts/api-server
```

### 3. Install Dependencies

```bash
npm ci --legacy-peer-deps
```

### 4. Create PM2 Ecosystem Config

Create `ecosystem.config.cjs` in `artifacts/api-server/`:

```javascript
// PM2 ecosystem config for Teora API Server
module.exports = {
  apps: [
    {
      name: "teora-api",
      script: "./dist/index.mjs",
      cwd: "./",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: 8080,
      },
      error_file: "/var/log/teora/api-error.log",
      out_file: "/var/log/teora/api-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
    },
  ],
};
```

### 5. Build

```bash
npm run build
```

This produces:
- `api/index.mjs` — Vercel Function handler (not needed for VPS)
- `dist/index.mjs` — Express server (used by PM2)

### 6. Set Environment Variables

Option A: Edit ecosystem.config.cjs to include env vars directly (not recommended for secrets):
```javascript
env: {
  NODE_ENV: "production",
  PORT: 8080,
  DATABASE_URL: "postgresql://...",
  // ... other vars
}
```

Option B: Use `.env` file + `pm2 start ecosystem.config.cjs --env production` with `env_production` block in ecosystem config.

Option C: Use systemd environment file (`/etc/environment` or a systemd unit file).

### 7. Create Log Directory

```bash
sudo mkdir -p /var/log/teora
sudo chown $USER:$USER /var/log/teora
```

### 8. Start with PM2

```bash
pm2 start ecosystem.config.cjs
pm2 save  # persist across reboots
pm2 startup  # setup init script (run the printed command)
```

### 9. Configure Nginx Reverse Proxy

```bash
sudo nano /etc/nginx/sites-available/teora-api
```

```nginx
server {
    listen 80;
    server_name api.teora.com;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/teora-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 10. SSL Certificate

```bash
sudo certbot --nginx -d api.teora.com
```

### 11. Health Check

```bash
curl https://api.teora.com/api/healthz
```

---

## GitHub Actions Workflow (Restore)

To re-enable automated VPS deploys via GitHub Actions, restore the following workflow at `.github/workflows/deploy-backend.yml`:

```yaml
name: Deploy Backend to VPS

on:
  push:
    branches: [main]
    paths:
      - "artifacts/api-server/**"
      - "lib/db/**"

permissions:
  contents: read

jobs:
  setup:
    name: Setup
    runs-on: ubuntu-latest
    outputs:
      has_changes: ${{ steps.filter.outputs.changed }}
    steps:
      - uses: actions/checkout@v4
      - name: Check API server changes
        id: filter
        run: |
          if git diff --name-only HEAD~1 | grep -qE "^(artifacts/api-server|lib/db)/"; then
            echo "changed=true" >> $GITHUB_OUTPUT
          else
            echo "changed=false" >> $GITHUB_OUTPUT
          fi

  deploy:
    name: Deploy to VPS
    runs-on: ubuntu-latest
    needs: setup
    if: needs.setup.outputs.has_changes == 'true'
    environment:
      name: production
      url: https://api.teora.com
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - name: Install dependencies
        run: npm ci --legacy-peer-deps

      - name: Build API server
        run: npm -w @workspace/api-server run build
        env:
          NODE_ENV: production

      - name: Upload build artifact
        uses: actions/upload-artifact@v4
        with:
          name: api-server-dist
          path: artifacts/api-server/dist
          retention-days: 1

      - name: Download build artifact
        uses: actions/download-artifact@v4
        with:
          name: api-server-dist
          path: dist

      - name: Setup SSH
        uses: webfactory/ssh-agent@v0.9.0
        with:
          ssh-private-key: ${{ secrets.VPS_SSH_KEY }}

      - name: Deploy to VPS
        run: |
          rsync -e "ssh -o StrictHostKeyChecking=no" --archive --compress \
            --delete \
            --exclude='.git*' \
            --exclude='node_modules' \
            --exclude='*.ts' \
            --exclude='*.map' \
            --exclude='src' \
            --exclude='test' \
            dist/ \
            ${{ secrets.VPS_USER }}@${{ secrets.VPS_HOST }}:/opt/teora/api/dist/

      - name: Restart API server
        run: |
          ssh -o StrictHostKeyChecking=no ${{ secrets.VPS_USER }}@${{ secrets.VPS_HOST }} \
            "cd /opt/teora/api && pm2 restart teora-api || pm2 start ecosystem.config.cjs"

      - name: Health check
        run: |
          sleep 3
          curl -sf --retry 5 --retry-delay 5 \
            --retry-connrefused \
            https://${{ secrets.VPS_HOST }}/api/healthz \
            || curl -sf --retry 5 --retry-delay 5 \
            --retry-connrefused \
            http://${{ secrets.VPS_HOST }}:8080/api/healthz
```

### Required GitHub Secrets for VPS Deploy

| Secret | Description |
|--------|-------------|
| `VPS_HOST` | VPS IP address or hostname |
| `VPS_USER` | SSH username |
| `VPS_SSH_KEY` | Private SSH key (with write access to VPS) |
| `DATABASE_URL` | PostgreSQL connection string |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_JWT_SECRET` | JWT secret |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key |
| `AI_API_KEY` | AI provider API key |

---

## Rollback to Vercel Function

To revert from VPS back to Vercel Function:

1. Restore `.github/workflows/deploy-backend.yml` removal (revert the commit that deleted it)
2. Delete ecosystem.config.cjs from api-server
3. Ensure `vercel.json` is configured with `framework: null` and `buildCommand: node ./build.mjs`
4. Push — Vercel auto-deploys as serverless function
5. Remove VPS PM2 process: `pm2 delete teora-api`

---

## PM2 Common Commands

```bash
pm2 start ecosystem.config.cjs    # start
pm2 restart teora-api            # restart
pm2 stop teora-api               # stop
pm2 delete teora-api             # remove
pm2 logs teora-api              # view logs (Ctrl+C to exit)
pm2 logs teora-api --err        # errors only
pm2 monit                        # monitor all processes
pm2 status                       # list all processes
pm2 save                         # persist process list
pm2 startup                      # auto-restart on boot (run output command as sudo)
```

---

## Monitoring

```bash
# Check if API is responding
curl -s https://api.teora.com/api/healthz | jq .

# Check PM2 status
pm2 status

# View logs
pm2 logs teora-api --lines 50 --nostream

# Check disk space
df -h

# Check memory usage
free -h

# Check Nginx status
sudo systemctl status nginx
sudo nginx -t
```

---

## Troubleshooting

### API returns 502 Bad Gateway
- PM2 process not running: `pm2 restart teora-api`
- API crashing on startup: `pm2 logs teora-api` to see error
- Check PORT env var matches Nginx proxy_pass

### SSL certificate expired
```bash
sudo certbot renew
```

### Database connection errors
- Verify DATABASE_URL / DATABASE_POOLER_URL is correct
- Check Supabase project is active
- Test connection: `psql $DATABASE_URL -c "SELECT 1"`

### PM2 process keeps restarting
- Check memory: `pm2 monit` — may need `max_memory_restart` adjustment
- Check logs: `pm2 logs teora-api --err --lines 100`

### Nginx 502 after server reboot
- Run `pm2 resurrect` or `pm2 startup` (if not already set up)
- Check Nginx is running: `sudo systemctl status nginx`
