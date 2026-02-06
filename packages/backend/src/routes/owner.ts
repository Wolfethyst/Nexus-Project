import { Hono } from 'hono';
import { XMLParser } from 'fast-xml-parser';
import type { Env } from '../index.js';
import { getOwnerStats, getLeaderboard } from '../lib.js';

const router = new Hono<Env>();

const OWNER_UUID = '7fea3331-7c36-49ac-975b-58de25ecf6ba';

// Helper to check owner permission
async function requireOwner(c: any) {
  const ownerToken = c.req.header('X-Owner-Token') || c.req.header('Authorization')?.replace('Bearer ', '');
  if (ownerToken && c.env.OWNER_TOKEN && ownerToken === c.env.OWNER_TOKEN) {
    return { ok: true, session: { user: { id: OWNER_UUID } } };
  }

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

type YouTubeItem = {
  videoId: string;
  title: string;
  thumbnail: string;
  publishedAt: number;
};

function normalizeArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

async function fetchYouTubeRss(channelId: string): Promise<YouTubeItem[]> {
  const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  const response = await fetch(rssUrl);
  if (!response.ok) {
    throw new Error(`YouTube RSS returned ${response.status}`);
  }

  const xml = await response.text();
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
  });
  const parsed = parser.parse(xml) as any;
  const entries = normalizeArray(parsed?.feed?.entry);

  return entries
    .map((entry: any) => {
      const videoId = entry['yt:videoId'];
      const title = entry?.title;
      const published = entry?.published || entry?.updated;
      const mediaGroup = entry?.['media:group'];
      const thumbnails = normalizeArray(mediaGroup?.['media:thumbnail']);
      const thumbnail = thumbnails[0]?.['@_url'] || '';

      if (!videoId || !title || !published) return null;

      return {
        videoId,
        title,
        thumbnail,
        publishedAt: new Date(published).getTime(),
      } as YouTubeItem;
    })
    .filter(Boolean) as YouTubeItem[];
}

// POST /owner/youtube/sync - Sync YouTube videos to database
router.post('/youtube/sync', async (c) => {
  const auth = await requireOwner(c);
  if (!auth.ok) {
    return c.json({ error: auth.error }, auth.status);
  }

  const session = auth.session;
  try {
    let items: YouTubeItem[] = [];

    if (session.youtube?.access) {
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

      const data = await response.json() as { items?: any[] };
      const apiItems = data.items || [];

      items = apiItems.map((item: any) => {
        const thumbnail = item.snippet.thumbnails?.maxres?.url ||
          item.snippet.thumbnails?.high?.url ||
          item.snippet.thumbnails?.medium?.url || '';

        return {
          videoId: item.id.videoId,
          title: item.snippet.title,
          thumbnail,
          publishedAt: new Date(item.snippet.publishedAt).getTime(),
        } as YouTubeItem;
      });
    } else {
      const channelId = c.env.YOUTUBE_CHANNEL_ID;
      if (!channelId) {
        return c.json({ error: 'YouTube not connected and no channel ID configured' }, 400);
      }

      items = await fetchYouTubeRss(channelId);
    }
    
    let synced = 0;
    let skipped = 0;

    for (const item of items) {
      const { videoId, title, thumbnail, publishedAt } = item;

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
    const stats = await getOwnerStats(c.env);
    return c.json({ ok: true, ...stats });
  } catch (error: any) {
    return c.json({ error: 'Failed to fetch stats', details: error.message }, 500);
  }
});

// GET /owner/leaderboard - Get leaderboard for owner
router.get('/leaderboard', async (c) => {
  const auth = await requireOwner(c);
  if (!auth.ok) {
    return c.json({ error: auth.error }, auth.status);
  }

  try {
    const limit = parseInt(c.req.query('limit') || '50');
    const leaderboard = await getLeaderboard(c.env, limit);
    return c.json({ ok: true, leaderboard });
  } catch (error: any) {
    return c.json({ error: 'Failed to fetch leaderboard', details: error.message }, 500);
  }
});

export default router;
