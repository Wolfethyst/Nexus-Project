import { Hono } from 'hono';
import type { Env } from '../index.js';
import { getIgdbCover } from '../lib.js';
const router = new Hono<Env>();

// GET /streams/list - List streams/VODs
router.get('/list', async (c) => {
  const limit = parseInt(c.req.query('limit') || '50');
  const game = c.req.query('game');
  
  try {
    let query = 'SELECT * FROM streams ORDER BY created_at DESC LIMIT ?';
    let params: any[] = [limit];
    
    if (game) {
      query = 'SELECT * FROM streams WHERE game_name = ? ORDER BY created_at DESC LIMIT ?';
      params = [game, limit];
    }
    
    const result = await c.env.DB.prepare(query).bind(...params).all();
    const streams = result.results || [];
    
    // Transform to Video format
    const videos = streams.map((s: any) => ({
      id: s.id,
      title: s.title,
      videoId: s.youtube_id || s.twitch_id,
      videoUrl: s.youtube_id ? `https://www.youtube.com/watch?v=${s.youtube_id}` : s.twitch_id ? `https://www.twitch.tv/videos/${s.twitch_id}` : '',
      thumbnailUrl: s.thumbnail_url,
      platform: s.vod_provider || 'youtube',
      createdAt: s.created_at,
      gameName: s.game_name,
      duration: s.duration
    }));
    
    return c.json({ ok: true, videos });
  } catch (error: any) {
    console.error('Stream list error:', error);
    return c.json({ ok: false, error: 'Failed to fetch streams' }, 500);
  }
});

// GET /streams/now - Get current stream info
router.get('/now', async (c) => {
  try {
    // Check cache for current stream info
    const streamInfo = await c.env.SESSIONS.get('stream:current', 'json') as any;
    const coverUrl = streamInfo?.game ? await getIgdbCover(streamInfo.game, c.env) : null;
    
    return c.json({
      ok: true,
      title: streamInfo?.title || 'Live Stream',
      game: streamInfo?.game || '',
      live: streamInfo?.live || false,
      cover: coverUrl,
    });
  } catch (error: any) {
    console.error('Stream now error:', error);
    return c.json({ ok: false, error: 'Failed to fetch stream info' }, 500);
  }
});

// GET /stream/info - Alias for /now to match frontend
router.get('/info', async (c) => {
  try {
    // Check cache for current stream info
    const streamInfo = await c.env.SESSIONS.get('stream:current', 'json') as any;
    const coverUrl = streamInfo?.game ? await getIgdbCover(streamInfo.game, c.env) : null;
    
    return c.json({
      ok: true,
      title: streamInfo?.title || 'Live Stream',
      game: streamInfo?.game || '',
      live: streamInfo?.live || false,
      cover: coverUrl,
    });
  } catch (error: any) {
    console.error('Stream info error:', error);
    return c.json({ ok: false, error: 'Failed to fetch stream info' }, 500);
  }
});

// POST /stream/title - Update stream title (admin only)
router.post('/title', async (c) => {
  const body = await c.req.json() as { title?: string; game?: string };
  
  // Check owner/mod permission
  const ownerToken = c.req.header('X-Owner-Token');
  const sessionId = c.req.header('Cookie')?.match(/wolfesession=([^;]+)/)?.[1];
  
  let authorized = false;
  if (ownerToken && c.env.OWNER_TOKEN && ownerToken === c.env.OWNER_TOKEN) {
    authorized = true;
  } else if (sessionId) {
    const session = await c.env.SESSIONS.get(`session:${sessionId}`, 'json') as any;
    if (session?.roles?.includes('owner') || session?.roles?.includes('mod')) {
      authorized = true;
    }
  }
  
  if (!authorized) {
    return c.json({ ok: false, error: 'Unauthorized' }, 403);
  }
  
  try {
    // Update cache
    const current = await c.env.SESSIONS.get('stream:current', 'json') as any || {};
    const updated = {
      ...current,
      title: body.title || current.title || 'Live Stream',
      game: body.game || current.game || '',
      updated: Date.now()
    };
    
    await c.env.SESSIONS.put('stream:current', JSON.stringify(updated));
    
    return c.json({ ok: true, data: updated });
  } catch (error: any) {
    console.error('Stream title update error:', error);
    return c.json({ ok: false, error: 'Failed to update stream' }, 400);
  }
});

export default router;
