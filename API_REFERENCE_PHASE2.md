# Nexus API Reference - Phase 2 Endpoints

## Base URL
- **Production**: `https://api.wolfethyst.tv`
- **Development**: `http://localhost:7654` (Wrangler)
- **Frontend Dev**: `/api` (proxied by Vite)

## Authentication
All endpoints that modify user data or require authentication use:
- Session cookies: `wolfesession=<session_id>`
- CORS: Credentials included in all requests

## Points System

### GET /points/leaderboard
Get top ranked users by points.

**Query Parameters:**
- `limit`: Number of results (1-100, default 50)
- `offset`: Pagination offset (default 0)

**Response:**
```json
{
  "leaderboard": [
    {
      "user_id": "twitch_123",
      "username": "streamer",
      "profile_image": "https://...",
      "points": 5000,
      "rank": 1
    }
  ],
  "limit": 50,
  "offset": 0
}
```

### GET /points/user/:userId
Get a specific user's profile and rank.

**Response:**
```json
{
  "user": {
    "user_id": "twitch_123",
    "username": "streamer",
    "profile_image": "https://...",
    "points": 5000,
    "rank": 1
  }
}
```

### GET /points/me
Get current logged-in user's profile. **Requires auth.**

**Response:**
```json
{
  "user": {
    "user_id": "twitch_123",
    "username": "me",
    "profile_image": "https://...",
    "points": 1000,
    "rank": 25
  }
}
```

### GET /points/events
Get current user's point change history. **Requires auth.**

**Query Parameters:**
- `limit`: Number of results (1-100, default 50)
- `offset`: Pagination offset (default 0)

**Response:**
```json
{
  "events": [
    {
      "id": "evt_123",
      "user_id": "twitch_123",
      "amount": 25,
      "reason": "message",
      "source": "nexus",
      "created_at": 1700000000000
    }
  ]
}
```

## Store System

### GET /store/list
Get all available store items.

**Response:**
```json
{
  "data": [
    {
      "id": "item_123",
      "name": "Crystal Pack",
      "description": "100 bonus crystals",
      "cost": 500,
      "type": "item",
      "soundKey": null,
      "imageKey": "crystals-100.png"
    }
  ]
}
```

### POST /store/save
Create or update a store item. **Owner only.**

**Request:**
```json
{
  "item": {
    "name": "Exclusive Badge",
    "description": "Limited edition badge",
    "cost": 1000,
    "type": "item",
    "soundKey": null,
    "imageKey": "badge.png"
  }
}
```

**Response:**
```json
{
  "success": true,
  "id": "item_123"
}
```

### POST /store/purchase
Purchase an item and deduct points. **Requires auth.**

**Request:**
```json
{
  "itemId": "item_123"
}
```

**Response (Success):**
```json
{
  "ok": true,
  "pointsAfter": 4500,
  "item": {
    "id": "item_123",
    "name": "Crystal Pack",
    "cost": 500
  }
}
```

**Response (Insufficient Points):**
```json
{
  "error": "Insufficient points",
  "pointsNeeded": 500,
  "pointsHave": 100
}
```

### GET /store/inventory
Get user's owned items. **Requires auth.**

**Response:**
```json
{
  "inventory": [
    {
      "id": "item_123",
      "name": "Crystal Pack",
      "description": "100 bonus crystals",
      "imageKey": "crystals-100.png",
      "cost": 500,
      "equipped": false
    }
  ]
}
```

### POST /store/equip
Equip an item from inventory. **Requires auth.**

**Request:**
```json
{
  "itemId": "item_123"
}
```

**Response:**
```json
{
  "ok": true
}
```

### GET /store/redeems
Get available channel point redeems.

**Response:**
```json
{
  "redeems": [
    {
      "id": "redeem_1",
      "name": "Play Sound",
      "cost": 100,
      "description": "Play a custom sound",
      "soundKey": "sound-1.mp3",
      "imageKey": null
    }
  ]
}
```

### POST /store/redeems/redeem
Redeem an item. **Requires auth.**

**Request:**
```json
{
  "id": "redeem_1",
  "input": "optional user input"
}
```

**Response:**
```json
{
  "ok": true,
  "pointsAfter": 4900,
  "redeem": {
    "id": "redeem_1",
    "name": "Play Sound",
    "soundKey": "sound-1.mp3"
  }
}
```

## Chat System

### POST /chat/send
Send a chat message.

**Request:**
```json
{
  "userId": "twitch_123",
  "user": "streamer",
  "text": "Hello chat!",
  "platform": "twitch",
  "originPlatform": "twitch",
  "avatar": "https://...",
  "color": "#FF0000"
}
```

**Response:**
```json
{
  "ok": true,
  "message": {
    "id": "msg_123",
    "userId": "twitch_123",
    "user": "streamer",
    "text": "Hello chat!",
    "platform": "twitch",
    "originPlatform": "twitch",
    "timestamp": 1700000000000
  }
}
```

### GET /chat/history
Get chat message history.

**Query Parameters:**
- `limit`: Number of messages (1-50, default 50)
- `offset`: Pagination offset (default 0)

**Response:**
```json
{
  "messages": [
    {
      "id": "msg_123",
      "userId": "twitch_123",
      "user": "streamer",
      "text": "Hello chat!",
      "platform": "twitch",
      "originPlatform": "twitch",
      "timestamp": 1700000000000
    }
  ]
}
```

### GET /chat/stream
Server-Sent Events stream for real-time chat.

**Headers:**
```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

**Messages:**
- `history`: Initial message history on connection
- `chat`: New message published
- `: heartbeat`: Every 10 seconds to keep connection alive

### POST /chat/clear
Clear recent chat messages. **Admin only.**

**Headers:**
```
X-Admin-Token: <admin_token>
```

**Response:**
```json
{
  "ok": true,
  "clearedCount": 50
}
```

## Error Responses

### 400 Bad Request
```json
{
  "error": "Missing required fields"
}
```

### 401 Unauthorized
```json
{
  "error": "Not logged in"
}
```

### 403 Forbidden
```json
{
  "error": "Owner only"
}
```

### 404 Not Found
```json
{
  "error": "Item not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Failed to process request"
}
```

## Point Rewards
Automatic points awarded per chat message:
- **Twitch**: 15 points
- **YouTube**: 15 points  
- **Nexus**: 25 points

## Rate Limiting
No explicit rate limiting implemented. Server-side validation includes:
- Max message length: 500 characters
- Max username length: 50 characters
- Point balances sanitized to >= 0

## CORS
Allowed origins:
- `https://nexus.wolfethyst.tv` (production)
- `http://localhost:5173` (frontend dev)

Credentials: `true` (cookies required)

