import { Hono } from 'hono';
import type { Env } from '../index.js';

const router = new Hono<Env>();

// GET /auth/session - Get current session
router.get('/session', async (c) => {
  const auth = c.req.header('Authorization');
  
  if (!auth) {
    return c.json({ loggedIn: false, roles: [] });
  }

  try {
    // const _token = auth.replace('Bearer ', '');
    // TODO: Verify JWT token with c.env.JWT_SECRET
    // For now, placeholder
    return c.json({ loggedIn: true, roles: [], user: null });
  } catch (error) {
    return c.json({ loggedIn: false, roles: [] });
  }
});

// GET /auth/twitch/login - Initiate Twitch OAuth
router.get('/twitch/login', (c) => {
  const clientId = c.env.TWITCH_CLIENT_ID;
  const redirectUri = new URL(c.req.url).origin + '/auth/twitch/callback';
  const scope = 'user:read:email';
  
  const url = new URL('https://id.twitch.tv/oauth2/authorize');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', scope);

  return c.redirect(url.toString());
});

// GET /auth/youtube/login - Initiate YouTube OAuth
router.get('/youtube/login', (c) => {
  const clientId = c.env.YOUTUBE_CLIENT_ID;
  const redirectUri = new URL(c.req.url).origin + '/auth/youtube/callback';
  const scope = 'openid profile email';
  
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', scope);

  return c.redirect(url.toString());
});

// POST /auth/logout
router.post('/logout', (c) => {
  return c.json({ ok: true });
});

// POST /auth/delete-account
router.post('/delete-account', (c) => {
  // TODO: Implement account deletion
  return c.json({ ok: true });
});

export default router;
