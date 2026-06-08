import { Orders } from '../../../../lib/storage.js';

export default function handler(req, res) {
  const { orderId } = req.query;
  const order = Orders.byId(orderId);
  if (!order) return res.status(404).json({ error:'Not found' });
  return res.json({ status: order.payment_status, order });
}
