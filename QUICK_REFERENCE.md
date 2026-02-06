# 📋 Quick Reference Card

## Commands

```bash
# Install all packages
pnpm install

# Development
pnpm dev                          # Run all in parallel
pnpm -r --filter @nexus/frontend dev
pnpm -r --filter @nexus/backend dev

# Build
pnpm build                        # Build all
pnpm -r --filter @nexus/frontend build

# Type checking
pnpm type-check

# Deploy
git push origin main              # GitHub Actions does it all!
```

## Add Package

```bash
cd packages/frontend
pnpm add react-router-dom

# Specify shared type
pnpm add -D --workspace @nexus/shared
```

## Import from Shared Types

```typescript
// Frontend or Backend
import type { User, Video, ApiResponse } from '@nexus/shared';
```

## Create New Component

```bash
# packages/frontend/src/components/MyComponent.tsx
export const MyComponent: React.FC = () => {
  return <div>Hello</div>;
};

// Export from index
// packages/frontend/src/components/index.ts
export { MyComponent } from './MyComponent';

// Use it
import { MyComponent } from '@/components';
```

## Create New Store

```typescript
// packages/frontend/src/store/useCustomStore.ts
import { create } from 'zustand';

interface CustomStore {
  value: string;
  setValue: (v: string) => void;
}

export const useCustomStore = create<CustomStore>(set => ({
  value: '',
  setValue: (v) => set({ value: v }),
}));

// Export from index.ts
export { useCustomStore } from './useCustomStore';

// Use it
import { useCustomStore } from '@/store';
const { value, setValue } = useCustomStore();
```

## Create New API Endpoint

```typescript
// packages/backend/src/routes/example.ts
import { Hono } from 'hono';
import type { Env } from '../index';

const router = new Hono<{ Bindings: Env }>();

router.get('/', (c) => {
  return c.json({ ok: true, data: [] });
});

export default router;

// Add to index.ts
app.route('/example', exampleRouter);

// Call from frontend
const response = await ApiClient.get<any>('/example');
```

## Add Type to Shared

```typescript
// packages/shared/src/index.ts
export interface MyType {
  id: string;
  name: string;
}

// Available in frontend AND backend
import type { MyType } from '@nexus/shared';
```

## Environment Variables

```bash
# Frontend
# packages/frontend/.env
VITE_API_BASE=http://localhost:8787/api

# Backend
# packages/backend/.env (local only)
TWITCH_CLIENT_ID=your_id
JWT_SECRET=your_secret

# Production (GitHub Secrets)
# Add to repo: Settings → Secrets → Actions
CLOUDFLARE_API_TOKEN=...
CLOUDFLARE_ACCOUNT_ID=...
```

## Database Access

```typescript
// In backend route
router.get('/example', async (c) => {
  const db = c.env.DB;
  
  // Query
  const result = await db
    .prepare('SELECT * FROM users')
    .all();
  
  return c.json(result);
});
```

## KV Cache

```typescript
// In backend route
router.get('/cached', async (c) => {
  const kv = c.env.KV;
  
  // Get
  const cached = await kv.get('key');
  
  // Set (1 hour)
  await kv.put('key', 'value', { expirationTtl: 3600 });
  
  return c.json({ cached });
});
```

## R2 Storage

```typescript
// In backend route
router.post('/upload', async (c) => {
  const r2 = c.env.R2;
  const file = await c.req.parseFormData();
  
  // Upload
  await r2.put('path/to/file.txt', file);
  
  return c.json({ ok: true });
});
```

## Add Middleware

```typescript
// packages/backend/src/middleware/auth.ts
import { Hono } from 'hono';

export function createAuthMiddleware() {
  return async (c, next) => {
    const token = c.req.header('Authorization');
    if (!token) return c.json({ error: 'Unauthorized' }, 401);
    await next();
  };
}

// Use in route
router.use('/admin/*', createAuthMiddleware());
```

## GitHub Actions Secrets

**Add via GitHub Settings:**

```bash
CLOUDFLARE_API_TOKEN=<your_token>
CLOUDFLARE_ACCOUNT_ID=<your_account_id>
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `Module not found` | Run `pnpm install` |
| Type errors | Run `pnpm type-check` |
| Port in use | `lsof -i :5173` then `kill -9 <PID>` |
| Build fails | Delete `dist/`, run `pnpm build` |
| GitHub deploy fails | Check Workflow tab, add secrets |

## Useful URLs

- Frontend dev: http://localhost:5173
- Backend dev: http://localhost:8787
- Cloudflare Dashboard: https://dash.cloudflare.com
- GitHub: https://github.com
- Hono Docs: https://hono.dev/
- React Docs: https://react.dev/
- Tailwind: https://tailwindcss.com/

## Migrations

See [MIGRATION.md](./MIGRATION.md) for detailed steps on migrating from old Vanilla JS codebase.

```javascript
// OLD (Vanilla JS)
import * as Video from './modules/video.js';
window.playVideo = Video.playVideo;
onclick="playVideo(id, type)"

// NEW (React)
import { useVideoStore } from '@/store';
const { setCurrentVideo } = useVideoStore();
<button onClick={() => setCurrentVideo(video)}>Play</button>
```

## Pro Tips

1. **Use TypeScript everywhere** - catches bugs at compile time
2. **Keep stores small** - one responsibility per store
3. **Memoize components** - use `React.memo()` for expensive renders
4. **Cache API calls** - use Zustand or React Query
5. **Test locally first** - run dev servers before pushing
6. **Read error messages** - GitHub Actions shows exact failures

## File Locations

| What | Where |
|------|-------|
| React components | `packages/frontend/src/components/` |
| Pages | `packages/frontend/src/pages/` |
| State stores | `packages/frontend/src/store/` |
| API helpers | `packages/frontend/src/lib/` |
| Hooks | `packages/frontend/src/hooks/` |
| Backend routes | `packages/backend/src/routes/` |
| Shared types | `packages/shared/src/` |
| Workflows | `.github/workflows/` |

**Happy coding!** 🚀
