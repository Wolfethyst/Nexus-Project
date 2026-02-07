import { Hono } from 'hono';
import type { Env } from '../index.js';
import { ensureUserInD1 } from '../lib.js';

const router = new Hono<Env>();

interface LogToUserInfo {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
}

interface LogToTokenResponse {
  access_token: string;
  id_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
}

interface SessionData {
  userId: string;
  email?: string;
  name?: string;
  avatar?: string;
  accessToken: string;
  expiresAt: number;
}

function parseCookies(headerValue?: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!headerValue) return cookies;
  headerValue.split(';').forEach((part) => {
    const [key, ...rest] = part.split('=');
    if (key && rest.length) {
      cookies[key.trim()] = decodeURIComponent(rest.join('='));
    }
  });
  return cookies;
}

function setCookieHeader(name: string, value: string, maxAge: number): string {
  return `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; Secure; HttpOnly; SameSite=Lax`;
}

/**
 * GET /auth/logto/login - Start OIDC flow
 */
router.get('/logto/login', async (c) => {
  const endpoint = c.env.LOGTO_ENDPOINT;
  const clientId = c.env.LOGTO_CLIENT_ID;

  console.log('[LOGIN] Config:', { endpoint, clientId });

  if (!endpoint || !clientId) {
    console.error('[LOGIN] Missing config');
    return c.json({ error: 'Configuration missing' }, 500);
  }

  const state = crypto.randomUUID();
  const nonce = crypto.randomUUID();

  await c.env.SESSIONS.put(`state:${state}`, JSON.stringify({ nonce }), {
    expirationTtl: 300,
  });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: 'https://nexus.wolfethyst.tv/api/auth/logto/callback',
    response_type: 'code',
    scope: 'openid profile email',
    state,
    nonce,
  });

  const authUrl = `${endpoint}/oidc/auth?${params.toString()}`;
  return c.redirect(authUrl);
});

/**
 * GET /auth/logto/callback - Handle redirect from LogTo
 */
router.get('/logto/callback', async (c) => {
  const code = c.req.query('code');
  const state = c.req.query('state');
  const error = c.req.query('error');

  console.log('[CALLBACK] Start:', { code: !!code, state, error });

  if (error) {
    return c.json({ error: `Auth failed: ${error}` }, 400);
  }

  if (!code || !state) {
    return c.json({ error: 'Invalid callback' }, 400);
  }

  try {
    // Verify state
    const savedState = await c.env.SESSIONS.get(`state:${state}`, 'json');
    if (!savedState) {
      console.error('[CALLBACK] State mismatch');
      return c.json({ error: 'State mismatch' }, 400);
    }

    const endpoint = c.env.LOGTO_ENDPOINT;
    const clientId = c.env.LOGTO_CLIENT_ID;
    const clientSecret = c.env.LOGTO_CLIENT_SECRET;

    console.log('[CALLBACK] Secrets check:', {
      endpoint: !!endpoint,
      clientId: !!clientId,
      clientSecret: !!clientSecret,
    });

    if (!endpoint || !clientId || !clientSecret) {
      console.error('[CALLBACK] Missing config!', {
        endpoint: !!endpoint,
        clientId: !!clientId,
        clientSecret: !!clientSecret,
      });
      return c.json({ error: 'Server misconfigured' }, 500);
    }

    console.log('[CALLBACK] Exchanging code...');

    const tokenRes = await fetch(`${endpoint}/oidc/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: 'https://nexus.wolfethyst.tv/api/auth/logto/callback',
        code,
      }).toString(),
    });

    console.log('[CALLBACK] Token response:', tokenRes.status);

    if (!tokenRes.ok) {
      const text = await tokenRes.text();
      console.error('[CALLBACK] Token error:', text);
      return c.json({ error: 'Token failed', details: text }, 500);
    }

    const tokens: LogToTokenResponse = await tokenRes.json();

    // Get user info
    const userRes = await fetch(`${endpoint}/oidc/me`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userRes.ok) {
      console.error('[CALLBACK] Userinfo failed:', userRes.status);
      return c.json({ error: 'Userinfo failed' }, 500);
    }

    const user: LogToUserInfo = await userRes.json();
    console.log('[CALLBACK] Got user:', user.sub);

    // Save to D1
    await ensureUserInD1(c.env, user.sub, user.name || user.email || 'User', user.picture);

    // Create session
    const sessionId = crypto.randomUUID();
    const sessionData: SessionData = {
      userId: user.sub,
      email: user.email,
      name: user.name,
      avatar: user.picture,
      accessToken: tokens.access_token,
      expiresAt: Date.now() + tokens.expires_in * 1000,
    };

    await c.env.SESSIONS.put(`session:${sessionId}`, JSON.stringify(sessionData), {
      expirationTtl: Math.min(tokens.expires_in, 604800),
    });

    c.header('Set-Cookie', setCookieHeader('wolfesession', sessionId, Math.min(tokens.expires_in, 604800)));

    console.log('[CALLBACK] Success');
    return c.redirect('https://nexus.wolfethyst.tv/');
  } catch (error) {
    console.error('[CALLBACK] Exception:', error);
    return c.json({ error: 'Callback failed', details: error instanceof Error ? error.message : 'Unknown' }, 500);
  }
});

/**
 * GET /auth/session - Get current user session
 */
router.get('/session', async (c) => {
  try {
    const cookies = parseCookies(c.req.header('Cookie'));
    const sessionId = cookies.wolfesession;

    if (!sessionId) {
      return c.json({ loggedIn: false, user: null, roles: [] });
    }

    const session = await c.env.SESSIONS.get(`session:${sessionId}`, 'json') as SessionData | null;

    if (!session) {
      return c.json({ loggedIn: false, user: null, roles: [] });
    }

    return c.json({
      loggedIn: true,
      user: {
        id: session.userId,
        display: session.name || session.email,
        displayName: session.name || session.email,
        avatar: session.avatar,
        email: session.email,
      },
      roles: [],
    });
  } catch (error) {
    console.error('[SESSION] Error:', error);
    return c.json({ loggedIn: false, user: null, roles: [], error: error instanceof Error ? error.message : 'Unknown' });
  }
});

/**
 * POST /auth/logout - Clear session
 */
router.post('/logout', async (c) => {
  try {
    const cookies = parseCookies(c.req.header('Cookie'));
    const sessionId = cookies.wolfesession;

    if (sessionId) {
      await c.env.SESSIONS.delete(`session:${sessionId}`);
    }

    c.header('Set-Cookie', 'wolfesession=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Lax');
    return c.json({ success: true });
  } catch (error) {
    console.error('[LOGOUT] Error:', error);
    return c.json({ error: 'Logout failed' }, 500);
  }
});

/**
 * POST /auth/delete-account - Delete user account
 */
router.post('/delete-account', async (c) => {
  try {
    const cookies = parseCookies(c.req.header('Cookie'));
    const sessionId = cookies.wolfesession;

    if (!sessionId) {
      return c.json({ error: 'Not logged in' }, 401);
    }

    const session = await c.env.SESSIONS.get(`session:${sessionId}`, 'json') as SessionData | null;

    if (!session) {
      return c.json({ error: 'Invalid session' }, 401);
    }

    const userId = session.userId;

    // Delete from D1
    await c.env.DB.prepare('DELETE FROM user_points WHERE user_id = ?').bind(userId).run();
    await c.env.DB.prepare('DELETE FROM point_events WHERE user_id = ?').bind(userId).run();
    await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(userId).run();

    // Clear session
    await c.env.SESSIONS.delete(`session:${sessionId}`);
    c.header('Set-Cookie', 'wolfesession=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Lax');

    return c.json({ success: true });
  } catch (error) {
    console.error('[DELETE] Error:', error);
    return c.json({ error: 'Delete failed' }, 500);
  }
});

export default router;
