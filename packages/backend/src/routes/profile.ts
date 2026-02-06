import { Hono } from 'hono';
import type { Env } from '../index.js';

const router = new Hono<Env>();

interface Session {
  user?: {
    id: string;
    username?: string;
    display?: string;
  };
}

interface ProfileBody {
  displayName?: string;
  nameColor?: string;
  pronouns?: string;
}

interface NexusMeta {
  uuid: string;
  platform: string;
  displayName: string;
  nameColor?: string;
  pronouns?: string;
  points: number;
  inventory: any[];
  avatarDecoration: any;
  activeMessageDecoration: any;
}

// GET /profile - Get currentuser's Nexus profile
router.get('/', async (c) => {
  // TODO: Get session from cookie
  const sessionId = c.req.header('Cookie')?.match(/wolfesession=([^;]+)/)?.[1];
  if (!sessionId) {
    return c.json({ error: 'Not logged in' }, 401);
  }

  // TODO: Get session from KV
  const session = await c.env.SESSIONS.get<Session>(`session:${sessionId}`, 'json');
  if (!session?.user?.id) {
    return c.json({ error: 'Not logged in' }, 401);
  }

  // Get user's Nexus meta from KV
  const metaKey = `nexus:meta:${session.user.id}`;
  const meta = await c.env.POINTS.get(metaKey, 'json');

  return c.json({ profile: meta || {} });
});

// POST /profile - Update user's Nexus profile
router.post('/', async (c) => {
  const sessionId = c.req.header('Cookie')?.match(/wolfesession=([^;]+)/)?.[1];
  if (!sessionId) {
    return c.json({ error: 'Not logged in' }, 401);
  }

  const session = await c.env.SESSIONS.get<Session>(`session:${sessionId}`, 'json');
  if (!session?.user?.id) {
    return c.json({ error: 'Not logged in' }, 401);
  }

  const body = await c.req.json() as ProfileBody;
  const userId = session.user.id;
  const metaKey = `nexus:meta:${userId}`;
  
  // Get existing meta or create new
  let meta: NexusMeta = await c.env.POINTS.get<NexusMeta>(metaKey, 'json') || {
    uuid: userId,
    platform: 'nexus',
    displayName: session.user.display || 'Adventurer',
    points: 0,
    inventory: [],
    avatarDecoration: null,
    activeMessageDecoration: null
  };

  // Update allowed fields
  if (body.displayName) {
    meta.displayName = body.displayName.substring(0, 25);
  }
  if (body.nameColor) {
    meta.nameColor = body.nameColor;
  }
  if (body.pronouns) {
    meta.pronouns = body.pronouns.substring(0, 15);
  }

  // Save back to KV
  await c.env.POINTS.put(metaKey, JSON.stringify(meta));

  // Also update D1 users table
  try {
    await c.env.DB.prepare(
      'UPDATE users SET display_name = ?, updated_at = ? WHERE id = ?'
    ).bind(meta.displayName, Date.now(), userId).run();
  } catch (e) {
    console.error('Failed to update D1 users table:', e);
  }

  return c.json({ ok: true, profile: meta });
});

export default router;
