import { Hono } from 'hono';
import type { Context } from 'hono';
import type { Env } from '../index.js';

export const chat = new Hono<Env>();

// Chat message type
interface ChatMessage {
  id: string;
  userId: string;
  user: string;
  text: string;
  platform: string;
  originPlatform: string;
  avatar?: string;
  pronouns?: string;
  decoration?: string;
  messageDecoration?: string;
  color?: string;
  timestamp: number;
}

const CHAT_ROOM_NAME = 'global';

const getChatRoom = (env: Env['Bindings']) => {
  const id = env.CHAT_ROOM.idFromName(CHAT_ROOM_NAME);
  return env.CHAT_ROOM.get(id);
};

/**
 * POST /chat/send - Send a chat message
 */
chat.post('/send', async (c: Context) => {
  try {
    const body = await c.req.json();
    const { text, user, platform = 'nexus', originPlatform = 'nexus', avatar, pronouns, decoration, messageDecoration, color } = body;

    if (!text || !user) {
      return c.json({ error: 'Missing text or user' }, 400);
    }

    const message: ChatMessage = {
      id: crypto.randomUUID(),
      userId: body.userId || 'anonymous',
      user: user.substring(0, 50),
      text: text.substring(0, 500),
      platform: platform.toLowerCase(),
      originPlatform: originPlatform.toLowerCase(),
      avatar: avatar || undefined,
      pronouns: pronouns?.substring(0, 15) || undefined,
      decoration: decoration || undefined,
      messageDecoration: messageDecoration || undefined,
      color: color || undefined,
      timestamp: Date.now(),
    };

    // Get the chat room Durable Object
    const durableObject = getChatRoom(c.env);
    
    // Send message to the Durable Object to broadcast
    const response = await durableObject.fetch(new Request('http://localhost/send-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    }));

    // Award points for message (if userId is valid and not system)
    if (body.userId && body.originPlatform !== 'system') {
      const pointsPerMessage = {
        twitch: 15,
        youtube: 15,
        nexus: 25,
      };
      const points = pointsPerMessage[originPlatform as keyof typeof pointsPerMessage] || 0;
      
      if (points > 0 && c.env.DB) {
        try {
          const now = Date.now();
          await c.env.DB.prepare(`
            UPDATE user_points 
            SET balance_total = balance_total + ?, messages_count = messages_count + 1, updated_at = ? 
            WHERE user_id = ?
          `).bind(points, now, body.userId).run();

          await c.env.DB.prepare(`
            INSERT INTO point_events (user_id, delta, type, reason, source, created_at)
            VALUES (?, ?, 'message', ?, ?, ?)
          `).bind(body.userId, points, originPlatform, originPlatform, now).run();
        } catch (e) {
          console.error('Failed to award points:', e);
        }
      }
    }

    return c.json({ ok: true, message });
  } catch (error) {
    console.error('Chat send error:', error);
    return c.json({ error: 'Failed to send message' }, 500);
  }
});

/**
 * GET /chat/history - Get chat message history
 */
chat.get('/history', async (c: Context) => {
  try {
    const limit = parseInt(c.req.query('limit') || '50');
    const durableObject = getChatRoom(c.env);
    
    const response = await durableObject.fetch(
      new Request(`http://localhost/get-history?limit=${limit}`)
    );
    const data = await response.json() as { messages: ChatMessage[] };
    
    return c.json(data);
  } catch (error) {
    console.error('Chat history error:', error);
    return c.json({ messages: [] });
  }
});

/**
 * POST /chat/clear - Clear chat (mods only)
 */
chat.post('/clear', async (c: Context) => {
  try {
    // Check if user is mod/owner
    // For now, require X-Admin-Token header
    const token = c.req.header('X-Admin-Token');
    if (token !== c.env.ADMIN_TOKEN) {
    return c.json({ error: 'Forbidden' }, 403);
  }

    const durableObject = getChatRoom(c.env);
    const response = await durableObject.fetch(
      new Request('http://localhost/clear?count=50')
    );
    const data = await response.json();
    
    return c.json(data);
  } catch (error) {
    console.error('Chat clear error:', error);
    return c.json({ error: 'Failed to clear chat' }, 500);
  }
});

/**
 * GET /chat/stream - Server-Sent Events (SSE) for real-time chat
 * Returns text/event-stream with chat message updates
 */
chat.get('/stream', async (c: Context) => {
  try {
    const clientId = `client_${crypto.randomUUID()}`;
    
    // Get the chat room Durable Object and request a client stream
    const durableObject = getChatRoom(c.env);
    const response = await durableObject.fetch(new Request('http://localhost/add-client', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId }),
    }));
    
    return new Response(response.body, {
      status: response.status,
      headers: new Headers(response.headers),
    });
  } catch (error) {
    console.error('Chat stream error:', error);
    return c.text('event: error\ndata: Connection failed\n\n', 500);
  }
});
