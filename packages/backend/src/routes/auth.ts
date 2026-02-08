/**
 * POST /admin/reset - Purge all KV keys, drop/recreate D1 tables, and sign out current session (owner only)
 */
router.post('/admin/reset', async (c) => {
  try {
    const cookies = parseCookies(c.req.header('Cookie'));
    const sessionId = cookies.wolfesession;
    const session = sessionId ? await c.env.SESSIONS.get(`session:${sessionId}`, 'json') : null;
    // Only allow owner
    if (!session || !(session.nexusId && await isOwner(c.env, session.nexusId))) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    // Purge all keys in KV namespaces
    const kvNamespaces = [c.env.POINTS, c.env.SESSIONS, c.env.ASSETS, c.env.MODERATION, c.env.CLIPS];
    for (const kv of kvNamespaces) {
      const list = await kv.list();
      for (const item of list.keys) {
        await kv.delete(item.name);
      }
    }

    // Drop and recreate D1 tables
    const dropStatements = [
      'DROP TABLE IF EXISTS users',
      'DROP TABLE IF EXISTS user_points',
      'DROP TABLE IF EXISTS store_items',
      'DROP TABLE IF EXISTS redeems',
      'DROP TABLE IF EXISTS redeem_log',
      'DROP TABLE IF EXISTS nexus_meta'
    ];
    for (const stmt of dropStatements) {
      try { await c.env.DB.prepare(stmt).run(); } catch (e) {}
    }
    // Recreate tables (reuse ensureDatabaseTables logic if available)
    await c.env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        display_name TEXT,
        avatar_url TEXT,
        created_at INTEGER,
        updated_at INTEGER
      )
    `).run();
    await c.env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS user_points (
        user_id TEXT PRIMARY KEY,
        balance_total INTEGER
      )
    `).run();
    await c.env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS store_items (
        id TEXT PRIMARY KEY,
        name TEXT,
        description TEXT,
        cost INTEGER,
        type TEXT,
        sound_key TEXT,
        image_key TEXT,
        active INTEGER DEFAULT 1
      )
    `).run();
    await c.env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS redeems (
        id TEXT PRIMARY KEY,
        name TEXT,
        description TEXT,
        cost INTEGER,
        sound_file TEXT,
        enabled INTEGER DEFAULT 1,
        cooldown_seconds INTEGER DEFAULT 0
      )
    `).run();
    await c.env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS redeem_log (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        redeem_id TEXT,
        cost INTEGER,
        created_at INTEGER
      )
    `).run();
    await c.env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS nexus_meta (
        uuid TEXT PRIMARY KEY,
        platform TEXT,
        displayName TEXT,
        points INTEGER,
        inventory TEXT,
        avatarDecoration TEXT,
        activeMessageDecoration TEXT
      )
    `).run();

    // Sign out current session
    if (sessionId) {
      await c.env.SESSIONS.delete(`session:${sessionId}`);
      c.header('Set-Cookie', 'wolfesession=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Lax');
    }

    return c.json({ success: true });
  } catch (error) {
    console.error('[ADMIN RESET] Error:', error);
    return c.json({ error: 'Reset failed', details: error instanceof Error ? error.message : 'Unknown' }, 500);
  }
});
import { Hono } from 'hono';
import type { Env } from '../index.js';
import { ensureUserInD1, getOwnerNexusId, setOwnerNexusId, isOwner } from '../lib.js';

const router = new Hono<Env>();

interface SessionData {
  userId: string;
  nexusId?: string;
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
  return `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; Domain=.wolfethyst.tv; Secure; HttpOnly; SameSite=Lax`;
}

/**
 * GET /auth/twitch/login - Start Twitch OAuth
 */
router.get('/twitch/login', async (c) => {
  const clientId = c.env.TWITCH_CLIENT_ID;
  
  if (!clientId) {
    return c.json({ error: 'Twitch not configured' }, 500);
  }

  const state = crypto.randomUUID();
  await c.env.SESSIONS.put(`state:${state}`, JSON.stringify({ provider: 'twitch' }), {
    expirationTtl: 300,
  });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: 'https://api.wolfethyst.tv/auth/twitch/callback',
    response_type: 'code',
    scope: 'user:read:email',
    state,
  });

  return c.redirect(`https://id.twitch.tv/oauth2/authorize?${params.toString()}`);
});

/**
 * GET /auth/twitch/callback - Handle Twitch OAuth callback
 */
router.get('/twitch/callback', async (c) => {
  const code = c.req.query('code');
  const state = c.req.query('state');
  const error = c.req.query('error');

  if (error || !code || !state) {
    return c.json({ error: 'Auth failed' }, 400);
  }

  const savedState = await c.env.SESSIONS.get(`state:${state}`, 'json');
  if (!savedState) {
    return c.json({ error: 'Invalid state' }, 400);
  }

  const clientId = c.env.TWITCH_CLIENT_ID;
  const clientSecret = c.env.TWITCH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return c.json({ error: 'Twitch not configured' }, 500);
  }

  // Exchange code for token
  const tokenRes = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: 'https://api.wolfethyst.tv/auth/twitch/callback',
    }).toString(),
  });

  if (!tokenRes.ok) {
    return c.json({ error: 'Token exchange failed' }, 500);
  }

  const tokens = await tokenRes.json() as { access_token: string; expires_in: number };

  // Get user info
  const userRes = await fetch('https://api.twitch.tv/helix/users', {
    headers: {
      'Authorization': `Bearer ${tokens.access_token}`,
      'Client-Id': clientId,
    },
  });

  if (!userRes.ok) {
    return c.json({ error: 'Failed to get user' }, 500);
  }

  const userData = await userRes.json() as { data: Array<{ id: string; login: string; display_name: string; profile_image_url: string }> };
  const user = userData.data[0];

  if (!user) {
    return c.json({ error: 'No user data' }, 500);
  }

  // Save to D1 and get Nexus ID
  let { nexusId } = await ensureUserInD1(c.env, user.id, user.display_name, user.profile_image_url);

  // If this is Wolfethyst, always set owner UUID
  // Replace 'wolfethyst_twitch_id' with your actual Twitch user ID
  if (user.id === 'wolfethyst_twitch_id') {
    nexusId = '7fea3331-7c36-49ac-975b-58de25ecf6ba';
    // Update D1
    await c.env.DB.prepare('UPDATE users SET nexus_id = ? WHERE id = ?').bind(nexusId, user.id).run();
  }

  // If no owner is set yet, make this the first signer the owner
  const currentOwnerNexusId = await getOwnerNexusId(c.env);
  if (!currentOwnerNexusId) {
    await setOwnerNexusId(c.env, nexusId);
  }

  // Create session
  const sessionId = crypto.randomUUID();
  const sessionData: SessionData = {
    userId: user.id,
    nexusId,
    name: user.display_name,
    avatar: user.profile_image_url,
    accessToken: tokens.access_token,
    expiresAt: Date.now() + tokens.expires_in * 1000,
  };

  await c.env.SESSIONS.put(`session:${sessionId}`, JSON.stringify(sessionData), {
    expirationTtl: Math.min(tokens.expires_in, 604800),
  });

  c.header('Set-Cookie', setCookieHeader('wolfesession', sessionId, Math.min(tokens.expires_in, 604800)));
  return c.redirect('https://nexus.wolfethyst.tv');
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

    // Determine user roles
    const roles: string[] = [];
    if (session.nexusId && await isOwner(c.env, session.nexusId)) {
      roles.push('owner');
    }

    // Try to get user data from D1 for nexusId if not in session
    let nexusId = session.nexusId;
    if (!nexusId && c.env.DB) {
      try {
        const userRow = await c.env.DB.prepare('SELECT nexus_id FROM users WHERE id = ?').bind(session.userId).first();
        if (userRow?.nexus_id) {
          nexusId = userRow.nexus_id as string;
        }
      } catch (error) {
        console.error('Failed to fetch nexus_id from D1:', error);
      }
    }

    return c.json({
      loggedIn: true,
      user: {
        id: session.userId,
        nexusId,
        display: session.name || session.email,
        displayName: session.name || session.email,
        avatar: session.avatar,
        email: session.email,
      },
      roles,
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
