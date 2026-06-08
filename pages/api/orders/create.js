import { Products, Orders, RedeemCodes } from '../../../lib/storage.js';
import { createSnapTransaction } from '../../../lib/midtrans.js';
import { verifyToken } from '../../../lib/auth.js';
import { parse } from 'cookie';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const t = parse(req.headers.cookie||'').token || req.headers.authorization?.replace('Bearer ','');
  const user = verifyToken(t);
  if (!user || user.type !== 'player') return res.status(401).json({ success:false, message:'Login terlebih dahulu' });

  const { productId, redeemCode } = req.body || {};
  if (!productId) return res.status(400).json({ success:false, message:'productId diperlukan' });

  try {
    const product = Products.byId(productId);
    if (!product || !product.is_active) return res.status(404).json({ success:false, message:'Produk tidak ditemukan' });

    // Purchase limit
    if (product.purchase_limit > 0) {
      const count = Orders.purchaseCount(user.username, product.id, product.limit_scope||'per_product', product.category_id);
      if (count >= product.purchase_limit)
        return res.status(400).json({ success:false, message:`Batas pembelian tercapai (max ${product.purchase_limit}x)` });
    }

    // Redeem code
    let discountAmount=0, finalPrice=product.price, usedCode=null;
    if (redeemCode) {
      const code = RedeemCodes.byCode(redeemCode);
      if (!code || !code.is_active) return res.status(400).json({ success:false, message:'Kode tidak valid' });
      if (code.expires_at && new Date(code.expires_at)<new Date())
        return res.status(400).json({ success:false, message:'Kode sudah kadaluarsa' });
      if (code.used_count >= code.max_uses) return res.status(400).json({ success:false, message:'Kode sudah habis' });
      if (code.product_id && code.product_id !== product.id)
        return res.status(400).json({ success:false, message:'Kode tidak berlaku untuk produk ini' });
      discountAmount = code.discount_type==='percent'
        ? Math.floor(product.price*code.discount_value/100) : code.discount_value;
      discountAmount = Math.min(discountAmount, product.price);
      finalPrice = product.price - discountAmount;
      usedCode = code.code;
    }

    const orderId = `FN-${Date.now()}-${Math.random().toString(36).substring(2,6).toUpperCase()}`;
    Orders.add({
      order_id: orderId, player_username: user.username, player_uuid: user.uuid||null,
      player_rank: user.rank||null, product_id: product.id, category_id: product.category_id,
      product_name: product.name, reward_trigger: product.reward_trigger||null,
      amount: finalPrice, discount_amount: discountAmount, redeem_code: usedCode,
      payment_status: 'pending', payment_method: 'qris',
      plugin_notified: false, plugin_queued: false,
    });

    const snap = await createSnapTransaction({ orderId, amount: finalPrice, playerUsername: user.username, productName: product.name });
    Orders.update(orderId, { midtrans_snap_token: snap.snapToken });
    if (usedCode) RedeemCodes.increment(usedCode);

    return res.json({
      success:true, orderId, snapToken: snap.snapToken,
      clientKey: process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || process.env.MIDTRANS_CLIENT_KEY,
      finalPrice, discountAmount,
    });
  } catch(e) {
    console.error('[order/create]', e.message);
    return res.status(500).json({ success:false, message: e.message });
  }
}
