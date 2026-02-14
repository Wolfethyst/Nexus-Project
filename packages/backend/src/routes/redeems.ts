
import { Hono } from 'hono';
import type { Env } from '../index.js';
import { chargePointsForRedeem, isOwner } from '../lib.js';

const router = new Hono<Env>();

// GET /redeems/tts-cost - Return the current TTS cost
router.get('/tts-cost', async (c) => {
  // Keep in sync with POST /redeems/tts
  const TTS_COST = 250;
  return c.json({ cost: TTS_COST });
});

// GET /redeems/list - List available redeems
router.get('/list', async (c) => {
  try {
    const result = await c.env.DB.prepare(`
      SELECT id, name, description, cost, icon, sound_file, cooldown_seconds, enabled
      FROM redeems 
      WHERE enabled = 1 
      ORDER BY sort_order ASC, cost ASC
    `).all();
    
    return c.json({ ok: true, redeems: result.results || [] });
  } catch (error: any) {
    console.error('Redeems list error:', error);
    return c.json({ ok: false, error: 'Failed to fetch redeems' }, 500);
  }
});

// POST /redeems/save - Create or update a redeem (Owner only)
router.post('/save', async (c) => {
  const sessionId = c.req.header('Cookie')?.match(/wolfesession=([^;]+)/)?.[1];
  if (!sessionId) return c.json({ ok: false, error: 'Not logged in' }, 401);

  const session = await c.env.SESSIONS.get(`session:${sessionId}`, 'json') as any;
  if (!session?.nexusId || !(await isOwner(c.env, session.nexusId))) {
    return c.json({ ok: false, error: 'Unauthorized' }, 403);
  }

  try {
    const { redeem } = await c.req.json() as { redeem: any };
    if (!redeem.name || !redeem.cost) {
      return c.json({ ok: false, error: 'Missing required fields' }, 400);
    }

    const id = redeem.id || crypto.randomUUID();

    await c.env.DB.prepare(`
      INSERT INTO redeems (id, name, description, cost, sound_file, cooldown_seconds, enabled)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        description = excluded.description,
        cost = excluded.cost,
        sound_file = excluded.sound_file,
        cooldown_seconds = excluded.cooldown_seconds,
        enabled = excluded.enabled
    `).bind(
      id,
      redeem.name,
      redeem.description || '',
      redeem.cost,
      redeem.soundFile || null,
      redeem.cooldownSeconds || 0,
      redeem.enabled !== false ? 1 : 0
    ).run();

    return c.json({ ok: true, id });
  } catch (error: any) {
    console.error('Redeem save error:', error);
    return c.json({ ok: false, error: error.message }, 500);
  }
});

// POST /redeems/delete - Delete a redeem (Owner only)
router.post('/delete', async (c) => {
  const sessionId = c.req.header('Cookie')?.match(/wolfesession=([^;]+)/)?.[1];
  if (!sessionId) return c.json({ ok: false, error: 'Not logged in' }, 401);

  const session = await c.env.SESSIONS.get(`session:${sessionId}`, 'json') as any;
  if (!session?.nexusId || !(await isOwner(c.env, session.nexusId))) {
    return c.json({ ok: false, error: 'Unauthorized' }, 403);
  }

  const { id } = await c.req.json() as { id: string };
  await c.env.DB.prepare('DELETE FROM redeems WHERE id = ?').bind(id).run();
  return c.json({ ok: true });
});

// POST /redeems/redeem - Redeem an item
router.post('/redeem', async (c) => {
  const { redeemId } = await c.req.json() as { redeemId: string };
  
  // Get session
  const sessionId = c.req.header('Cookie')?.match(/wolfesession=([^;]+)/)?.[1];
  if (!sessionId) {
    return c.json({ ok: false, error: 'Not logged in' }, 401);
  }
  
  const session = await c.env.SESSIONS.get(`session:${sessionId}`, 'json') as any;
  if (!session?.userId) {
    return c.json({ ok: false, error: 'Invalid session' }, 401);
  }
  
  const userId = session.userId;
  
  try {
    // Get redeem details
    const redeem = await c.env.DB.prepare('SELECT * FROM redeems WHERE id = ? AND enabled = 1')
      .bind(redeemId).first() as any;
    
    if (!redeem) {
      return c.json({ ok: false, error: 'Redeem not found' }, 404);
    }
    
    // Check cooldown
    const cooldownKey = `cooldown:${userId}:${redeemId}`;
    const lastRedeem = await c.env.MODERATION.get(cooldownKey);
    
    if (lastRedeem && redeem.cooldown_seconds > 0) {
      const elapsed = Date.now() - parseInt(lastRedeem);
      const remaining = (redeem.cooldown_seconds * 1000) - elapsed;
      
      if (remaining > 0) {
        return c.json({ 
          ok: false, 
          error: 'On cooldown', 
          cooldownRemaining: Math.ceil(remaining / 1000)
        }, 429);
      }
    }
    
    // Deduct points using lib function
    const chargeResult = await chargePointsForRedeem(c.env, userId, redeem.cost);
    
    if (!chargeResult.ok) {
      return c.json({ ok: false, error: chargeResult.error }, 400);
    }
    
    // Set cooldown
    if (redeem.cooldown_seconds > 0) {
      await c.env.MODERATION.put(cooldownKey, Date.now().toString(), {
        expirationTtl: redeem.cooldown_seconds
      });
    }
    
    // Log redemption
    const redeemLogId = crypto.randomUUID().replace(/-/g, '');
    await c.env.DB.prepare(`
      INSERT INTO redeem_log (id, user_id, redeem_id, cost, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(redeemLogId, userId, redeemId, redeem.cost, Date.now()).run();
    
    // Return success with sound file if exists
    return c.json({
      ok: true,
      soundFile: redeem.sound_file,
      remainingPoints: chargeResult.pointsAfter
    });
    
  } catch (error: any) {
    console.error('Redeem error:', error);
    return c.json({ ok: false, error: 'Failed to process redeem' }, 500);
  }
});

// POST /redeems/tts - Redeem TTS
router.post('/tts', async (c) => {
  const { message } = await c.req.json() as { message: string };
  
  if (!message || message.length === 0 || message.length > 150) {
    return c.json({ ok: false, error: 'Invalid message length' }, 400);
  }
  
  // Get session
  const sessionId = c.req.header('Cookie')?.match(/wolfesession=([^;]+)/)?.[1];
  if (!sessionId) {
    return c.json({ ok: false, error: 'Not logged in' }, 401);
  }
  
  const session = await c.env.SESSIONS.get(`session:${sessionId}`, 'json') as any;
  if (!session?.userId) {
    return c.json({ ok: false, error: 'Invalid session' }, 401);
  }
  
  const userId = session.userId;
  const TTS_COST = 250;
  
  try {
    // Charge points using lib function
    const chargeResult = await chargePointsForRedeem(c.env, userId, TTS_COST);
    
    if (!chargeResult.ok) {
      return c.json({ ok: false, error: chargeResult.error }, 400);
    }
    
    // Forward TTS to ChatRoom Durable Object
    const id = c.env.CHAT_ROOM.idFromName('global');
    const stub = c.env.CHAT_ROOM.get(id);
    const ttsRes = await stub.fetch('https://do/tts', {
      method: 'POST',
      body: JSON.stringify({ text: message, user: session.name }),
    });

    if (!ttsRes.ok) {
      console.error(`TTS forwarding failed: ${ttsRes.status}`);
    }

    console.log(`TTS from ${session.name}: ${message}`);
    
    return c.json({
      ok: true,
      remainingPoints: chargeResult.pointsAfter
    });
    
  } catch (error: any) {
    console.error('TTS error:', error);
    return c.json({ ok: false, error: 'Failed to process TTS' }, 500);
  }
});

export default router;
