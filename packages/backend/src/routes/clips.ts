import { Hono, type Context } from 'hono';
import type { Env } from '../index.js';

const router = new Hono<Env>();

// GET /clips/list - List clips
router.get('/list', async (c) => {
  try {
    // TODO: Query D1 for clips
    return c.json({ ok: true, clips: [] });
  } catch (error) {
    return c.json({ ok: false, error: 'Failed to fetch clips' }, 500);
  }
});

// GET /clips/meta - Get clip metadata
router.get('/meta', async (c) => {
  const id = c.req.query('id');
  
  try {
    // TODO: Query D1 for clip
    return c.json({ ok: true, clip: null });
  } catch (error) {
    return c.json({ ok: false, error: 'Clip not found' }, 404);
  }
});

// POST /clips/create - Create a clip (requires auth)
router.post('/create', async (c) => {
  const { windowSeconds } = await c.req.json();
  
  try {
    // TODO: Create clip via Cloudflare Stream API or similar
    return c.json({ ok: true, id: 'new-clip-id' }, 201);
  } catch (error) {
    return c.json({ ok: false, error: 'Failed to create clip' }, 400);
  }
});

export default router;
