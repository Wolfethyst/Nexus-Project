# 📚 Documentation Index

Quick links to all documentation files:

## Getting Started
- **[QUICKSTART.md](./QUICKSTART.md)** - 5-minute setup guide
- **[LAUNCH_CHECKLIST.md](./LAUNCH_CHECKLIST.md)** - Step-by-step deployment checklist
- **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - Commands and code snippets

## Development
- **[MIGRATION.md](./MIGRATION.md)** - How to migrate from old vanilla JS codebase
- **[PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md)** - What's been created and why

## Deployment
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Complete deployment guide for Cloudflare
- **[GITHUB_SETUP.md](./GITHUB_SETUP.md)** - GitHub Actions configuration

## Overview
- **[README.md](./README.md)** - Project overview and architecture

---

## Where to Start

**If you're new here:**
1. Read [README.md](./README.md)
2. Follow [QUICKSTART.md](./QUICKSTART.md)
3. Set up GitHub Actions via [GITHUB_SETUP.md](./GITHUB_SETUP.md)

**If you're deploying:**
1. Use [LAUNCH_CHECKLIST.md](./LAUNCH_CHECKLIST.md)
2. Reference [DEPLOYMENT.md](./DEPLOYMENT.md) for troubleshooting

**If you're migrating code:**
1. Read [MIGRATION.md](./MIGRATION.md)
2. Use [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) for syntax

**For daily development:**
- Use [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)

---

## Project Structure at a Glance

```
packages/
├── frontend/   # React 18 + Vite + Tailwind
├── backend/    # Cloudflare Workers + Hono
└── shared/     # Shared TypeScript types
```

## Tech Stack

| Layer | Tech | Why |
|-------|------|-----|
| Frontend | React 18 + TypeScript | Modern, type-safe, reactive |
| Backend | Cloudflare Workers + Hono | Serverless, fast, global |
| Database | Cloudflare D1 (SQLite) | Integrated, no ops |
| Cache | Cloudflare KV | Sub-millisecond lookups |
| Storage | Cloudflare R2 | S3-compatible, cheap |

## Key Features Implemented

✅ Monorepo setup with pnpm workspaces
✅ React components with TypeScript
✅ Zustand state management
✅ Hono backend framework
✅ Cloudflare Workers integration
✅ GitHub Actions auto-deployment
✅ Shared types across frontend & backend
✅ Tailwind CSS styling
✅ Component patterns and examples
✅ API client and hooks

## What's Missing (TODO)

These are documented with `// TODO:` comments:

- ⏳ Database schema migrations
- ⏳ OAuth callback handlers (partial)
- ⏳ Video player implementation
- ⏳ WebSocket chat connection
- ⏳ Marketplace purchase flow
- ⏳ Admin moderation tools
- ⏳ Error tracking/logging

See [MIGRATION.md](./MIGRATION.md) for a complete TODO list.

## Quick Commands

```bash
# Install & develop
pnpm install
pnpm dev              # Run frontend + backend

# Type checking
pnpm type-check

# Build for production
pnpm build

# Deploy (via GitHub)
git push origin main  # Automatic via CI!
```

## File Locations

| What | Path |
|------|------|
| React components | `packages/frontend/src/components/` |
| State stores | `packages/frontend/src/store/` |
| React hooks | `packages/frontend/src/hooks/` |
| Backend routes | `packages/backend/src/routes/` |
| Shared types | `packages/shared/src/index.ts` |
| GitHub Workflows | `.github/workflows/` |

## Questions?

1. **How do I add a new route?** → See [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)
2. **How do I migrate old code?** → See [MIGRATION.md](./MIGRATION.md)
3. **How do I deploy?** → See [DEPLOYMENT.md](./DEPLOYMENT.md) or [LAUNCH_CHECKLIST.md](./LAUNCH_CHECKLIST.md)
4. **How do I set up GitHub Actions?** → See [GITHUB_SETUP.md](./GITHUB_SETUP.md)
5. **What should I do next?** → See [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md) "Next Steps"

---

**Last updated:** February 5, 2026
**Version:** 2.0.0
