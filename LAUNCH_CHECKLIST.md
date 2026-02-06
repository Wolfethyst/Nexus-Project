# 🚀 Launch Checklist

Complete this checklist to go from development to production!

## Phase 1: Local Setup

- [ ] Clone repo locally
- [ ] Run `pnpm install`
- [ ] Run `pnpm dev` (both frontend and backend)
- [ ] Verify frontend loads at http://localhost:5173
- [ ] Verify backend is running at http://localhost:8787
- [ ] Run `pnpm type-check` - should have 0 errors
- [ ] Read [QUICKSTART.md](./QUICKSTART.md)

## Phase 2: Cloudflare Setup

### Account & Authentication
- [ ] Create/login to Cloudflare account
- [ ] Go to https://dash.cloudflare.com
- [ ] Note your Account ID (shown in dashboard)
- [ ] Create API Token at https://dash.cloudflare.com/profile/api-tokens
  - Use "Edit Cloudflare Workers" template
  - Set permissions for Workers and Pages
  - Copy token (you won't see it again!)
- [ ] Store both safely (you'll need them)

### Create D1 Database
- [ ] Run: `cd packages/backend && npx wrangler d1 create nexus`
- [ ] Note the Database ID from output
- [ ] Update `packages/backend/wrangler.toml`:
  ```toml
  [[d1_databases]]
  binding = "DB"
  database_id = "YOUR_ID"
  ```

### Create KV Namespace
- [ ] Run: `npx wrangler kv:namespace create nexus`
- [ ] Note the Namespace ID
- [ ] Update `packages/backend/wrangler.toml`:
  ```toml
  [[kv_namespaces]]
  binding = "KV"
  id = "YOUR_ID"
  ```

### Create R2 Bucket
- [ ] Run: `npx wrangler r2 bucket create nexus-assets`
- [ ] No additional config needed

### Create Pages Project
- [ ] Go to https://dash.cloudflare.com/workers-and-pages
- [ ] Connect your GitHub repo
- [ ] Select "Pages"
- [ ] Build settings:
  - Framework: None
  - Build command: `pnpm build --filter @nexus/frontend`
  - Build output: `packages/frontend/dist`

### Create Workers Project
- [ ] Go to https://dash.cloudflare.com/workers-and-pages/create/workers
- [ ] Create new service: `nexus-api`
- [ ] Copy the subdomain (e.g., `nexus-api.your-account.workers.dev`)

## Phase 3: GitHub Setup

### Create Repository
- [ ] Create new GitHub repo (e.g., `nexus-v2`)
- [ ] Push this code: 
  ```bash
  git init
  git add .
  git commit -m "Initial monorepo setup"
  git remote add origin https://github.com/YOUR/nexus-v2.git
  git push origin main
  ```

### Add Secrets
- [ ] Go to repo → Settings → Secrets and variables → Actions
- [ ] Create `CLOUDFLARE_API_TOKEN`:
  - Value: Your API token from earlier
- [ ] Create `CLOUDFLARE_ACCOUNT_ID`:
  - Value: Your Account ID from earlier
- [ ] Verify both are added (Settings shows them with checkmark)

## Phase 4: Configure Backend

### Update wrangler.toml
- [ ] Set `name = "nexus-api"` at top
- [ ] Fill in `database_id` from D1 creation
- [ ] Fill in `id` from KV creation
- [ ] Update `[env.production]` section with your zone ID (if using custom domain)
- [ ] Commit: `git add packages/backend/wrangler.toml && git commit -m "config: update wrangler.toml"`

### Set Environment Variables
- [ ] Create `.env.local` in `packages/backend/` (don't commit):
  ```
  TWITCH_CLIENT_ID=your_id
  TWITCH_CLIENT_SECRET=your_secret
  YOUTUBE_CLIENT_ID=your_id
  YOUTUBE_CLIENT_SECRET=your_secret
  JWT_SECRET=your_long_random_secret
  ```
- [ ] Add these as Cloudflare secrets:
  ```bash
  cd packages/backend
  npx wrangler secret put TWITCH_CLIENT_ID
  npx wrangler secret put TWITCH_CLIENT_SECRET
  npx wrangler secret put YOUTUBE_CLIENT_ID
  npx wrangler secret put YOUTUBE_CLIENT_SECRET
  npx wrangler secret put JWT_SECRET
  ```

### Update Database Schema
- [ ] Create migration files (see DEPLOYMENT.md)
- [ ] Run migrations or create tables via dashboard
- [ ] Test with sample data

## Phase 5: Configure Frontend

### Update .env
- [ ] Copy `.env.example` to `.env.local`
- [ ] Set `VITE_API_BASE=http://localhost:8787/api` (for local dev)
- [ ] Create `.env.production`:
  ```
  VITE_API_BASE=https://nexus-api.your-account.workers.dev/api
  ```

### Verify Build
- [ ] Run: `pnpm -r --filter @nexus/frontend build`
- [ ] Check that `packages/frontend/dist/` exists
- [ ] Files should be optimized (index.*.js, etc.)

## Phase 6: First Deployment

### Test Locally First
- [ ] Delete `.wrangler/` directory
- [ ] Run: `cd packages/backend && pnpm dev`
- [ ] Test backend routes manually
- [ ] Run: `cd packages/frontend && pnpm dev`
- [ ] Test frontend loads, can call backend

### Deploy Backend Manually
- [ ] Run: `cd packages/backend && npx wrangler publish`
- [ ] Check Cloudflare dashboard → Workers
- [ ] Verify worker is deployed
- [ ] Test endpoint from browser

### Deploy Frontend Manually
- [ ] Build: `pnpm -r --filter @nexus/frontend build`
- [ ] Upload `dist/` to Cloudflare Pages via dashboard
- [ ] Test frontend is live

## Phase 7: GitHub Actions

### First Push
- [ ] Run: `git push origin main`
- [ ] Go to repo → Actions
- [ ] Watch workflows run (Type Check, Build, Deploy)
- [ ] Check that workflows complete successfully
- [ ] Verify GitHub Actions shows green checkmark

### Monitor Deployments
- [ ] Actions → Deploy Frontend → See logs
- [ ] Actions → Deploy Backend → See logs
- [ ] Cloudflare Dashboard → Check deployed versions

## Phase 8: Testing

### Test Authentication
- [ ] Click "Sign in"
- [ ] Test Twitch OAuth flow
- [ ] Verify user data loads
- [ ] Test logout
- [ ] Clear cookies and repeat with YouTube

### Test API
- [ ] Verify API calls work from frontend
- [ ] Check network tab in browser DevTools
- [ ] Verify CORS headers are correct
- [ ] Test 404 endpoint (should show error)

### Test Database
- [ ] Insert test data via wrangler CLI
- [ ] Query from frontend (if public endpoint)
- [ ] Verify data appears correctly

### Test Cache
- [ ] Make API call
- [ ] Check KV namespace in dashboard
- [ ] Verify cached data exists

## Phase 9: Custom Domain (Optional)

### Add Domain to Cloudflare
- [ ] Go to https://dash.cloudflare.com
- [ ] Add your domain
- [ ] Complete nameserver setup

### Point Routes
- [ ] Update `wrangler.toml` with zone ID
- [ ] Add CNAME for Pages: `nexus.yourdomain.com → your-pages-domain.pages.dev`
- [ ] Update production `.env` files with custom URLs
- [ ] Deploy

### SSL Certificate
- [ ] Cloudflare provides automatic SSL (no action needed)
- [ ] Visit https://nexus.yourdomain.com
- [ ] Verify certificate is valid (lock icon in browser)

## Phase 10: Monitoring

- [ ] Set up Cloudflare Analytics
- [ ] Enable Workers analytics
- [ ] Setup error tracking (Sentry?)
- [ ] Monitor D1 database usage
- [ ] Check KV hit rates

## Phase 11: Production Hardening

- [ ] Review [SECURITY.md](./SECURITY.md) (create if needed)
- [ ] Enable rate limiting on Workers
- [ ] Setup DDoS protection
- [ ] Test error handling on invalid input
- [ ] Review secrets are not in logs
- [ ] Verify API errors don't leak sensitive info

## Phase 12: Go Live! 🎉

- [ ] Announce new version
- [ ] Monitor error logs for first week
- [ ] Collect user feedback
- [ ] Fix critical bugs immediately
- [ ] Plan Phase 2 improvements

---

## Troubleshooting This Checklist

| Problem | Solution |
|---------|----------|
| Can't create D1 | Make sure you're logged in to wrangler: `npx wrangler login` |
| Secrets not working | Verify via: `npx wrangler secret list` |
| GitHub Actions failing | Check Actions tab → Logs for error details |
| Frontend doesn't load | Check browser console for errors |
| API calls failing | Verify CORS headers and API URL in .env |
| Database migrations fail | Run manually via dashboard or CLI |

## Next Resources

- [QUICKSTART.md](./QUICKSTART.md) - Development setup
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Detailed deployment guide
- [MIGRATION.md](./MIGRATION.md) - Code migration mapping
- [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - Common commands

---

**Estimated time to completion:** 2-3 hours

**Need help?** Check the relevant documentation file or GitHub Issues!
