import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { ChatRoom } from './durable-objects/ChatRoom';
import authRouter from './routes/auth';
import videosRouter from './routes/videos';
import streamsRouter from './routes/streams';
import clipsRouter from './routes/clips';
import storeRouter from './routes/store';
import pointsRouter from './routes/points';
import { chat } from './routes/chat';
import adminRouter from './routes/admin';

export type Env = {
  Bindings: {
    DB: D1Database;
    POINTS: KVNamespace;
    SESSIONS: KVNamespace;
    ASSETS: KVNamespace;
    MODERATION: KVNamespace;
    CLIPS: KVNamespace;
    CHAT_ROOM: DurableObjectNamespace;
    REDEEM_SOUNDS: R2Bucket;
    TWITCH_CLIENT_ID?: string;
    TWITCH_CLIENT_SECRET?: string;
    YOUTUBE_CLIENT_ID?: string;
    YOUTUBE_CLIENT_SECRET?: string;
    YOUTUBE_CHANNEL_ID?: string;
    OWNER_TOKEN?: string;
  };
};

const app = new Hono<Env>();

// Serve any asset from KV: /assets/:key
app.get('/assets/:key', async (c) => {
  const key = c.req.param('key');
  const asset = await c.env.ASSETS.get(key, 'arrayBuffer');
  if (!asset) {
    return c.text('Not found', 404);
  }
  // Guess content type by extension
  let contentType = 'application/octet-stream';
  if (key.endsWith('.png')) contentType = 'image/png';
  else if (key.endsWith('.jpg') || key.endsWith('.jpeg')) contentType = 'image/jpeg';
  else if (key.endsWith('.svg')) contentType = 'image/svg+xml';
  else if (key.endsWith('.gif')) contentType = 'image/gif';
  else if (key.endsWith('.ico')) contentType = 'image/x-icon';
  else if (key.endsWith('.webp')) contentType = 'image/webp';
  else if (key.endsWith('.css')) contentType = 'text/css';
  else if (key.endsWith('.js')) contentType = 'application/javascript';
  else if (key.endsWith('.json')) contentType = 'application/json';
  else if (key === 'crystal_icon') contentType = 'image/png';
  return new Response(asset, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000',
    },
  });
});

// Serve redeem sounds (and other files) from R2: /sounds/*
app.get('/sounds/*', async (c) => {
  const key = c.req.path.replace(/^\/sounds\//, '');
  const obj = await c.env.REDEEM_SOUNDS.get(key);
  if (!obj) {
    return c.text('Not found', 404);
  }
  // Guess content type by extension
  let contentType = 'application/octet-stream';
  if (key.endsWith('.mp3')) contentType = 'audio/mpeg';
  else if (key.endsWith('.wav')) contentType = 'audio/wav';
  else if (key.endsWith('.ogg')) contentType = 'audio/ogg';
  else if (key.endsWith('.png')) contentType = 'image/png';
  else if (key.endsWith('.jpg') || key.endsWith('.jpeg')) contentType = 'image/jpeg';
  else if (key.endsWith('.gif')) contentType = 'image/gif';
  else if (key.endsWith('.webm')) contentType = 'video/webm';
  else if (key.endsWith('.mp4')) contentType = 'video/mp4';
  else if (key.endsWith('.webp')) contentType = 'image/webp';
  return new Response(obj.body, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000',
    },
  });
});
// Serve /assets/nexus_icon.png from KV
app.get('/assets/nexus_icon.png', async (c) => {
  const icon = await c.env.ASSETS.get('nexus_icon', 'arrayBuffer');
  if (!icon) {
    return c.text('Not found', 404);
  }
  return new Response(icon, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000',
    },
  });
});

// Middleware
app.use(
  '*',
  cors({
    origin: ['https://nexus.wolfethyst.tv', 'http://localhost:5173'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Owner-Token'],
    credentials: true,
  })
);

// Health check
app.get('/health', (c) => {
  return c.json({ ok: true, timestamp: new Date().toISOString() });
});

// Routes
app.route('/auth', authRouter);
app.route('/videos', videosRouter);
app.route('/streams', streamsRouter);
app.route('/stream', streamsRouter); // Alias for singular usage
app.route('/clips', clipsRouter);
app.route('/store', storeRouter);
app.route('/points', pointsRouter);
app.route('/admin', adminRouter);
app.route('/chat', chat);

// Leaderboard endpoint (public) - delegate to /points/leaderboard
app.get('/leaderboard', (c) => {
  // Redirect to the new /points/leaderboard endpoint using query params
  return c.redirect(`/points/leaderboard?limit=${c.req.query('limit') || '50'}&offset=${c.req.query('offset') || '0'}`);
});

// 404
app.notFound((c) => {
  return c.json({ ok: false, error: 'Not found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error(err);
  return c.json(
    {
      ok: false,
      error: err instanceof Error ? err.message : 'Internal server error',
    },
    500
  );
});

export default app;

// Export Durable Object for Cloudflare
export { ChatRoom };
