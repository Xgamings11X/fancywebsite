import { Tickets } from '../../../lib/storage.js';
import { verifyToken } from '../../../lib/auth.js';
import { parse } from 'cookie';
import { randomBytes } from 'crypto';

function auth(req) {
  const t = parse(req.headers.cookie||'').admin_token || req.headers.authorization?.replace('Bearer ','');
  return verifyToken(t)?.type === 'admin';
}

export default function handler(req, res) {
  if (!auth(req)) return res.status(401).json({ error:'Unauthorized' });
  try {
    if (req.method === 'GET') {
      const { status, type, page=1, id } = req.query;

      // Detail tiket tunggal
      if (id) {
        const tk = Tickets.byId(id);
        if (!tk) return res.status(404).json({ success:false });
        return res.json({ success:true, ticket: tk });
      }

      let tickets = Tickets.all().sort((a,b)=>(b.created_at||'').localeCompare(a.created_at||''));
      if (status && status!=='all') tickets = tickets.filter(t=>t.status===status);
      if (type   && type!=='all')   tickets = tickets.filter(t=>t.type===type);
      const total = tickets.length;
      // No pagination cap — return ALL tickets so history is never lost
      return res.json({ success:true, tickets, total });
    }

    // PATCH: update status / admin_notes / admin kirim pesan
    if (req.method === 'PATCH') {
      const { id, status, admin_notes, admin_reply, message } = req.body || {};
      if (!id) return res.status(400).json({ success:false, message:'ID diperlukan' });

      // Kirim pesan baru dari admin
      if (message !== undefined) {
        if (!message?.trim()) return res.status(400).json({ success:false, message:'Pesan kosong' });
        const msg = { id: randomBytes(4).toString('hex'), sender: 'Admin', sender_type: 'admin', text: message.trim() };
        Tickets.addMessage(id, msg);
        // Juga update status jadi in_review jika masih open
        const tk = Tickets.byId(id);
        if (tk?.status === 'open') Tickets.update(id, { status: 'in_review' });
        return res.json({ success:true });
      }

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
