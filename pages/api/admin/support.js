import { Tickets } from '../../../lib/storage.js';
import { verifyToken } from '../../../lib/auth.js';
import { parse } from 'cookie';

function auth(req) {
  const t = parse(req.headers.cookie||'').admin_token || req.headers.authorization?.replace('Bearer ','');
  return verifyToken(t)?.type === 'admin';
}

export default function handler(req, res) {
  if (!auth(req)) return res.status(401).json({ error:'Unauthorized' });
  try {
    if (req.method === 'GET') {
      const { status, type, page=1 } = req.query;
      let tickets = Tickets.all().sort((a,b)=>(b.created_at||'').localeCompare(a.created_at||''));
      if (status && status!=='all') tickets = tickets.filter(t=>t.status===status);
      if (type   && type!=='all')   tickets = tickets.filter(t=>t.type===type);
      const total = tickets.length;
      tickets = tickets.slice((parseInt(page)-1)*25, parseInt(page)*25);
      return res.json({ success:true, tickets, total });
    }

    // PATCH: update status + admin_notes + admin_reply
    if (req.method === 'PATCH') {
      const { id, status, admin_notes, admin_reply } = req.body || {};
      if (!id) return res.status(400).json({ success:false, message:'ID diperlukan' });

      const patch = {};
      if (status      !== undefined) patch.status      = status;
      if (admin_notes !== undefined) patch.admin_notes  = admin_notes || null;
      if (admin_reply !== undefined) {
        patch.admin_reply      = admin_reply || null;
        patch.admin_replied_at = admin_reply ? new Date().toISOString() : null;
      }

      Tickets.update(id, patch);
      return res.json({ success:true });
    }

    return res.status(405).end();
  } catch(e) {
    return res.status(500).json({ success:false, message:e.message });
  }
}
