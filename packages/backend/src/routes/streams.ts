import { Hono, type Context } from 'hono';
import type { Env } from '../index.js';

const router = new Hono<Env>();

// GET /streams/list - List streams/VODs
router.get('/list', async (c) => {
  const limit = c.req.query('limit') || '50';
  const game = c.req.query('game');
  
  try {
    // TODO: Query D1 for streams
    return c.json({ ok: true, streams: [] });
  } catch (error) {
    return c.json({ ok: false, error: 'Failed to fetch streams' }, 500);
  }
});

// GET /streams/now - Get current stream info
router.get('/now', async (c) => {
  try {
    // TODO: Query D1 or cache for current stream
    return c.json({
      ok: true,
      title: '',
      game: '',
      live: false,
    });
  } catch (error) {
    return c.json({ ok: false, error: 'Failed to fetch stream info' }, 500);
  }
});

// POST /stream/title - Update stream title (admin only)
router.post('/title', async (c) => {
  const { title, game } = await c.req.json();
  
  try {
    // TODO: Update D1, cache
    return c.json({ ok: true });
  } catch (error) {
    return c.json({ ok: false, error: 'Failed to update stream' }, 400);
  }
});

export default router;
