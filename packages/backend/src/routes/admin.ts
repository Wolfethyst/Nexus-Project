import { Hono } from 'hono';
import type { Env } from '../index.js';

const router = new Hono<Env>();

// Middleware to check owner permission
router.use('*', async (c, next) => {
  const ownerToken = c.req.header('X-Owner-Token');
  const sessionId = c.req.header('Cookie')?.match(/wolfesession=([^;]+)/)?.[1];
  
  let authorized = false;
  if (ownerToken && c.env.OWNER_TOKEN && ownerToken === c.env.OWNER_TOKEN) {
    authorized = true;
  } else if (sessionId) {
    const session = await c.env.SESSIONS.get(`session:${sessionId}`, 'json') as any;
    if (session?.roles?.includes('owner')) {
      authorized = true;
    }
  }
  
  if (!authorized) {
    return c.json({ ok: false, error: 'Unauthorized' }, 403);
  }
  await next();
});

router.get('/stats', async (c) => {
  try {
    // Count VODs (streams table)
    const vodsResult = await c.env.DB.prepare('SELECT COUNT(*) as count FROM streams').first();
    const vods = (vodsResult as any)?.count || 0;

    // Count Users
    const usersResult = await c.env.DB.prepare('SELECT COUNT(*) as count FROM users').first();
    const users = (usersResult as any)?.count || 0;

    // Count Clips (try clips table, fallback to 0 if not exists)
    let clips = 0;
    try {
        const clipsResult = await c.env.DB.prepare('SELECT COUNT(*) as count FROM clips').first();
        clips = (clipsResult as any)?.count || 0;
    } catch (e) {
        // Table might not exist yet
    }

    return c.json({
      ok: true,
      vods,
      clips,
      users
    });
  } catch (error: any) {
    console.error('Stats error:', error);
    return c.json({ ok: false, error: 'Failed to fetch stats' }, 500);
  }
});

router.post('/settings/tala', async (c) => {
  try {
    const settings = await c.req.json();
    // Store in MODERATION KV
    await c.env.MODERATION.put('settings:tala', JSON.stringify(settings));
    return c.json({ ok: true });
  } catch (error: any) {
    return c.json({ ok: false, error: error.message }, 500);
  }
});

router.post('/settings/chat', async (c) => {
  try {
    const settings = await c.req.json();
    await c.env.MODERATION.put('settings:chat', JSON.stringify(settings));
    return c.json({ ok: true });
  } catch (error: any) {
    return c.json({ ok: false, error: error.message }, 500);
  }
});

export default router;