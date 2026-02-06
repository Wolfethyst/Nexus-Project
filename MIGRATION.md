# Migration Guide: Vanilla → React v2

## Module to Hook Mapping

### Auth Module → `useAuth()` Hook

**Before:**
```javascript
import * as Auth from './modules/auth.js';
// Used directly: Auth.loadAuth(), Auth.setTheme(), etc.
```

**After:**
```typescript
import { useAuth, useIsModOrOwner } from '@/hooks';

const { session, isInitialized } = useAuth();
const { isOwner, isMod, isModOrOwner } = useIsModOrOwner();
```

### Config Module → `ApiClient` Class

**Before:**
```javascript
const { res, data } = await Config.apiPost('/stream/title', { title, game });
```

**After:**
```typescript
import { ApiClient } from '@/lib/api';

const response = await ApiClient.post<StreamTitle>('/stream/title', { title, game });
if (response.ok && response.data) {
  // Use response.data
}
```

### Store Module → `useMarketStore()` + `useVideoStore()`

**Before:**
```javascript
Store.loadStore();
Store.switchMarketTab('store');
window.renderStore();
```

**After:**
```typescript
import { useMarketStore } from '@/store';

const { items, inventory, setSortBy } = useMarketStore();

// In component:
<MarketTab items={items} onSort={setSortBy} />
```

### Video Module → `useVideoStore()` + `useVideoData()` Hook

**Before:**
```javascript
Video.loadVideoData();
Video.playVideo(item, type);
Video.toggleMainView('video');
```

**After:**
```typescript
import { useVideoData, useVideoStore } from '@/hooks';
import { VideoPlayer } from '@/components';

// In component:
useVideoData(); // Loads data on mount
const { setCurrentVideo } = useVideoStore();

<VideoPlayer video={currentVideo} onPlay={setCurrentVideo} />
```

### Chat Module → `useChatStore()` (TODO)

**Before:**
```javascript
Chat.connectDashboardChatWS();
Chat.playSound(path);
```

**After:**
```typescript
import { useChatStore } from '@/store';

const { connect, playSound } = useChatStore();
useEffect(() => connect(), []);
```

## Global Functions to Event Handlers

**Before:**
```html
<button onclick="toggleMainView('live')">Live</button>
<button onclick="playVideo(id, 'vod')">Play</button>
```

**After:**
```tsx
import { useVideoStore } from '@/store';

export const NavigationBar: React.FC = () => {
  const { setCurrentVideo } = useVideoStore();
  
  return (
    <>
      <button onClick={() => setMode('live')}>Live</button>
      <button onClick={() => setCurrentVideo(video)}>Play</button>
    </>
  );
};
```

## DOM Manipulation to Component Props

**Before:**
```javascript
document.getElementById('meta-title').textContent = item.title;
document.getElementById('meta-date').textContent = date;
```

**After:**
```tsx
interface VideoMetaProps {
  title: string;
  date: string;
}

export const VideoMeta: React.FC<VideoMetaProps> = ({ title, date }) => (
  <>
    <h2 id="meta-title">{title}</h2>
    <p id="meta-date">{date}</p>
  </>
);
```

## Inline Styles to Tailwind Classes

**Before:**
```javascript
element.style.display = 'flex';
element.style.gap = '8px';
element.style.background = 'rgba(255, 0, 0, 0.2)';
```

**After:**
```tsx
<div className="flex gap-2 bg-red-500/20">
  {/* content */}
</div>
```

## Modal Management

**Before:**
```javascript
document.getElementById('settingsModal').classList.add('open');
document.getElementById('settingsModal').classList.remove('open');
```

**After:**
```tsx
const [isOpen, setIsOpen] = useState(false);

<Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
  {/* content */}
</Modal>
```

## TODO Items in Code

Search for `// TODO:` throughout the codebase to find:

1. **Database Initialization** - Need to implement D1 schema migrations
2. **Authentication** - JWT token generation and validation
3. **OAuth Callbacks** - Twitch/YouTube OAuth handlers
4. **Real Chat** - WebSocket connection in `useChatStore`
5. **Video Providers** - Hono routes for video playback

## Database Schema (D1)

Create these tables:

```sql
-- Users
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT,
  avatar_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Videos/VODs
CREATE TABLE videos (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  thumbnail TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  duration INTEGER
);

-- Store Items
CREATE TABLE store_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  category TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User Inventory
CREATE TABLE inventory (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  expires_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (item_id) REFERENCES store_items(id)
);
```

## Next Steps

1. ✅ Project structure created
2. ⏳ Migrate authentication flows
3. ⏳ Implement video playback
4. ⏳ Build marketplace UI
5. ⏳ Setup WebSocket chat
6. ⏳ Configure database tables
7. ⏳ Deploy to Cloudflare
