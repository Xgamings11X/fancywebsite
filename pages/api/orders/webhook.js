import { Orders } from '../../../lib/storage.js';
import { verifyWebhookSignature, parseTransactionStatus } from '../../../lib/midtrans.js';
import { notifyTransaction } from '../../../lib/plugin.js';
import { webhookTransaction } from '../../../lib/discord.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const n = req.body;
    if (!await verifyWebhookSignature(n)) return res.status(403).json({ error:'Invalid signature' });

    const { status, paymentType } = parseTransactionStatus(n);
    const finalStatus = status === 'paid' ? 'success' : status;
    const order = Orders.byId(n.order_id);
    if (!order) return res.status(404).json({ error:'Order not found' });

    Orders.update(n.order_id, {
      payment_status: finalStatus, payment_method: paymentType,
      midtrans_transaction_id: n.transaction_id,
    });

    const updated = Orders.byId(n.order_id);
    webhookTransaction(updated).catch(()=>{});

    if (finalStatus==='success' && !order.plugin_notified) {
      try {
        const r = await notifyTransaction({
          order_id: order.order_id, player_name: order.player_username,
          player_uuid: order.player_uuid,
          product_id: order.reward_trigger || String(order.product_id),
          amount: order.amount, status:'success', timestamp: new Date().toISOString(),
        });
        Orders.update(n.order_id, { plugin_notified: r.ok, plugin_queued: !r.ok, plugin_response: JSON.stringify(r) });
      } catch(e) {
        Orders.update(n.order_id, { plugin_response: e.message });
      }
    }
    return res.json({ status:'ok' });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
