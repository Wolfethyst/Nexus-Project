import { Hono } from 'hono';
import type { Env } from '../index.js';
import { getUserPoints, getOwnerNexusId } from '../lib.js';

const router = new Hono<Env>();

interface User {
  user_id: string;
  username: string;
  profile_image?: string;
  points: number;
  rank: number;
}

// Helper to get session from request
async function getSessionFromRequest(env: Env['Bindings'], request: Request): Promise<{ userId?: string; nexusId?: string } | null> {
  const cookies = (request.headers.get('Cookie') || '')
    .split(';')
    .reduce((acc: Record<string, string>, part) => {
      const [key, value] = part.split('=');
      if (key && value) acc[key.trim()] = decodeURIComponent(value);
      return acc;
    }, {});

  const sessionId = cookies.wolfesession;
  if (!sessionId) return null;

  const session = await env.SESSIONS.get(`session:${sessionId}`, 'json') as any;
  return session ? { userId: session.userId, nexusId: session.nexusId } : null;
}

/**
 * GET /points/leaderboard - Get top users by points
 */
router.get('/leaderboard', async (c) => {
  try {
    const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
    const offset = parseInt(c.req.query('offset') || '0');

    // Get owner's Nexus ID to exclude them from leaderboard
    const ownerNexusId = await getOwnerNexusId(c.env);

    const { results } = await c.env.DB.prepare(`
      SELECT 
        u.id as user_id,
        u.display_name as username,
        u.avatar_url as profile_image,
        COALESCE(up.balance_total, 0) as points,
        ROW_NUMBER() OVER (ORDER BY COALESCE(up.balance_total, 0) DESC) as rank
      FROM users u
      LEFT JOIN user_points up ON u.id = up.user_id
      WHERE u.nexus_id != ?
      ORDER BY points DESC
      LIMIT ? OFFSET ?
    `).bind(ownerNexusId || '', limit, offset).all() as { results: User[] };

    return c.json({ leaderboard: results || [], limit, offset });
  } catch (error) {
    console.error('[POINTS] Leaderboard fetch failed:', error);
    return c.json({ leaderboard: [] });
  }
});

/**
 * GET /points/user/:userId - Get user's points and rank
 */
router.get('/user/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    
    const user = await c.env.DB.prepare(`
      SELECT 
        u.id as user_id,
        u.display_name as username,
        u.avatar_url as profile_image,
        COALESCE(up.balance_total, 0) as points,
        (SELECT COUNT(*) + 1 FROM user_points WHERE balance_total > COALESCE(up.balance_total, 0)) as rank
      FROM users u
      LEFT JOIN user_points up ON u.id = up.user_id
      WHERE u.id = ?
    `).bind(userId).first() as User;

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    return c.json({ user });
  } catch (error) {
    console.error('[POINTS] User fetch failed:', error);
    return c.json({ error: 'Failed to fetch user' }, 500);
  }
});

/**
 * GET /points/me - Get current user's points
 */
router.get('/me', async (c) => {
  const session = await getSessionFromRequest(c.env, c.req.raw);
  if (!session?.userId) {
    return c.json({ error: 'Not logged in' }, 401);
  }

  try {
    const points = await getUserPoints(c.env, session.userId);
    
    const user = await c.env.DB.prepare(`
      SELECT 
        u.id as user_id,
        u.display_name as username,
        u.avatar_url as profile_image,
        ? as points,
        (SELECT COUNT(*) + 1 FROM user_points WHERE balance_total > ?) as rank
      FROM users u
      WHERE u.id = ?
    `).bind(points, points, session.userId).first() as User;

    return c.json({ user });
  } catch (error) {
    console.error('[POINTS] Me fetch failed:', error);
    return c.json({ error: 'Failed to fetch profile' }, 500);
  }
});

/**
 * GET /points/events - Get point history
 */
router.get('/events', async (c) => {
  const session = await getSessionFromRequest(c.env, c.req.raw);
  if (!session?.userId) {
    return c.json({ error: 'Not logged in' }, 401);
  }

  try {
    const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
    const offset = parseInt(c.req.query('offset') || '0');

    const { results } = await c.env.DB.prepare(`
      SELECT id, user_id, delta as amount, type as reason, source, created_at
      FROM point_events
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).bind(session.userId, limit, offset).all();

    return c.json({ events: results || [] });
  } catch (error) {
    console.error('[POINTS] Events fetch failed:', error);
    return c.json({ events: [] });
  }
});

export default router;
