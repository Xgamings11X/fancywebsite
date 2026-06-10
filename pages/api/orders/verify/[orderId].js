import { OrdersAsync }                                  from '../../../../lib/redis.js';
import { getTransactionStatus, parseTransactionStatus } from '../../../../lib/midtrans.js';

const PAID_STATUSES = ['settlement','capture','success','paid'];
const DONE_STATUSES = [...PAID_STATUSES,'expire','cancel','cancelled','deny','failed','expired'];

export default async function handler(req, res) {
  const { orderId } = req.query;
  let order = await OrdersAsync.byId(orderId);
  if (!order) return res.status(404).json({ error: 'Not found' });

  // Jika masih pending, cek langsung ke Midtrans untuk status terbaru
  if (!DONE_STATUSES.includes(order.payment_status)) {
    try {
      const mtData = await getTransactionStatus(orderId);
      // mtData.transaction_status bisa settlement, capture, expire, dll
      if (mtData && mtData.transaction_status && mtData.transaction_status !== 'pending') {
        const { status, paymentType } = parseTransactionStatus(mtData);
        const finalStatus = status === 'paid' ? 'success' : status;

        // Update Redis jika status berubah
        const updates = {
          payment_status:          finalStatus,
          midtrans_transaction_id: mtData.transaction_id || order.midtrans_transaction_id,
        };
        if (paymentType) updates.payment_method = paymentType;
        await OrdersAsync.update(orderId, updates);

        // Kalau baru saja jadi success dan belum trigger plugin/discord, jalankan via webhook internal
        if (PAID_STATUSES.includes(finalStatus) && !order.plugin_notified) {
          try {
            await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://fancynet.my.id'}/api/orders/webhook`, {
              method:  'POST',
              headers: { 'Content-Type': 'application/json' },
              body:    JSON.stringify({ ...mtData }),
            }).catch(() => {});
          } catch {}
        }

        order = await OrdersAsync.byId(orderId);
      }
    } catch (e) {
      // Gagal ambil dari Midtrans — kembalikan data lokal
      console.error('[verify] Midtrans check failed:', e.message);
    }
  }

  return res.json({ status: order.payment_status, order });
}
