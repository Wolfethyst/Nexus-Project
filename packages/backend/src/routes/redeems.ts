import { Hono } from 'hono';
import type { Env } from '../index.js';
import { chargePointsForRedeem, addPoints } from '../lib.js';

const router = new Hono<Env>();

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

// POST /redeems/redeem - Redeem an item
router.post('/redeem', async (c) => {
  const { redeemId } = await c.req.json() as { redeemId: string };
  
  // Get session
  const sessionId = c.req.header('Cookie')?.match(/wolfesession=([^;]+)/)?.[1];
  if (!sessionId) {
    return c.json({ ok: false, error: 'Not logged in' }, 401);
  }
  
  const session = await c.env.SESSIONS.get(`session:${sessionId}`, 'json') as any;
  if (!session?.user?.id) {
    return c.json({ ok: false, error: 'Invalid session' }, 401);
  }
  
  const userId = session.user.id;
  
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
  if (!session?.user?.id) {
    return c.json({ ok: false, error: 'Invalid session' }, 401);
  }
  
  const userId = session.user.id;
  const TTS_COST = 250;
  
  try {
    // Charge points using lib function
    const chargeResult = await chargePointsForRedeem(c.env, userId, TTS_COST);
    
    if (!chargeResult.ok) {
      return c.json({ ok: false, error: chargeResult.error }, 400);
    }
    
    // TODO: Queue TTS message for processing
    // For now, just log it
    console.log(`TTS from ${session.user.displayName}: ${message}`);
    
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
