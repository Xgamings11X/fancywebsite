/**
 * /api/admin/check-order?orderId=FN-xxx
 * Cek status transaksi langsung ke Midtrans API (berguna untuk debug sandbox)
 */
import { getTransactionStatus } from '../../../lib/midtrans.js';
import { OrdersAsync }           from '../../../lib/redis.js';
import { verifyToken }           from '../../../lib/auth.js';
import { parse }                 from 'cookie';

function auth(req) {
  const t = parse(req.headers.cookie||'').admin_token || req.headers.authorization?.replace('Bearer ','');
  return verifyToken(t)?.type === 'admin';
}

export default async function handler(req, res) {
  if (!auth(req)) return res.status(401).json({ error:'Unauthorized' });
  const { orderId } = req.query;
  if (!orderId) return res.status(400).json({ error:'orderId diperlukan' });
  try {
    const [midtransStatus, order] = await Promise.all([
      getTransactionStatus(orderId),
      OrdersAsync.byId(orderId),
    ]);
    return res.json({ success:true, midtrans: midtransStatus, local: order });
  } catch(e) {
    return res.status(500).json({ success:false, message:e.message });
  }
}
