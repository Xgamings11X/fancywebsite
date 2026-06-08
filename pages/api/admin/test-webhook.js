/**
 * /api/admin/test-webhook — Test kirim Discord webhook TX secara manual
 * Berguna untuk verifikasi DISCORD_WEBHOOK_TX sudah benar
 */
import { webhookTransaction } from '../../../lib/discord.js';
import { verifyToken }        from '../../../lib/auth.js';
import { parse }              from 'cookie';

function auth(req) {
  const t = parse(req.headers.cookie||'').admin_token || req.headers.authorization?.replace('Bearer ','');
  return verifyToken(t)?.type === 'admin';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!auth(req)) return res.status(401).json({ error:'Unauthorized' });

  const webhookUrl = process.env.DISCORD_WEBHOOK_TX;

  if (!webhookUrl) {
    return res.status(400).json({
      success: false,
      message: 'DISCORD_WEBHOOK_TX belum di-set di environment variables',
    });
  }

  try {
    await webhookTransaction({
      order_id:        'TEST-' + Date.now(),
      player_username: 'TestPlayer',
      discord_username:'TestDiscord',
      product_name:    'Test Produk — VIP',
      reward_trigger:  'rank_vip',
      amount:          50000,
      discount_amount: 0,
      payment_status:  'success',
      payment_method:  'qris',
    });

    return res.json({
      success: true,
      message: `Test webhook berhasil dikirim ke ${webhookUrl.slice(0, 40)}...`,
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: 'Gagal kirim webhook: ' + e.message,
    });
  }
}
