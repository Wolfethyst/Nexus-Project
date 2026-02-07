# Phase 2: Points System, Store, and Chat Implementation

## Overview
Phase 2 adds the core economy features to Nexus Project, including point rewards, store system, and real-time chat. YouTube OAuth has been skipped due to privacy concerns with Google's API.

## Backend Implementation

### 1. Points System (`packages/backend/src/routes/points.ts`)
**Endpoints:**
- `GET /points/leaderboard?limit=50&offset=0` - Get top users ranked by points
- `GET /points/user/:userId` - Get specific user's profile and rank
- `GET /points/me` - Get current user's profile (requires auth)
- `GET /points/events?limit=50&offset=0` - Get current user's point history

**Features:**
- Automatic leaderboard ranking using database ROW_NUMBER()
- User point event history with reason and source tracking
- Support for pagination with offset/limit

### 2. Store System (`packages/backend/src/routes/store.ts`)
**Endpoints:**
- `GET /store/list` - Browse all available store items
- `POST /store/save` - Create/update store items (owner only)
- `POST /store/purchase` - Buy items and deduct points (includes validation)
- `POST /store/equip` - Equip owned items in inventory
- `GET /store/inventory` - Get user's owned items
- `GET /store/redeems` - List available redeems
- `POST /store/redeems/redeem` - Redeem an item for points

**Features:**
- Point cost validation before purchase
- Inventory tracking with acquisition timestamps
- Item equipping system for decorations
- Separate redeem system for channel points

### 3. Chat System (`packages/backend/src/routes/chat.ts`)
**Endpoints:**
- `POST /chat/send` - Send chat message
- `GET /chat/history?limit=50` - Fetch chat message history
- `POST /chat/clear` - Clear chat (admin only)
- `GET /chat/stream` - Server-Sent Events for real-time chat

**Features:**
- Automatic point rewards for chat messages (15 points Twitch/YouTube, 25 points Nexus)
- Multi-platform message support (Twitch, YouTube, Nexus)
- Message history with pagination
- SSE for real-time chat without WebSocket
- Auto-logging of point events for messages

### 4. Integration Updates
**index.ts Changes:**
- Added routes: `/points`, `/store`, `/chat`
- Updated CORS to allow credentials for cross-subdomain requests
- Removed unused router imports and consolidated routing

## Frontend Implementation

### 1. Store Hooks (`packages/frontend/src/hooks/useStore.ts`)
**Hooks:**
- `useStore()` - Fetch and manage store items
- `useInventory()` - Manage user inventory and equipped items
- `useRedeems()` - Fetch and manage redemption options

**Features:**
- Automatic item fetching on hook mount
- Error handling for API failures
- Purchase with error messages
- Inventory refresh after equipping

### 2. Points Hooks (`packages/frontend/src/hooks/usePoints.ts`)
**Hooks:**
- `useLeaderboard(limit)` - Fetch top users with pagination
- `useUserProfile(userId)` - Get specific user's profile
- `useMyProfile()` - Get current user's profile
- `usePointEvents(limit)` - Fetch point history

**Features:**
- Real-time point updates
- User ranking display
- Event history with pagination
- Error boundaries and loading states

### 3. Components

#### Leaderboard.tsx (Updated)
- Now uses `/points/leaderboard` endpoint
- Column fields: rank, username, profile_image, points
- Medal indicators for top 3 positions
- User avatars from profile_image

#### Marketplace.tsx (New)
- Browse available store items
- Purchase confirmation with cost display
- Point balance updates after purchase
- Error handling with user feedback

### 4. Hook Exports
Updated `packages/frontend/src/hooks/index.ts` to export:
- Store hooks: `useStore`, `useInventory`, `useRedeems`
- Points hooks: `useLeaderboard`, `useUserProfile`, `useMyProfile`, `usePointEvents`

## Database Schema Requirements

### Existing Tables Used:
- `users` (id, display_name, avatar_url, nexus_id)
- `user_points` (user_id, balance_total, messages_count, watch_minutes)
- `point_events` (user_id, delta, type, reason, source, created_at, balance_after)

### New Tables Required:
- `store_items` - Items for sale
  - id, name, description, cost, type, sound_key, image_key, active, created_at, updated_at
- `user_inventory` - User's owned items
  - user_id, item_id, acquired_at
- `user_equipped` - Currently equipped items
  - user_id, item_type, item_id
- `chat_messages` - Chat history (optional for D1 persistence)
  - id, room_id, user_id, username, message, platform, created_at

## Message Reward System
Chat messages automatically award points:
- Twitch: 15 points per message
- YouTube: 15 points per message
- Nexus: 25 points per message

Point events are logged with:
- delta: points awarded
- type: "message"
- reason: origin platform
- source: platform name

## Authorization Patterns

### Owner-Only Endpoints:
- `POST /store/save` - Create/update store items

### Auth-Required Endpoints:
- `GET /points/me` - Get current user's profile
- `GET /points/events` - Get point history
- `POST /store/purchase` - Buy items
- `POST /store/equip` - Equip items
- `GET /store/inventory` - View inventory
- `GET /chat/send` - Send chat message

### Public Endpoints:
- `GET /points/leaderboard` - View leaderboard
- `GET /points/user/:userId` - View user profile
- `GET /store/list` - Browse store
- `GET /store/redeems` - View redeems
- `GET /chat/history` - Chat history

## Testing Checklist

- [ ] Leaderboard displays top 50 users with correct ranking
- [ ] User profile page shows rank and point history
- [ ] Store items can be created by owner
- [ ] Purchasing deducts points and adds to inventory
- [ ] Equipped items persist and display in inventory
- [ ] Chat messages are logged and visible in history
- [ ] Chat messages award correct points by platform
- [ ] Point events are recorded with correct reason/source
- [ ] Error messages display for failed purchases (insufficient points)
- [ ] Pagination works for leaderboard and events
- [ ] SSE stream provides real-time chat updates

## Future Enhancements (Phase 3+)
- WebSocket chat with Durable Objects for persistence
- Sound upload/playback to R2 for redeems
- Custom alerts for redeems
- Channel customization (decorations)
- VIP/Subscriber tiers with bonus multipliers
- Achievement/Badge system
- Point shop with limited-time items
- Raid/Host point bonuses

## Known Limitations
- Chat uses SSE instead of true WebSocket (Cloudflare Pages limitation)
- In-memory message history limited to 100 messages (should use D1 or Durable Objects)
- Admin token for chat clear needs environment variable setup
- Sound files must be pre-uploaded to R2 bucket

## Commits
1. "Phase 2: Implement Store, Points, and Chat systems" - Backend implementation
2. "Phase 2: Add frontend store and points hooks and components" - Frontend implementation

