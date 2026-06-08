import { Orders } from '../../../lib/storage.js';
import { verifyToken } from '../../../lib/auth.js';
import { notifyTransaction } from '../../../lib/plugin.js';
import { parse } from 'cookie';

function auth(req) {
  const t = parse(req.headers.cookie||'').admin_token || req.headers.authorization?.replace('Bearer ','');
  return verifyToken(t)?.type === 'admin';
}

export default async function handler(req, res) {
  if (!auth(req)) return res.status(401).json({ error:'Unauthorized' });
  try {
    if (req.method === 'GET') {
      const { status, page=1, limit=50 } = req.query;
      let orders = Orders.all().sort((a,b) => b.created_at?.localeCompare(a.created_at));
      if (status && status !== 'all') orders = orders.filter(o => o.payment_status===status);
      const total = orders.length;
      const start = (parseInt(page)-1) * parseInt(limit);
      orders = orders.slice(start, start+parseInt(limit));

      // Stats
      const all = Orders.all();
      const stats = {
        total:   all.length,
        success: all.filter(o=>o.payment_status==='success').length,
        pending: all.filter(o=>o.payment_status==='pending').length,
        failed:  all.filter(o=>['failed','expired'].includes(o.payment_status)).length,
        revenue: all.filter(o=>o.payment_status==='success').reduce((s,o)=>s+parseInt(o.amount||0),0),
      };

      return res.json({ success:true, orders, total, stats });
    }

    if (req.method === 'POST') {
      const { orderId, action } = req.body;
      const order = Orders.byId(orderId);
      if (!order) return res.status(404).json({ success:false, message:'Order tidak ditemukan' });

      if (action === 'retry_plugin') {
        const r = await notifyTransaction({
          order_id: order.order_id, player_name: order.player_username,
          player_uuid: order.player_uuid, product_id: order.reward_trigger||String(order.product_id),
          amount: order.amount, status: 'success', timestamp: new Date().toISOString(),
        });
        Orders.update(orderId, { plugin_notified: r.ok, plugin_response: JSON.stringify(r) });
        return res.json({ success:r.ok, result: r });
      }

      if (action === 'update_status') {
        Orders.update(orderId, { payment_status: req.body.status });
        return res.json({ success:true });
      }
    }

    return res.status(405).end();
  } catch(e) {
    return res.status(500).json({ success:false, message: e.message });
  }
}
