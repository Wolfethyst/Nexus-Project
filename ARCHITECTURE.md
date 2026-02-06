# System Architecture

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         BROWSER (User)                               │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                    ┌─────────────┴──────────────┐
                    │   HTTP Requests (JSON)     │
                    │                            │
                    ▼                            ▼
        ┌──────────────────────┐    ┌──────────────────────┐
        │  Cloudflare Pages    │    │  Cloudflare Workers  │
        │  (Frontend)          │    │  (Backend API)       │
        │                      │    │                      │
        │  React 18 + Vite     │    │  Hono Framework      │
        │  - Components        │    │  - Auth routes       │
        │  - Hooks             │    │  - Video routes      │
        │  - State (Zustand)   │    │  - Stream routes     │
        │  - Tailwind CSS      │    │  - Clips routes      │
        │                      │    │  - Store routes      │
        └──────────────────────┘    └──────────────────────┘
                    │                       │
                    │                       │
                    │          ┌────────────┼────────────┐
                    │          │            │            │
                    │          ▼            ▼            ▼
                    │    ┌──────────┐  ┌──────────┐  ┌──────────┐
                    │    │   D1     │  │   KV     │  │   R2     │
                    │    │(SQLite DB)  │(Cache)   │  │(Storage) │
                    │    │          │  │          │  │          │
                    │    │ - Users  │  │ Sessions │  │ Videos   │
                    │    │ - Videos │  │ Metadata │  │ Clips    │
                    │    │ - Store  │  │ Cache    │  │ Assets   │
                    │    │ - Clips  │  │          │  │ Covers   │
                    │    └──────────┘  └──────────┘  └──────────┘
                    │
                    └─ Updates via API
```

## Monorepo Structure

```
Nexus-Project-V2/
│
├── packages/
│   ├── frontend/               React App
│   │   ├── src/
│   │   │   ├── components/     Reusable UI (Header, VideoCard, etc.)
│   │   │   ├── pages/          Page-level components
│   │   │   ├── store/          Zustand stores (auth, video, market)
│   │   │   ├── hooks/          Custom React hooks
│   │   │   ├── lib/            Utilities (API client, helpers)
│   │   │   ├── App.tsx         Main component
│   │   │   └── main.tsx        Entry point
│   │   ├── vite.config.ts      Build config
│   │   └── tailwind.config.ts  Styling theme
│   │
│   ├── backend/                Hono/Workers API
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   │   ├── auth.ts     OAuth, login, logout
│   │   │   │   ├── videos.ts   Video CRUD
│   │   │   │   ├── streams.ts  VOD streams
│   │   │   │   ├── clips.ts    Clip management
│   │   │   │   └── store.ts    Marketplace
│   │   │   └── index.ts        Main Hono app
│   │   └── wrangler.toml       Cloudflare config
│   │
│   └── shared/                 Shared Types
│       └── src/index.ts        All TypeScript interfaces
│
├── .github/workflows/          CI/CD
│   ├── deploy-frontend.yml
│   ├── deploy-backend.yml
│   └── type-check.yml
│
└── [Documentation files: README.md, QUICKSTART.md, etc.]
```

## Authentication Flow

```
┌─────────┐
│ Browser │
└────┬────┘
     │ Click "Sign in"
     ▼
┌──────────────────────┐
│ Frontend shows login │
│ options:             │
│ - Twitch OAuth       │
│ - YouTube OAuth      │
└────┬─────────────────┘
     │ User clicks Twitch
     ▼
┌─────────────────────────────┐
│ Backend /auth/twitch/login  │
│ Redirects to Twitch OAuth   │
└────┬────────────────────────┘
     │ Twitch redirects back
     ▼
┌──────────────────────────┐
│ Backend validates code   │
│ Creates JWT token        │
│ Stores in session (KV)   │
└────┬─────────────────────┘
     │ Redirect to dashboard
     ▼
┌─────────────────────┐
│ Frontend stores JWT │
│ Loads user data     │
└─────────────────────┘
```

## Request/Response Cycle

```
FRONTEND                          BACKEND                      DATABASE
────────                          ────────                      ────────
│                                 │                             │
├─1. User Action─────────────────>│                             │
│   (click button)                │                             │
│                                 │                             │
│                                 ├─2. Validate Request────────>│
│                                 │    (auth, schema)           │
│                                 │                             │
│                                 ├─3. Query/Update────────────>│
│                                 │                             │
│                                 │<─4. Result back─────────────┤
│                                 │                             │
│                                 ├─5. Log to KV ─────────────>│
│                                 │    (cache)                  │
│                                 │                             │
│<─6. JSON Response────────────────┤                             │
│    { ok: true, data: ... }       │                             │
│                                 │                             │
├─7. Update Store────────────────>│                             │
│    (Zustand)                    │                             │
│                                 │                             │
├─8. Re-render Components─────────┤                             │
│                                 │                             │
└─9. Show to user─────────────────┤                             │
```

## State Management Flow

```
React Component
    │
    ├─ Renders UI
    ├─ Calls hook (useAuth)
    │   │
    │   └─ Reads from Zustand store
    │       │
    │       ├─ useAuthStore
    │       │   └─ { session, setSession, logout }
    │       │
    │       ├─ useVideoStore
    │       │   └─ { vods, clips, setCurrentVideo }
    │       │
    │       └─ useMarketStore
    │           └─ { items, inventory, setSortBy }
    │
    ├─ User interacts (click, type)
    │   │
    │   └─ Calls store action
    │       │
    │       ├─ Calls ApiClient
    │       │   │
    │       │   └─ Sends HTTP request to backend
    │       │       │
    │       │       └─ Backend processes & queries DB
    │       │           │
    │       │           └─ Returns JSON response
    │       │
    │       ├─ Updates store with response
    │       │
    │       └─ Component re-renders
    │
    └─ UI updates instantly
```

## Deployment Pipeline

```
Developer
    │
    └─ git push origin main
         │
         ▼
GitHub Repository
    │
    ├─ Triggers workflows
    │   ├─ type-check.yml
    │   ├─ deploy-frontend.yml
    │   └─ deploy-backend.yml
    │
    ├─1. Type Check
    │   │
    │   └─ pnpm type-check
    │       ├─ ✓ OK → Continue
    │       └─ ✗ Fail → Stop pipeline
    │
    ├─2. Build Frontend
    │   │
    │   └─ vite build
    │       └─ Creates dist/ folder
    │
    ├─3. Deploy Frontend
    │   │
    │   └─ Upload to Cloudflare Pages
    │       └─ Available at: nexus.pages.dev
    │
    ├─4. Build Backend
    │   │
    │   └─ tsc & wrangler build
    │       └─ Compiles TypeScript
    │
    ├─5. Deploy Backend
    │   │
    │   └─ wrangler publish
    │       └─ Available at: nexus-api.workers.dev
    │
    └─ Done! Live in ~1 minute
```

## Database Schema Relationships

```
┌──────────────────┐
│     USERS        │
├──────────────────┤
│ id (PK)          │
│ username         │
│ email            │
│ avatar_url       │
│ created_at       │
└────┬──────┬──────┘
     │      │
     │      └─────────────────┐
     │                        │
     ▼                         ▼
┌──────────────────┐   ┌─────────────────┐
│   INVENTORY      │   │  STORE_ITEMS    │
├──────────────────┤   ├─────────────────┤
│ id (PK)          │   │ id (PK)         │
│ user_id (FK)     │   │ name            │
│ item_id (FK)────────│ price           │
│ quantity         │   │ category        │
│ expires_at       │   │ created_at      │
└──────────────────┘   └─────────────────┘

                     ┌──────────────────┐
                     │     VIDEOS       │
                     ├──────────────────┤
                     │ id (PK)          │
                     │ title            │
                     │ url              │
                     │ thumbnail        │
                     │ duration         │
                     │ created_at       │
                     └──────────────────┘

                     ┌──────────────────┐
                     │      CLIPS       │
                     ├──────────────────┤
                     │ id (PK)          │
                     │ game             │
                     │ url              │
                     │ thumbnail        │
                     │ created_at       │
                     └──────────────────┘
```

## Scaling Tiers

```
FREE TIER (Good for launch)
├─ Cloudflare Pages: ∞ bandwidth
├─ Workers: 100k requests/day
├─ D1: 25MB + $0.75/month
├─ KV: 100k ops/day
└─ R2: 10GB + 1GB egress

PRO TIER (Scale when needed)
├─ Cloudflare Pages: $20/mo + overages
├─ Workers: $0.50 per 1M requests
├─ D1: $0.90/GB stored
├─ KV: $0.50/M operations
└─ R2: $0.015/GB egress

ESTIMATE FOR 10k USERS
├─ Frontend bandwidth: Free
├─ Worker requests: ~500k/month = $0.25
├─ Database storage: ~1GB = $0.90
├─ KV cache: ~10M ops = $5
├─ R2 storage: ~100GB = $1.50
└─ TOTAL: ~$7.65/month
```

## Error Handling Flow

```
User Action
    │
    ▼
Try to validate input
    │
    ├─ Invalid? ───────────────────┐
    │                              │
    ▼                              ▼
Call API          Show error to user
    │              (user-friendly message)
    ├─ Network error? ─────────────────┐
    │                                  │
    ├─ Timeout? ───────────────────────┤
    │                                  ▼
    ├─ 401 Unauthorized? ──────────┐ Log error
    │   └─ Redirect to login       │ Offer retry
    │                              │
    ├─ 403 Forbidden? ─────────────┤
    │   └─ Show permission error   │
    │                              │
    ├─ 404 Not Found? ─────────────┤
    │   └─ Resource deleted?       │
    │                              │
    ├─ 5xx Server Error? ──────────┤
    │   └─ Show "try again"        │
    │                              │
    ▼                              │
Success!                           │
Update state                       │
Re-render UI                       │
                                   │
                    Got here anyway? ────────┐
                                            │
                                    Retry or home page
```

## Module to Component Migration Map

```
OLD (app.js)                    NEW (src/pages/)
────────────────────────────────────────────────
app.js                     →    App.tsx
  ├─ Global listeners      →    Event handlers in components
  └─ DOM manipulation      →    useState + JSX

modules/
├─ auth.js                 →    useAuth() + useAuthStore()
├─ config.js               →    lib/api.ts (ApiClient)
├─ video.js                →    useVideoStore() + VideoCard component
├─ store.js                →    useMarketStore() + MarketTab component
├─ chat.js                 →    useChatStore() + ChatPanel component
└─ admin.js                →    useIsModOrOwner() + Admin components

styles.css                 →    globals.css + Tailwind classes
index.html                 →    index.html (same, minus scripts)
```

---

## Key Differences: Old vs New

| Aspect | Old (v1) | New (v2) |
|--------|----------|---------|
| **Language** | Vanilla JS | React + TypeScript |
| **Build** | Manual files | Vite |
| **Styling** | Inline CSS | Tailwind CSS |
| **State** | Global objects | Zustand stores |
| **Events** | onclick attributes | Event handlers |
| **DOM** | Direct queries | Component props |
| **Deployment** | Manual wrangler | GitHub Actions |
| **Type Safety** | None | Full TypeScript |
| **Components** | None | Modular React |
| **Testing** | Difficult | Easy (pure functions) |
| **Performance** | Manual | React optimizations |
| **Database** | Java backend | D1 SQL |

---

**This architecture is designed to:**
✅ Scale from 0 to 100k users on Cloudflare's free tier
✅ Maintain code quality with TypeScript
✅ Enable fast iteration with hot reload
✅ Deploy instantly with GitHub Actions
✅ Keep costs minimal (or free!)
