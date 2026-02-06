import { Hono } from 'hono';
import type { Env } from '../index.js';
import { ensureUserInD1 } from '../lib.js';

const router = new Hono<Env>();

interface LogToUserInfo {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
  email_verified?: boolean;
  aud?: string;
}

interface LogToTokenResponse {
  access_token: string;
  refresh_token?: string;
  id_token: string;
  token_type: string;
  expires_in: number;
}

interface SessionData {
  userId: string;
  userEmail?: string;
  userName?: string;
  userAvatar?: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

/**
 * Helper: Parse cookies from request
 */
function parseCookies(cookieHeader?: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;

  cookieHeader.split(';').forEach((cookie) => {
    const [key, value] = cookie.trim().split('=');
    if (key && value) {
      cookies[key] = decodeURIComponent(value);
    }
  });

  return cookies;
}

/**
 * Helper: Set cookie header
 */
function setCookieHeader(
  name: string,
  value: string,
  options?: {
    maxAge?: number;
    secure?: boolean;
    httpOnly?: boolean;
    sameSite?: 'Strict' | 'Lax' | 'None';
    path?: string;
  }
): string {
  let cookie = `${name}=${encodeURIComponent(value)}`;

  if (options?.maxAge) {
    cookie += `; Max-Age=${options.maxAge}`;
  }
  if (options?.secure) {
    cookie += '; Secure';
  }
  if (options?.httpOnly) {
    cookie += '; HttpOnly';
  }
  if (options?.sameSite) {
    cookie += `; SameSite=${options.sameSite}`;
  }
  if (options?.path) {
    cookie += `; Path=${options.path}`;
  }

  return cookie;
}

/**
 * Helper: Get LogTo userinfo
 */
async function getLogToUserInfo(
  endpoint: string,
  accessToken: string
): Promise<LogToUserInfo | null> {
  try {
    const response = await fetch(`${endpoint}/oauth/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      console.error('Failed to get LogTo userinfo:', response.status);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('LogTo userinfo error:', error);
    return null;
  }
}

/**
 * GET /auth/logto/login - Initiate LogTo OIDC flow
 */
router.get('/logto/login', async (c) => {
  const endpoint = c.env.LOGTO_ENDPOINT;
  const clientId = c.env.LOGTO_CLIENT_ID;

  // Generate state and nonce for OIDC
  const state = crypto.randomUUID();
  const nonce = crypto.randomUUID();

  // Store state/nonce in KV temporarily (5 min expiry)
  const stateKey = `logto:state:${state}`;
  await c.env.SESSIONS.put(stateKey, JSON.stringify({ nonce }), {
    expirationTtl: 300,
  });

  const redirectUri = `${new URL(c.req.url).origin}/auth/logto/callback`;

  const authUrl = new URL(`${endpoint}/oidc/authorization`);
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid profile email');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('nonce', nonce);

  return c.redirect(authUrl.toString());
});

/**
 * GET /auth/logto/callback - Handle LogTo OIDC redirect
 */
router.get('/logto/callback', async (c) => {
  const code = c.req.query('code');
  const state = c.req.query('state');
  const error = c.req.query('error');

  if (error) {
    return c.json({ error: `LogTo error: ${error}` }, 400);
  }

  if (!code || !state) {
    return c.json({ error: 'Missing code or state' }, 400);
  }

  try {
    // Verify state exists in KV
    const stateData = await c.env.SESSIONS.get(`logto:state:${state}`, 'json');
    if (!stateData) {
      return c.json({ error: 'Invalid state' }, 400);
    }

    const endpoint = c.env.LOGTO_ENDPOINT;
    const clientId = c.env.LOGTO_CLIENT_ID;
    const clientSecret = c.env.LOGTO_CLIENT_SECRET;
    const redirectUri = `${new URL(c.req.url).origin}/auth/logto/callback`;

    // Exchange code for tokens
    const tokenResponse = await fetch(`${endpoint}/oidc/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code,
      }).toString(),
    });

    if (!tokenResponse.ok) {
      console.error('LogTo token exchange failed:', tokenResponse.status);
      return c.json({ error: 'Token exchange failed' }, 500);
    }

    const tokenData: LogToTokenResponse = await tokenResponse.json();

    // Get user info
    const userInfo = await getLogToUserInfo(endpoint, tokenData.access_token);
    if (!userInfo) {
      return c.json({ error: 'Failed to get user info' }, 500);
    }

    // Create/update user in D1
    await ensureUserInD1(
      c.env,
      userInfo.sub,
      userInfo.name || userInfo.email || 'User',
      userInfo.picture
    );

    // Create session
    const sessionId = crypto.randomUUID();
    const sessionData: SessionData = {
      userId: userInfo.sub,
      userEmail: userInfo.email,
      userName: userInfo.name,
      userAvatar: userInfo.picture,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: Date.now() + tokenData.expires_in * 1000,
    };

    // Store session in KV
    await c.env.SESSIONS.put(
      `session:${sessionId}`,
      JSON.stringify(sessionData),
      {
        expirationTtl: Math.min(tokenData.expires_in, 604800), // Max 7 days
      }
    );

    // Set session cookie
    c.header('Set-Cookie', setCookieHeader('wolfesession', sessionId, {
      maxAge: Math.min(tokenData.expires_in, 604800),
      secure: true,
      httpOnly: true,
      sameSite: 'Lax',
      path: '/',
    }));

    // Redirect to home or return success
    return c.redirect('/');
  } catch (error) {
    console.error('LogTo callback error:', error);
    return c.json({
      error: 'Authentication failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * GET /auth/session - Get current session and user info
 */
router.get('/session', async (c) => {
  try {
    const cookieHeader = c.req.header('Cookie');
    const cookies = parseCookies(cookieHeader);
    const sessionId = cookies.wolfesession;

    if (!sessionId) {
      return c.json({ loggedIn: false, roles: [] });
    }

    const sessionData = await c.env.SESSIONS.get(
      `session:${sessionId}`,
      'json'
    ) as SessionData | null;

    if (!sessionData) {
      c.header('Set-Cookie', setCookieHeader('wolfesession', '', {
        maxAge: 0,
        path: '/',
      }));
      return c.json({ loggedIn: false, roles: [] });
    }

    // Check if token is expired
    if (sessionData.expiresAt < Date.now()) {
      // Try to refresh if we have refresh token
      if (sessionData.refreshToken) {
        // TODO: Implement token refresh
      }
      c.header('Set-Cookie', setCookieHeader('wolfesession', '', {
        maxAge: 0,
        path: '/',
      }));
      return c.json({ loggedIn: false, roles: [] });
    }

    return c.json({
      loggedIn: true,
      user: {
        id: sessionData.userId,
        display: sessionData.userName || sessionData.userEmail,
        displayName: sessionData.userName || sessionData.userEmail,
        avatar: sessionData.userAvatar,
        email: sessionData.userEmail,
      },
      roles: [], // TODO: Load roles from DB
    });
  } catch (error) {
    console.error('Session error:', error);
    return c.json({ loggedIn: false, roles: [] });
  }
});

/**
 * POST /auth/logout
 */
router.post('/logout', async (c) => {
  const cookieHeader = c.req.header('Cookie');
  const cookies = parseCookies(cookieHeader);
  const sessionId = cookies.wolfesession;

  if (sessionId) {
    await c.env.SESSIONS.delete(`session:${sessionId}`);
  }

  c.header('Set-Cookie', setCookieHeader('wolfesession', '', {
    maxAge: 0,
    path: '/',
  }));

  return c.json({ ok: true });
});

/**
 * POST /auth/delete-account
 */
router.post('/delete-account', async (c) => {
  try {
    const cookieHeader = c.req.header('Cookie');
    const cookies = parseCookies(cookieHeader);
    const sessionId = cookies.wolfesession;

    if (!sessionId) {
      return c.json({ error: 'Not logged in' }, 401);
    }

    const sessionData = await c.env.SESSIONS.get(
      `session:${sessionId}`,
      'json'
    ) as SessionData | null;

    if (!sessionData) {
      return c.json({ error: 'Invalid session' }, 401);
    }

    const userId = sessionData.userId;

    // Delete from D1
    await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(userId).run();
    await c.env.DB.prepare('DELETE FROM user_points WHERE user_id = ?')
      .bind(userId)
      .run();
    await c.env.DB.prepare('DELETE FROM point_events WHERE user_id = ?')
      .bind(userId)
      .run();

    // Delete session
    await c.env.SESSIONS.delete(`session:${sessionId}`);
    c.header('Set-Cookie', setCookieHeader('wolfesession', '', {
      maxAge: 0,
      path: '/',
    }));

    return c.json({ ok: true });
  } catch (error) {
    console.error('Delete account error:', error);
    return c.json({ error: 'Failed to delete account' }, 500);
  }
});

export default router;
