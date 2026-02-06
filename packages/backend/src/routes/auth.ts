import { Hono } from 'hono';
import type { Env } from '../index.js';
import { ensureUserInD1 } from '../lib.js';

const router = new Hono<Env>();

/**
 * GET /auth/session - Get current session from LogTo Protected App headers
 * LogTo injects: X-Logto-User-Id, X-Logto-User-Email, X-Logto-User-Name, X-Logto-User-Picture, etc.
 */
router.get('/session', async (c) => {
  try {
    const userId = c.req.header('X-Logto-User-Id');
    const userEmail = c.req.header('X-Logto-User-Email');
    const userName = c.req.header('X-Logto-User-Name');
    const userAvatar = c.req.header('X-Logto-User-Picture');

    if (!userId) {
      return c.json({ loggedIn: false, roles: [] });
    }

    // Ensure user exists in D1
    await ensureUserInD1(
      c.env,
      userId,
      userName || userEmail || 'User',
      userAvatar
    );

    return c.json({
      loggedIn: true,
      user: {
        id: userId,
        display: userName || userEmail,
        displayName: userName || userEmail,
        avatar: userAvatar,
        email: userEmail,
      },
      roles: [], // TODO: Load roles from D1 if needed
    });
  } catch (error) {
    console.error('Session error:', error);
    return c.json({ loggedIn: false, roles: [] });
  }
});

/**
 * POST /auth/logout - Logout (redirect to LogTo logout)
 * LogTo Protected App handles actual logout
 */
router.post('/logout', async (c) => {
  // LogTo handles session deletion
  // Just return success - UI should redirect to LogTo logout URL
  return c.json({ ok: true });
});

/**
 * POST /auth/delete-account - Delete user account
 */
router.post('/delete-account', async (c) => {
  try {
    const userId = c.req.header('X-Logto-User-Id');

    if (!userId) {
      return c.json({ error: 'Not logged in' }, 401);
    }

    // Delete from D1
    await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(userId).run();
    await c.env.DB.prepare('DELETE FROM user_points WHERE user_id = ?')
      .bind(userId)
      .run();
    await c.env.DB.prepare('DELETE FROM point_events WHERE user_id = ?')
      .bind(userId)
      .run();

    return c.json({ ok: true });
  } catch (error) {
    console.error('Delete account error:', error);
    return c.json({ error: 'Failed to delete account' }, 500);
  }
});

export default router;
