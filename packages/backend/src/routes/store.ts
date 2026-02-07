import { Hono } from 'hono';
import type { Env } from '../index.js';
import { getUserPoints, addPoints, isOwner } from '../lib.js';

const router = new Hono<Env>();

interface StoreItem {
  id: string;
  name: string;
  description?: string;
  cost: number;
  type: 'item' | 'redeem';
  soundKey?: string;
  imageKey?: string;
  active: boolean;
}

interface RedeemRequest {
  id: string;
  name: string;
  cost: number;
  inputLabel?: string;
  soundKey?: string;
}

// Helper to get session from request
async function getSessionFromRequest(env: Env['Bindings'], request: Request): Promise<{ userId?: string; nexusId?: string } | null> {
  const cookies = (request.headers.get('Cookie') || '')
    .split(';')
    .reduce((acc: Record<string, string>, part) => {
      const [key, value] = part.split('=');
      if (key && value) acc[key.trim()] = decodeURIComponent(value);
      return acc;
    }, {});

  const sessionId = cookies.wolfesession;
  if (!sessionId) return null;

  const session = await env.SESSIONS.get(`session:${sessionId}`, 'json') as any;
  return session ? { userId: session.userId, nexusId: session.nexusId } : null;
}

/**
 * GET /store/list - Get all store items
 */
router.get('/list', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT id, name, description, cost, type, sound_key as soundKey, image_key as imageKey, active
      FROM store_items
      WHERE active = 1 AND type = 'item'
      ORDER BY cost ASC
    `).all() as { results: StoreItem[] };

    return c.json({ data: results || [] });
  } catch (error) {
    console.error('[STORE] List failed:', error);
    return c.json({ data: [] });
  }
});

/**
 * POST /store/save - Create or update store item (owner only)
 */
router.post('/save', async (c) => {
  const session = await getSessionFromRequest(c.env, c.req.raw);
  if (!session?.userId) {
    return c.json({ error: 'Not logged in' }, 401);
  }

  if (!await isOwner(c.env, session.nexusId || '')) {
    return c.json({ error: 'Owner only' }, 403);
  }

  try {
    const body = await c.req.json() as { item: Partial<StoreItem> };
    const { item } = body;

    if (!item?.name || !item?.cost) {
      return c.json({ error: 'Invalid data' }, 400);
    }

    const id = item.id || crypto.randomUUID();
    const now = new Date().getTime();

    await c.env.DB.prepare(`
      INSERT INTO store_items (id, name, description, cost, type, sound_key, image_key, active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        description = excluded.description,
        cost = excluded.cost,
        type = excluded.type,
        sound_key = excluded.sound_key,
        image_key = excluded.image_key,
        updated_at = excluded.updated_at
    `).bind(
      id,
      item.name,
      item.description || '',
      item.cost,
      item.type || 'item',
      item.soundKey || null,
      item.imageKey || null,
      now,
      now
    ).run();

    return c.json({ success: true, id });
  } catch (error) {
    console.error('[STORE] Save failed:', error);
    return c.json({ error: 'Failed to save item' }, 500);
  }
});

/**
 * POST /store/purchase - Purchase a store item
 */
router.post('/purchase', async (c) => {
  const session = await getSessionFromRequest(c.env, c.req.raw);
  if (!session?.userId) {
    return c.json({ error: 'Not logged in' }, 401);
  }

  try {
    const body = await c.req.json() as { itemId: string };
    const item = await c.env.DB.prepare(`
      SELECT * FROM store_items WHERE id = ?
    `).bind(body.itemId).first() as StoreItem;

    if (!item) {
      return c.json({ error: 'Item not found' }, 404);
    }

    // Get current points
    const userPoints = await getUserPoints(c.env, session.userId);
    if (userPoints < item.cost) {
      return c.json({ error: 'Insufficient points', pointsNeeded: item.cost, pointsHave: userPoints }, 400);
    }

    // Deduct points
    await addPoints(c.env, session.userId, -item.cost, {
      reason: 'purchase',
      source: 'store',
    });

    // Add to inventory
    const now = new Date().getTime();
    await c.env.DB.prepare(`
      INSERT INTO user_inventory (user_id, item_id, acquired_at)
      VALUES (?, ?, ?)
    `).bind(session.userId, body.itemId, now).run();

    const newPoints = await getUserPoints(c.env, session.userId);
    return c.json({ ok: true, pointsAfter: newPoints, item });
  } catch (error) {
    console.error('[STORE] Purchase failed:', error);
    return c.json({ error: 'Purchase failed' }, 500);
  }
});

/**
 * POST /store/equip - Equip an item from inventory
 */
router.post('/equip', async (c) => {
  const session = await getSessionFromRequest(c.env, c.req.raw);
  if (!session?.userId) {
    return c.json({ error: 'Not logged in' }, 401);
  }

  try {
    const body = await c.req.json() as { itemId: string };

    // Check if user owns the item
    const owned = await c.env.DB.prepare(`
      SELECT * FROM user_inventory WHERE user_id = ? AND item_id = ?
    `).bind(session.userId, body.itemId).first();

    if (!owned) {
      return c.json({ error: 'Item not owned' }, 403);
    }

    // Store equipped item
    await c.env.DB.prepare(`
      INSERT INTO user_equipped (user_id, item_type, item_id)
      VALUES (?, 'decoration', ?)
      ON CONFLICT(user_id, item_type) DO UPDATE SET item_id = excluded.item_id
    `).bind(session.userId, body.itemId).run();

    return c.json({ ok: true });
  } catch (error) {
    console.error('[STORE] Equip failed:', error);
    return c.json({ error: 'Equip failed' }, 500);
  }
});

/**
 * GET /store/inventory - Get user's owned items
 */
router.get('/inventory', async (c) => {
  const session = await getSessionFromRequest(c.env, c.req.raw);
  if (!session?.userId) {
    return c.json({ error: 'Not logged in' }, 401);
  }

  try {
    const { results } = await c.env.DB.prepare(`
      SELECT si.id, si.name, si.description, si.image_key as imageKey, si.cost,
             CASE WHEN ue.item_id IS NOT NULL THEN 1 ELSE 0 END as equipped
      FROM user_inventory ui
      JOIN store_items si ON ui.item_id = si.id
      LEFT JOIN user_equipped ue ON ue.user_id = ? AND ue.item_id = ui.item_id
      WHERE ui.user_id = ?
      ORDER BY ui.acquired_at DESC
    `).bind(session.userId, session.userId).all() as { results: any[] };

    return c.json({ inventory: results || [] });
  } catch (error) {
    console.error('[STORE] Inventory fetch failed:', error);
    return c.json({ inventory: [] });
  }
});

/**
 * GET /redeems/list or /nexus/redeems - Get available redeems
 */
router.get('/redeems', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT id, name, cost, description, sound_key as soundKey, image_key as imageKey
      FROM store_items
      WHERE active = 1 AND type = 'redeem'
      ORDER BY cost ASC
    `).all() as { results: RedeemRequest[] };

    return c.json({ redeems: results || [] });
  } catch (error) {
    console.error('[STORE] Redeems list failed:', error);
    return c.json({ redeems: [] });
  }
});

/**
 * POST /redeems/redeem or /nexus/redeems/redeem - Redeem an item
 */
router.post('/redeems/redeem', async (c) => {
  const session = await getSessionFromRequest(c.env, c.req.raw);
  if (!session?.userId) {
    return c.json({ error: 'Not logged in' }, 401);
  }

  try {
    const body = await c.req.json() as { id: string; input?: string };
    const redeem = await c.env.DB.prepare(`
      SELECT * FROM store_items WHERE id = ? AND type = 'redeem'
    `).bind(body.id).first() as any;

    if (!redeem) {
      return c.json({ error: 'Redeem not found' }, 404);
    }

    // Get current points
    const userPoints = await getUserPoints(c.env, session.userId);
    if (userPoints < redeem.cost) {
      return c.json({ error: 'Insufficient points' }, 400);
    }

    // Deduct points
    await addPoints(c.env, session.userId, -redeem.cost, {
      reason: 'redeem',
      source: 'redeem',
    });

    // Broadcast redeem event (for chat, alerts, etc)
    // TODO: Implement event broadcast for redeems

    const newPoints = await getUserPoints(c.env, session.userId);
    return c.json({
      ok: true,
      pointsAfter: newPoints,
      redeem: {
        id: redeem.id,
        name: redeem.name,
        soundKey: redeem.sound_key,
      },
    });
  } catch (error) {
    console.error('[STORE] Redeem failed:', error);
    return c.json({ error: 'Redeem failed' }, 500);
  }
});

export default router;
