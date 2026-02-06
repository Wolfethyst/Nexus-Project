import { Hono } from 'hono';
import { cors } from 'hono/cors';
import authRouter from './routes/auth';
import videosRouter from './routes/videos';
import streamsRouter from './routes/streams';
import clipsRouter from './routes/clips';
import storeRouter from './routes/store';
import profileRouter from './routes/profile';
import ownerRouter from './routes/owner';
import redeemsRouter from './routes/redeems';

export type Env = {
  Bindings: {
    DB: D1Database;
    POINTS: KVNamespace;
    SESSIONS: KVNamespace;
    ASSETS: KVNamespace;
    MODERATION: KVNamespace;
    CLIPS: KVNamespace;
    REDEEM_SOUNDS: R2Bucket;
    TWITCH_CLIENT_ID: string;
    TWITCH_CLIENT_SECRET: string;
    YOUTUBE_CLIENT_ID: string;
    YOUTUBE_CLIENT_SECRET: string;
    YOUTUBE_CHANNEL_ID?: string;
    OWNER_TOKEN?: string;
    JWT_SECRET: string;
  };
};

const app = new Hono<Env>();

// Middleware
app.use(
  '*',
  cors({
    origin: '*',
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
app.route('/clips', clipsRouter);
app.route('/store', storeRouter);
app.route('/nexus/profile', profileRouter);
app.route('/owner', ownerRouter);
app.route('/redeems', redeemsRouter);

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
