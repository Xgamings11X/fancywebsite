// Admin CRUD Products — file-based, no DB
import { Products, Categories } from '../../../lib/storage.js';
import { verifyToken } from '../../../lib/auth.js';
import { parse } from 'cookie';

function auth(req) {
  const t = parse(req.headers.cookie||'').admin_token || req.headers.authorization?.replace('Bearer ','');
  const u = verifyToken(t);
  return u?.type === 'admin';
}

export default function handler(req, res) {
  if (!auth(req)) return res.status(401).json({ error:'Unauthorized' });

  try {
    if (req.method === 'GET') {
      const products = Products.all().map(p => {
        const cat = Categories.byId(p.category_id);
        return { ...p, category_name: cat?.name||null, category_slug: cat?.slug||null, category_icon: cat?.icon||null };
      });
      return res.json({ success:true, products });
    }

    if (req.method === 'POST') {
      const { name, category_id, description, price, original_price, image_url,
              badge, badge_color, reward_trigger, purchase_limit, limit_scope, sort_order, features } = req.body;
      if (!name || price===undefined || price==='')
        return res.status(400).json({ success:false, message:'Nama dan harga wajib diisi' });
      const newP = Products.add({
        name, category_id: category_id ? parseInt(category_id) : null,
        description: description||null, price: parseInt(price), original_price: original_price ? parseInt(original_price) : null,
        image_url: image_url||null, badge: badge||null, badge_color: badge_color||'orange',
        reward_trigger: reward_trigger||null,
        purchase_limit: parseInt(purchase_limit)||0, limit_scope: limit_scope||'per_product',
        sort_order: parseInt(sort_order)||0,
        features: Array.isArray(features) ? features : [],
      });
      return res.status(201).json({ success:true, id: newP.id });
    }

    if (req.method === 'PUT') {
      const { id, ...patch } = req.body;
      if (!id) return res.status(400).json({ success:false, message:'ID diperlukan' });
      if (patch.price !== undefined) patch.price = parseInt(patch.price);
      if (patch.original_price !== undefined) patch.original_price = patch.original_price ? parseInt(patch.original_price) : null;
      if (patch.category_id !== undefined) patch.category_id = patch.category_id ? parseInt(patch.category_id) : null;
      if (patch.features !== undefined) patch.features = Array.isArray(patch.features) ? patch.features : [];
      if (patch.purchase_limit !== undefined) patch.purchase_limit = parseInt(patch.purchase_limit)||0;
      Products.update(id, patch);
      return res.json({ success:true });
    }

    if (req.method === 'DELETE') {
      const { id, permanent } = req.query;
      if (!id) return res.status(400).json({ success:false, message:'ID diperlukan' });
      if (permanent === '1') Products.remove(id);
      else Products.update(id, { is_active: false });
      return res.json({ success:true });
    }

    if (req.method === 'PATCH') {
      const { id, action } = req.body;
      if (action === 'duplicate') {
        const p = Products.byId(id);
        if (!p) return res.status(404).json({ success:false, message:'Tidak ditemukan' });
        Products.add({ ...p, name: p.name+' (Copy)', is_active: false });
        return res.json({ success:true });
      }
      if (action === 'toggle') {
        const p = Products.byId(id);
        if (!p) return res.status(404).json({ success:false });
        Products.update(id, { is_active: !p.is_active });
        return res.json({ success:true });
      }
    }

    return res.status(405).end();
  } catch(e) {
    console.error('[admin/products]', e.message);
    return res.status(500).json({ success:false, message: e.message });
  }
}
