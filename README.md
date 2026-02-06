# Nexus v2.0 - Monorepo Architecture

Complete rewrite of Nexus using **React + TypeScript** (frontend) and **Cloudflare Workers** (backend).

## Project Structure

```
packages/
├── frontend/       # React 18 + Vite + TypeScript
├── backend/        # Cloudflare Workers + Hono + TypeScript
└── shared/         # Shared types and utilities
```

## Quick Start

```bash
# Install dependencies
pnpm install

# Development
pnpm dev

# Build
pnpm build

# Deploy
git push origin main  # Auto-deploys via GitHub Actions
```

## Architecture

### Frontend
- **Framework:** React 18 with TypeScript
- **Build:** Vite
- **State:** Zustand
- **UI Components:** Shadcn/ui + custom
- **Styling:** Tailwind CSS
- **Deployed to:** Cloudflare Pages

### Backend
- **Runtime:** Cloudflare Workers
- **Framework:** Hono
- **Database:** D1 (SQL), KV (cache), R2 (assets)
- **Auth:** JWT via Twitch/YouTube OAuth
- **API Style:** REST

### Shared
- TypeScript interfaces
- API types
- Constants
- Utilities

## Deployment

- **Frontend:** GitHub Pages → Cloudflare Pages
- **Backend:** Wrangler + GitHub Actions
- Both auto-deploy on `git push`

## Migration Notes

- Modules migrated to React hooks
- Global state → Zustand stores
- DOM queries → Component props
- Inline styles → Tailwind classes

See `MIGRATION.md` for detailed mapping.
