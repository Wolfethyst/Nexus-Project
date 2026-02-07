/**
 * Backend utility functions for Points, Users, and Database operations
 */

export const OWNER_UUID = 'wolfethyst';  // Set to your Twitch user ID or login
export const TALATHYST_UUID = 'REPLACE_WITH_TALATHYST_UUID';
export const INFINITE_POINTS = 999999999999;

// Points per message by platform
export const MESSAGE_POINTS = {
  twitch: 15,
  youtube: 15,
  nexus: 25,
};

/**
 * Get user's current points balance
 */
export async function getUserPoints(env: any, userId: string): Promise<number> {
  if (!userId) return 0;
  
  // Infinite points for owner
  if (userId === OWNER_UUID) return INFINITE_POINTS;

  try {
    const row = await env.DB.prepare(
      `SELECT balance_total FROM user_points WHERE user_id = ?`
    ).bind(userId).first();
    
    return row ? Number(row.balance_total) || 0 : 0;
  } catch (error) {
    console.error('Failed to get user points:', error);
    return 0;
  }
}

/**
 * Award points to a user with event logging
 */
export async function addPoints(
  env: any,
  userId: string,
  delta: number,
  options: {
    reason?: string;
    source?: string;
    isMessage?: boolean;
    isWatch?: boolean;
  } = {}
): Promise<{ balanceBefore: number; balanceAfter: number }> {
  if (!userId || !env.DB) return { balanceBefore: 0, balanceAfter: 0 };

  const now = Date.now();
  const amount = Number(delta) || 0;

  // Ensure user exists in database
  await ensureUserInD1(env, userId);

  // Infinite points for owner
  if (userId === OWNER_UUID) {
    if (amount !== 0) {
      await env.DB.prepare(`
        INSERT INTO point_events (user_id, delta, type, reason, source, created_at, balance_after)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(userId, amount, options.reason || 'adjust', options.reason, options.source, now, INFINITE_POINTS).run();
    }
    return { balanceBefore: INFINITE_POINTS, balanceAfter: INFINITE_POINTS };
  }

  try {
    // Get current balance
    const row = await env.DB.prepare(
      `SELECT balance_total FROM user_points WHERE user_id = ?`
    ).bind(userId).first();

    const before = row ? Number(row.balance_total) || 0 : 0;
    const after = Math.max(0, before + amount);

    // Determine event type
    let eventType = options.reason || (options.isMessage ? 'message' : 'adjust');
    if (['redeem', 'bonus', 'purchase', 'tip', 'subscription'].includes(eventType)) {
      // eventType is already correct
    }

    // Update balance
    await env.DB.prepare(`
      UPDATE user_points 
      SET balance_total = ?, messages_count = messages_count + ?, watch_minutes = watch_minutes + ?, updated_at = ? 
      WHERE user_id = ?
    `).bind(
      after,
      options.isMessage ? 1 : 0,
      options.isWatch ? 1 : 0,
      now,
      userId
    ).run();

    // Log event
    if (amount !== 0) {
      await env.DB.prepare(`
        INSERT INTO point_events (user_id, delta, type, reason, source, created_at, balance_after)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(userId, amount, eventType, options.reason, options.source, now, after).run();
    }

    return { balanceBefore: before, balanceAfter: after };
  } catch (error) {
    console.error('Failed to add points:', error);
    return { balanceBefore: 0, balanceAfter: 0 };
  }
}

/**
 * Set user's points to a specific amount
 */
export async function setPoints(
  env: any,
  userId: string,
  amount: number,
  options: { reason?: string } = {}
): Promise<{ balanceAfter: number }> {
  if (!userId || !env.DB) return { balanceAfter: 0 };

  const now = Date.now();
  const val = Math.max(0, Number(amount) || 0);

  try {
    await ensureUserInD1(env, userId);

    await env.DB.prepare(`
      UPDATE user_points SET balance_total = ?, updated_at = ? WHERE user_id = ?
    `).bind(val, now, userId).run();

    await env.DB.prepare(`
      INSERT INTO point_events (user_id, delta, type, reason, created_at, balance_after)
      VALUES (?, 0, 'set', ?, ?, ?)
    `).bind(userId, options.reason, now, val).run();

    return { balanceAfter: val };
  } catch (error) {
    console.error('Failed to set points:', error);
    return { balanceAfter: 0 };
  }
}

/**
 * Deduct points from user (for redeems)
 */
export async function chargePointsForRedeem(
  env: any,
  userId: string,
  cost: number
): Promise<{ ok: boolean; pointsAfter?: number; error?: string }> {
  if (!userId || !env.DB) return { ok: false, error: 'Invalid user' };

  try {
    const current = await getUserPoints(env, userId);

    if (current < cost) {
      return { ok: false, error: `Insufficient points. Need ${cost}, have ${current}` };
    }

    const result = await addPoints(env, userId, -cost, { reason: 'redeem' });
    return { ok: true, pointsAfter: result.balanceAfter };
  } catch (error) {
    console.error('Failed to charge points:', error);
    return { ok: false, error: 'Charge failed' };
  }
}

/**
 * Ensure user exists in D1 with default values
 */
export async function ensureUserInD1(
  env: any,
  userId: string,
  displayName: string = 'Adventurer',
  avatarUrl?: string
): Promise<{ nexusId: string }> {
  if (!userId || !env.DB) return { nexusId: '' };

  const now = Date.now();
  const nexusId = crypto.randomUUID();

  try {
    // Insert or update user with nexus_id generation on first insert
    await env.DB.prepare(`
      INSERT INTO users (id, nexus_id, display_name, avatar_url, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        display_name = CASE WHEN ? != 'Adventurer' THEN ? ELSE users.display_name END,
        avatar_url = COALESCE(?, users.avatar_url),
        updated_at = ?
    `).bind(userId, nexusId, displayName, avatarUrl, now, now, displayName, displayName, avatarUrl, now).run();

    // Insert or ignore user_points
    await env.DB.prepare(`
      INSERT INTO user_points (user_id, balance_total, messages_count, watch_minutes, updated_at)
      VALUES (?, 0, 0, 0, ?)
      ON CONFLICT(user_id) DO NOTHING
    `).bind(userId, now).run();

    return { nexusId };
  } catch (error) {
    console.error('Failed to ensure user in D1:', error);
    return { nexusId };
  }
}

/**
 * Get leaderboard data
 */
export async function getLeaderboard(
  env: any,
  limit: number = 50
): Promise<Array<{
  rank: number;
  id: string;
  displayName: string;
  avatar: string | null;
  points: number;
}>> {
  if (!env.DB) return [];

  try {
    const { results } = await env.DB.prepare(`
      SELECT 
        u.id, 
        u.display_name, 
        u.avatar_url, 
        COALESCE(up.balance_total, 0) as points
      FROM users u
      LEFT JOIN user_points up ON u.id = up.user_id
      WHERE u.display_name NOT IN ('Adventurer', 'Anonymous', 'Unknown', 'Talathyst', 'SYSTEM')
      ORDER BY points DESC
      LIMIT ?
    `).bind(limit).all() as any;

    return (results || []).map((row: any, index: number) => ({
      rank: index + 1,
      id: row.id,
      displayName: row.display_name || 'Unknown',
      avatar: row.avatar_url || null,
      points: Number(row.points) || 0,
    }));
  } catch (error) {
    console.error('Failed to get leaderboard:', error);
    return [];
  }
}

/**
 * Get user stats for owner panel
 */
export async function getOwnerStats(env: any): Promise<{
  vods: number;
  clips: number;
  users: number;
  topUser?: { displayName: string; points: number };
}> {
  if (!env.DB) return { vods: 0, clips: 0, users: 0 };

  try {
    const [vodRow, clipRow, userRow, topRow] = await Promise.all([
      env.DB.prepare(`SELECT COUNT(*) as count FROM streams WHERE vod_provider = 'youtube'`).first(),
      env.DB.prepare(`SELECT COUNT(*) as count FROM streams WHERE vod_provider = 'bunny'`).first(),
      env.DB.prepare(`SELECT COUNT(*) as count FROM users`).first(),
      env.DB.prepare(`SELECT u.display_name, up.balance_total as points FROM users u LEFT JOIN user_points up ON u.id = up.user_id ORDER BY points DESC LIMIT 1`).first(),
    ]);

    return {
      vods: Number(vodRow?.count) || 0,
      clips: Number(clipRow?.count) || 0,
      users: Number(userRow?.count) || 0,
      topUser: topRow ? {
        displayName: topRow.display_name || 'Unknown',
        points: Number(topRow.points) || 0,
      } : undefined,
    };
  } catch (error) {
    console.error('Failed to get owner stats:', error);
    return { vods: 0, clips: 0, users: 0 };
  }
}
