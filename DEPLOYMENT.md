# Deployment Guide

## Overview

The Nexus v2 monorepo uses GitHub Actions to automatically deploy:
- **Frontend** → Cloudflare Pages
- **Backend** → Cloudflare Workers

## Prerequisites

1. **GitHub Repository** - Push this code to GitHub
2. **Cloudflare Account** - Free tier is fine
3. **Cloudflare API Token** - For GitHub Actions

## Step 1: Create Cloudflare Resources

### Create Pages Project

```bash
# Via Cloudflare Dashboard:
# 1. Go to Workers & Pages
# 2. Click "Create application" → Pages
# 3. Select GitHub repository
# 4. Build settings:
#    - Framework: None
#    - Build command: pnpm build --filter @nexus/frontend
#    - Build output directory: packages/frontend/dist
```

### Create Workers Project

```bash
# Via CLI:
cd packages/backend
npx wrangler publish --name nexus-api
```

### Create D1 Database

```bash
# Create database
npx wrangler d1 create nexus

# Get the database ID from output
# Add to wrangler.toml:
# [[d1_databases]]
# binding = "DB"
# database_id = "YOUR_DB_ID"
```

### Create KV Namespace

```bash
# Create KV
npx wrangler kv:namespace create nexus

# Get the namespace ID from output
# Add to wrangler.toml:
# [[kv_namespaces]]
# binding = "KV"
# id = "YOUR_KV_ID"
```

### Create R2 Bucket

```bash
# Create bucket
npx wrangler r2 bucket create nexus-assets

# No additional config needed (automatic)
```

## Step 2: Get Cloudflare Credentials

### API Token

1. Go to https://dash.cloudflare.com/profile/api-tokens
2. Click "Create Token"
3. Select "Edit Cloudflare Workers" template
4. Click "Use this template"
5. Set permissions:
   - Account: Cloudflare Workers Scripts (Edit)
   - Account: Cloudflare Pages (Edit)
6. Copy the token (you won't see it again!)

### Account ID

1. Go to https://dash.cloudflare.com/
2. Click your account in the left sidebar
3. Copy the Account ID shown

## Step 3: Configure GitHub Actions

### Add Secrets

1. Go to your GitHub repo
2. **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add these secrets:

| Secret Name | Value |
|------------|-------|
| `CLOUDFLARE_API_TOKEN` | Your API token |
| `CLOUDFLARE_ACCOUNT_ID` | Your Account ID |

## Step 4: Configure wrangler.toml

Update `packages/backend/wrangler.toml`:

```toml
name = "nexus-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

# Your D1 database ID
[[d1_databases]]
binding = "DB"
database_id = "YOUR_DB_ID"

# Your KV namespace ID
[[kv_namespaces]]
binding = "KV"
id = "YOUR_KV_PREVIEW_ID"

# Your R2 bucket name
[[r2_buckets]]
binding = "R2"
bucket_name = "nexus-assets"

# Production subdomain
[env.production]
routes = [{ pattern = "api.nexus.example.com/*", zone_id = "YOUR_ZONE_ID" }]
```

## Step 5: Update Frontend Config

Create `packages/frontend/.env.production`:

```env
VITE_API_BASE=https://api.nexus.example.com/api
```

## Step 6: Update Environment Variables in Cloudflare

### Via Dashboard

1. Go to **Workers** → **nexus-api** → **Settings** → **Environment variables**
2. Add variables (from `.env.example`):
   - `TWITCH_CLIENT_ID`
   - `TWITCH_CLIENT_SECRET`
   - `YOUTUBE_CLIENT_ID`
   - `YOUTUBE_CLIENT_SECRET`
   - `JWT_SECRET`

### Or via wrangler

```bash
cd packages/backend

# Add secrets (encrypted)
npx wrangler secret put TWITCH_CLIENT_ID
# Paste your value

npx wrangler secret put TWITCH_CLIENT_SECRET
# Paste your value

# ... repeat for others
```

## Step 7: Deploy

### First Time

```bash
# Build everything
pnpm build

# Deploy backend
cd packages/backend
npx wrangler publish --env production

# Deploy frontend  
cd packages/frontend
npm run build
# Upload dist/ to Cloudflare Pages via dashboard
```

### Via Git Push

Once GitHub Actions is configured:

```bash
git add .
git commit -m "Initial deployment"
git push origin main
```

Workflows will automatically:
1. Run type checks
2. Build frontend
3. Deploy frontend to Pages
4. Build backend
5. Deploy backend to Workers

## Monitoring Deployments

### GitHub Actions

1. Go to **Actions** tab in GitHub
2. View **Deploy Frontend** and **Deploy Backend** workflows
3. Check logs if deployment fails

### Cloudflare Dashboard

- **Pages**: https://dash.cloudflare.com/ → Pages
- **Workers**: https://dash.cloudflare.com/ → Workers & Pages → Workers → nexus-api

## Custom Domain Setup

### Add Domain to Cloudflare

1. Go to https://dash.cloudflare.com/
2. Add your domain
3. Complete nameserver setup

### Point Routes

```toml
# wrangler.toml (production env)
[env.production]
routes = [
  { pattern = "api.nexus.example.com/*", zone_id = "YOUR_ZONE_ID" }
]

# Frontend (DNS record)
CNAME nexus.example.com → your-pages-domain.pages.dev
```

## SSL/TLS Certificate

Cloudflare automatically provides free SSL:
1. Set to **Flexible** or **Full** SSL mode
2. Done! (automatic for Pages & Workers)

## Troubleshooting Deployments

### Frontend deploy fails

```bash
# Check if dist directory exists
ls packages/frontend/dist

# Rebuild
pnpm -r build

# Rebuild frontend specifically
pnpm -r --filter @nexus/frontend build
```

### Backend deploy fails

```bash
# Check wrangler config
cat packages/backend/wrangler.toml

# Test locally first
cd packages/backend
pnpm dev

# Check secrets are set
npx wrangler secret list
```

### GitHub Actions timeout

- Increase timeout in workflow YAML
- Split large builds into separate jobs
- Check for network issues

### D1 migrations fail

```bash
# Check database connection
npx wrangler d1 list

# Run migrations manually
npx wrangler d1 execute nexus --file ./migrations/001.sql --remote
```

## CloudFlare D1 Database Access

### Via Cloudflare Dashboard

1. Go to **D1** → **nexus**
2. Click console to run SQL directly

### Via CLI

```bash
# Local development (uses .wrangler/state/d1)
pnpm dev

# Remote (production)
npx wrangler d1 execute nexus --sql "SELECT * FROM users" --remote
```

## Backups

Cloudflare automatically backs up D1 databases. To export:

```bash
# Export as JSON
npx wrangler d1 export nexus --output nexus-backup.json

# Export as SQL
npx wrangler d1 execute nexus --output nexus-backup.sql --sql "SELECT * FROM users"
```

## Scaling

**Cloudflare Pricing:**
- **Pages**: Free tier is generous (unlimited bandwidth)
- **Workers**: 100,000 free requests/day
- **D1**: $1.25 per 1GB stored
- **KV**: $0.50 per 1GB stored
- **R2**: $0.015 per GB transferred

For most streaming dashboards, free tier is sufficient!

## Next Steps

1. ✅ Create all Cloudflare resources
2. ✅ Setup GitHub secrets
3. ✅ Deploy backend (Workers)
4. ✅ Deploy frontend (Pages)
5. ✅ Test OAuth flows
6. ✅ Setup custom domain
7. ✅ Monitor in production
