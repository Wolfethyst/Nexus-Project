import { Hono, type Context } from 'hono';
import type { Env } from '../index.js';

const router = new Hono<Env>();

const OWNER_UUID = '7fea3331-7c36-49ac-975b-58de25ecf6ba';

// Helper to check owner permission
async function requireOwner(c: any) {
  const sessionId = c.req.header('Cookie')?.match(/wolfesession=([^;]+)/)?.[1];
  if (!sessionId) {
    return { ok: false, status: 401, error: 'Not logged in' };
  }

  const session = await c.env.SESSIONS.get(`session:${sessionId}`, 'json');
  if (!session?.user?.id || session.user.id !== OWNER_UUID) {
    return { ok: false, status: 403, error: 'Forbidden' };
  }

  return { ok: true, session };
}

// POST /owner/youtube/sync - Sync YouTube videos to database
router.post('/youtube/sync', async (c) => {
  const auth = await requireOwner(c);
  if (!auth.ok) {
    return c.json({ error: auth.error }, auth.status);
  }

  const session = auth.session;
  if (!session.youtube?.access) {
    return c.json({ error: 'YouTube not connected' }, 400);
  }

  try {
    // Get YouTube videos from API
    const response = await fetch(
      'https://www.googleapis.com/youtube/v3/search?part=snippet&forMine=true&type=video&maxResults=50&order=date',
      {
        headers: {
          'Authorization': `Bearer ${session.youtube.access}`
        }
      }
    );

    if (!response.ok) {
      return c.json({ error: 'YouTube API returned error', status: response.status }, 500);
    }

    const data = await response.json();
    const items = data.items || [];
    
    let synced = 0;
    let skipped = 0;

    for (const item of items) {
      const videoId = item.id.videoId;
      const title = item.snippet.title;
      const thumbnail = item.snippet.thumbnails?.maxres?.url || 
                       item.snippet.thumbnails?.high?.url || 
                       item.snippet.thumbnails?.medium?.url;
      const publishedAt = new Date(item.snippet.publishedAt).getTime();

      // Check if already exists
      const existing = await c.env.DB.prepare(
        'SELECT id FROM streams WHERE youtube_id = ?'
      ).bind(videoId).first();

      if (existing) {
        skipped++;
        continue;
      }

      // Insert new stream record
      const streamId = crypto.randomUUID().replace(/-/g, '');
      await c.env.DB.prepare(`
        INSERT INTO streams (id, uid, title, youtube_id, vod_provider, thumbnail_url, created_at, game_name, duration)
        VALUES (?, ?, ?, ?, 'youtube', ?, ?, '', '')
      `).bind(streamId, OWNER_UUID, title, videoId, thumbnail, publishedAt).run();

      synced++;
    }

    return c.json({ 
      ok: true, 
      synced, 
      skipped,
      total: items.length 
    });

  } catch (error: any) {
    console.error('YouTube sync error:', error);
    return c.json({ error: 'Sync failed', details: error.message }, 500);
  }
});

// GET /owner/stats - Get dashboard stats
router.get('/stats', async (c) => {
  const auth = await requireOwner(c);
  if (!auth.ok) {
    return c.json({ error: auth.error }, auth.status);
  }

  try {
    const [vodsResult, clipsResult, usersResult] = await Promise.all([
      c.env.DB.prepare('SELECT COUNT(*) as count FROM streams').first(),
      c.env.DB.prepare('SELECT COUNT(*) as count FROM clips').first(),
      c.env.DB.prepare('SELECT COUNT(*) as count FROM users').first(),
    ]);

    return c.json({
      vods: vodsResult?.count || 0,
      clips: clipsResult?.count || 0,
      users: usersResult?.count || 0
    });
  } catch (error: any) {
    return c.json({ error: 'Failed to fetch stats', details: error.message }, 500);
  }
});

export default router;
