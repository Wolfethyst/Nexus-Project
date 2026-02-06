# Deployment Setup for nexus.wolfethyst.tv

## Already Configured

✅ Backend API: `nexus.wolfethyst.tv/api/*` → Cloudflare Workers
✅ Frontend: `nexus.wolfethyst.tv` → Cloudflare Pages  
✅ Account ID: 81845f9b6a8496a989cbe0ba6a78ddc7
✅ Zone ID: 81845f9b6a8496a989cbe0ba6a78ddc7

## Pre-Deployment Checklist

- [ ] GitHub repository created and secrets added:
  - `CLOUDFLARE_API_TOKEN`
  - `CLOUDFLARE_ACCOUNT_ID`
  - `CLOUDFLARE_ZONE_ID`

- [ ] Backend environment variables set in Cloudflare Workers:
  - `TWITCH_CLIENT_ID`
  - `TWITCH_CLIENT_SECRET`
  - `YOUTUBE_CLIENT_ID`
  - `YOUTUBE_CLIENT_SECRET`
  - `JWT_SECRET`

- [ ] Cloudflare Pages connected to GitHub repo
  - Build command: `pnpm build --filter @nexus/frontend`
  - Output directory: `packages/frontend/dist`
  - Custom domain: `nexus.wolfethyst.tv`

## Deployment Steps

### 1. Set GitHub Secrets

Go to: https://github.com/YOUR_USERNAME/nexus-v2/settings/secrets/actions

Add these secrets:
```
CLOUDFLARE_API_TOKEN=<your-token>
CLOUDFLARE_ACCOUNT_ID=81845f9b6a8496a989cbe0ba6a78ddc7
CLOUDFLARE_ZONE_ID=81845f9b6a8496a989cbe0ba6a78ddc7
```

### 2. Set Cloudflare Worker Secrets

```bash
cd packages/backend
npx wrangler secret put TWITCH_CLIENT_ID
npx wrangler secret put TWITCH_CLIENT_SECRET
npx wrangler secret put YOUTUBE_CLIENT_ID
npx wrangler secret put YOUTUBE_CLIENT_SECRET
npx wrangler secret put JWT_SECRET
```

### 3. Configure Cloudflare Pages

1. Go to https://dash.cloudflare.com/pages
2. Connect GitHub repository
3. Build settings:
   - **Framework**: None
   - **Build command**: `pnpm build --filter @nexus/frontend`
   - **Output directory**: `packages/frontend/dist`
4. Add custom domain: `nexus.wolfethyst.tv`

### 4. Deploy

```bash
cd "c:\Users\Gamet\Documents\Nexus Project\Nexus-Project-V2"
git init
git remote add origin https://github.com/YOUR_USERNAME/nexus-v2.git
git add .
git commit -m "chore: nexus v2 monorepo - react frontend + cloudflare workers backend"
git push -u origin main
```

### 5. Monitor

- GitHub Actions: https://github.com/YOUR_USERNAME/nexus-v2/actions
- Cloudflare Pages: https://dash.cloudflare.com/pages
- Cloudflare Workers: https://dash.cloudflare.com/workers-and-pages

## DNS Records Needed

Make sure these are in Cloudflare DNS:

```
Type | Name | Content | Proxy
─────┼──────┼─────────┼──────
CNAME| nexus| nexus.pages.dev | Proxied
```

(Pages should auto-create this when you add the custom domain)

## Result

Once deployed:
- Frontend: https://nexus.wolfethyst.tv
- Backend API: https://nexus.wolfethyst.tv/api
- Auto-deploys on: `git push origin main`
