# Quick Start Guide

## Prerequisites

- Node.js 18+
- pnpm 8+
- Git
- Cloudflare account

## Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment

**Frontend** (`packages/frontend/.env`):
```env
VITE_API_BASE=http://localhost:8787/api
```

**Backend** (`packages/backend/.env`):
```env
TWITCH_CLIENT_ID=your_client_id
TWITCH_CLIENT_SECRET=your_secret
YOUTUBE_CLIENT_ID=your_client_id
YOUTUBE_CLIENT_SECRET=your_secret
JWT_SECRET=your_secure_secret
```

### 3. Development

```bash
# Terminal 1: Backend
cd packages/backend
pnpm dev

# Terminal 2: Frontend
cd packages/frontend
pnpm dev
```

Frontend: http://localhost:5173
Backend: http://localhost:8787

### 4. Database Setup

```bash
# Create D1 database
npx wrangler d1 create nexus

# Run migrations (once created)
# See MIGRATION.md for schema
```

### 5. Deployment

#### GitHub Setup

1. Create empty `.env` files in each package
2. Add these GitHub Secrets:

```
CLOUDFLARE_API_TOKEN=<your_token>
CLOUDFLARE_ACCOUNT_ID=<your_account_id>
```

3. Push to `main` branch

```bash
git add .
git commit -m "Initial monorepo setup"
git push origin main
```

Workflows will automatically:
- Type check
- Build frontend → Deploy to Cloudflare Pages
- Build backend → Deploy to Cloudflare Workers

## Project Structure

```
packages/
├── frontend/          # React 18 + Vite
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── hooks/       # Custom React hooks
│   │   ├── pages/       # Page components
│   │   ├── store/       # Zustand state stores
│   │   ├── lib/         # Utilities (API client, etc.)
│   │   ├── App.tsx      # Main app component
│   │   └── main.tsx     # Entry point
│   └── [config files]
│
├── backend/           # Cloudflare Workers + Hono
│   ├── src/
│   │   ├── routes/      # API endpoints
│   │   ├── middleware/  # Auth, CORS, etc.
│   │   └── index.ts     # Main app
│   └── wrangler.toml    # Cloudflare config
│
└── shared/            # Shared TypeScript types
    └── src/
        └── index.ts     # Type definitions & constants
```

## Common Tasks

### Add a new API endpoint

1. Create route file in `packages/backend/src/routes/`
2. Define types in `packages/shared/src/index.ts`
3. Call from frontend via `ApiClient`

### Create new UI component

```jsx
// packages/frontend/src/components/MyComponent.tsx
import React from 'react';

interface MyComponentProps {
  title: string;
  onClick?: () => void;
}

export const MyComponent: React.FC<MyComponentProps> = ({ title, onClick }) => {
  return <div onClick={onClick}>{title}</div>;
};
```

### Update shared types

```typescript
// packages/shared/src/index.ts
export interface MyType {
  id: string;
  name: string;
}
```

Both frontend and backend can now use this type!

## Troubleshooting

### Port already in use

```bash
# Frontend conflicts
lsof -i :5173
kill -9 <PID>

# Backend conflicts
lsof -i :8787
kill -9 <PID>
```

### Dependencies not found

```bash
# Clean install
pnpm install --force
pnpm build
```

### Type errors

```bash
# Check types across workspace
pnpm type-check
```

## Next Steps

- [ ] Read [MIGRATION.md](./MIGRATION.md) for detailed refactor guide
- [ ] Setup GitHub Actions secrets
- [ ] Configure Cloudflare D1 database
- [ ] Migrate authentication
- [ ] Migrate video player
- [ ] Build marketplace UI
- [ ] Setup WebSocket chat
