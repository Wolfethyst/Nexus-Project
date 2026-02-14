import { Hono } from 'hono';
import type { Env } from '../index.js';
import { isOwner } from '../lib.js';

const router = new Hono<Env>();

// GET /tts/cost - Return the current TTS cost
router.get('/cost', async (c) => {
  // Load TTS cost from KV (SESSIONS), fallback to 250
  let cost = 250;
  try {
    const stored = await c.env.SESSIONS.get('tts_cost');
    if (stored) cost = Number(stored) || 250;
  } catch (e) {
    console.error('Failed to load TTS cost from KV:', e);
  }
  return c.json({ cost });
});

// POST /tts/save - Update TTS settings (Owner only)
router.post('/save', async (c) => {
  const sessionId = c.req.header('Cookie')?.match(/wolfesession=([^;]+)/)?.[1];
  if (!sessionId) return c.json({ ok: false, error: 'Not logged in' }, 401);

  const session = await c.env.SESSIONS.get(`session:${sessionId}`, 'json') as any;
  if (!session?.nexusId || !(await isOwner(c.env, session.nexusId))) {
    return c.json({ ok: false, error: 'Unauthorized' }, 403);
  }

  const { cost } = await c.req.json() as { cost: number };
  if (typeof cost !== 'number' || cost < 0 || !Number.isFinite(cost)) {
    return c.json({ ok: false, error: 'Invalid cost value' }, 400);
  }
  try {
    await c.env.SESSIONS.put('tts_cost', String(cost));
  } catch (e) {
    console.error('Failed to save TTS cost to KV:', e);
    return c.json({ ok: false, error: 'Failed to save cost' }, 500);
  }
  return c.json({ ok: true, cost });
});

// POST /tts/send - Send a TTS message
router.post('/send', async (c) => {
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
  // Load TTS_COST from KV (SESSIONS), fallback to 250
  let TTS_COST = 250;
  try {
    const stored = await c.env.SESSIONS.get('tts_cost');
    if (stored) TTS_COST = Number(stored) || 250;
  } catch (e) {
    console.error('Failed to load TTS cost from KV:', e);
  }

  try {
    // Charge points using lib function
    const chargeResult = await import('../lib.js').then(m => m.chargePointsForRedeem(c.env, userId, TTS_COST));
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
