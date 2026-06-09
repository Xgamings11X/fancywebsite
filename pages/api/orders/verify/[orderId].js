import { OrdersAsync } from '../../../../lib/redis.js';

export default async function handler(req, res) {
  const { orderId } = req.query;
  const order = await OrdersAsync.byId(orderId);
  if (!order) return res.status(404).json({ error:'Not found' });
  return res.json({ status: order.payment_status, order });
}
