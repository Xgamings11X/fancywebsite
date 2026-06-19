import { OrdersAsync }                                    from '../../../../lib/redis.js';
import { getTransactionDetail, parseTransactionStatus }   from '../../../../lib/tripay.js';

const PAID_STATUSES = ['paid', 'success'];
const DONE_STATUSES = [...PAID_STATUSES, 'expire', 'expired', 'cancel', 'cancelled', 'failed'];

export default async function handler(req, res) {
  const { orderId } = req.query;
  let order = await OrdersAsync.byId(orderId);
  if (!order) return res.status(404).json({ error: 'Not found' });

  // Jika masih pending, cek langsung ke Tripay
  if (!DONE_STATUSES.includes(order.payment_status) && order.tripay_reference) {
    try {
      const detail = await getTransactionDetail(order.tripay_reference);
      if (detail && detail.status && detail.status !== 'UNPAID') {
        const { status, paymentType } = parseTransactionStatus(detail);
        const finalStatus = status === 'paid' ? 'success' : status;

        const updates = { payment_status: finalStatus };
        if (paymentType) updates.payment_method = paymentType;
        await OrdersAsync.update(orderId, updates);

        // Jika baru sukses dan plugin belum dinotif, trigger via webhook internal
        if (PAID_STATUSES.includes(finalStatus) && !order.plugin_notified) {
          try {
            await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://fancynet.my.id'}/api/orders/webhook`, {
              method:  'POST',
              headers: {
                'Content-Type':          'application/json',
                'X-Callback-Signature':  '',   // TRIPAY_SKIP_VERIFY=1 harus di-set di env dev
              },
              body: JSON.stringify({
                merchant_ref:   orderId,
                reference:      order.tripay_reference,
                status:         detail.status,
                payment_method: detail.payment_method || '',
              }),
            }).catch(() => {});
          } catch {}
        }

        order = await OrdersAsync.byId(orderId);
      }
    } catch (e) {
      console.error('[verify] Tripay check failed:', e.message);
    }
  }

  return res.json({ status: order.payment_status, order });
}
