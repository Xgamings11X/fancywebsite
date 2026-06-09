/**
 * /api/admin/test-plugin — Test koneksi & kirim transaksi ke plugin Minecraft
 *
 * POST body:
 *   { action: "ping" }                          → cek koneksi
 *   { action: "transaction", orderId: "..." }   → kirim ulang transaksi spesifik
 *   { action: "manual", player_name, player_uuid, product_id } → kirim manual
 */
import { pingPlugin, notifyTransaction } from '../../../lib/plugin.js';
import { OrdersAsync }                   from '../../../lib/redis.js';
import { verifyToken }                   from '../../../lib/auth.js';
import { parse }                         from 'cookie';

function auth(req) {
  const t = parse(req.headers.cookie || '').admin_token
    || req.headers.authorization?.replace('Bearer ', '');
  return verifyToken(t)?.type === 'admin';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!auth(req)) return res.status(401).json({ error: 'Unauthorized' });

  const { action, orderId, player_name, player_uuid, product_id } = req.body || {};

  const pluginUrl  = process.env.PLUGIN_HTTP_URL || '(tidak diset)';
  const serverKey  = process.env.PLUGIN_SERVER_KEY || '(tidak diset)';
  const keyPreview = serverKey !== '(tidak diset)' ? serverKey.slice(0, 4) + '****' : '(tidak diset)';

  // ── PING ──────────────────────────────────────────────────────
  if (action === 'ping') {
    const r = await pingPlugin();
    return res.json({
      success: r.ok,
      config: { url: pluginUrl, key: keyPreview },
      response: r,
    });
  }

  // ── KIRIM ULANG ORDER DARI DB ─────────────────────────────────
  if (action === 'transaction') {
    if (!orderId) return res.status(400).json({ success: false, message: 'orderId wajib diisi' });
    const order = await OrdersAsync.byId(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order tidak ditemukan' });

    const payload = {
      transaction_id: order.order_id,
      player_name:    order.player_username,
      player_uuid:    order.player_uuid || '',
      product_id:     order.reward_trigger || String(order.product_id),
      amount:         order.amount,
      status:         'success',
      timestamp:      new Date().toISOString(),
    };

    console.log('[test-plugin] Mengirim payload:', payload);
    const r = await notifyTransaction(payload);

    await OrdersAsync.update(orderId, {
      plugin_notified: r.ok,
      plugin_queued:   r.queued || false,
      plugin_response: JSON.stringify(r),
    });

    return res.json({
      success:  r.ok,
      payload,
      response: r,
      config:   { url: pluginUrl, key: keyPreview },
    });
  }

  // ── KIRIM MANUAL (untuk test produk tertentu) ─────────────────
  if (action === 'manual') {
    if (!player_name || !product_id) {
      return res.status(400).json({ success: false, message: 'player_name dan product_id wajib diisi' });
    }
    const payload = {
      transaction_id: `TEST-${Date.now()}`,
      player_name,
      player_uuid:    player_uuid || '',
      product_id,
      amount:         0,
      status:         'success',
      timestamp:      new Date().toISOString(),
    };

    console.log('[test-plugin] Manual payload:', payload);
    const r = await notifyTransaction(payload);

    return res.json({
      success:  r.ok,
      payload,
      response: r,
      config:   { url: pluginUrl, key: keyPreview },
    });
  }

  return res.status(400).json({ success: false, message: 'action tidak valid. Gunakan: ping | transaction | manual' });
}
