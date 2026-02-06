import { Hono } from 'hono';
import type { Env } from '../index.js';

const router = new Hono<Env>();

// GET /videos - List all videos
router.get('/', async (c) => {
  try {
    // TODO: Query D1 for videos
    return c.json({ ok: true, videos: [] });
  } catch (error) {
    return c.json(
      { ok: false, error: 'Failed to fetch videos' },
      500
    );
  }
});

// GET /videos/:id - Get video details
router.get('/:id', async (c) => {
  const { id: _id } = c.req.param();
  
  try {
    // TODO: Query D1 for specific video
    return c.json({ ok: true, video: null });
  } catch (error) {
    return c.json({ ok: false, error: 'Video not found' }, 404);
  }
});

// POST /videos - Create video (admin only)
router.post('/', async (c) => {
  // TODO: Add auth check
  const _data = await c.req.json();
  
  try {
    // TODO: Insert into D1
    return c.json({ ok: true, id: 'new-id' }, 201);
  } catch (error) {
    return c.json({ ok: false, error: 'Failed to create video' }, 400);
  }
});

export default router;
