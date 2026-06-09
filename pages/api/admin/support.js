import { TicketsAsync }  from '../../../lib/redis.js';
import { runCleanup }   from '../../../lib/cleanup.js';
import { verifyToken }  from '../../../lib/auth.js';
import { parse }        from 'cookie';
import { randomBytes }  from 'crypto';

function auth(req) {
  const t = parse(req.headers.cookie||'').admin_token || req.headers.authorization?.replace('Bearer ','');
  return verifyToken(t)?.type === 'admin';
}

export default async function handler(req, res) {
  if (!auth(req)) return res.status(401).json({ error:'Unauthorized' });
  try {
    if (req.method === 'GET') {
      // Lazy cleanup — fire-and-forget, tidak block response
      runCleanup().catch(()=>{});
      const { status, type, page=1, id } = req.query;
      if (id) {
        const tk = await TicketsAsync.byId(id);
        if (!tk) return res.status(404).json({ success:false });
        return res.json({ success:true, ticket: tk });
      }
      let tickets = (await TicketsAsync.all())
        .sort((a,b)=>(b.created_at||'').localeCompare(a.created_at||''));
      if (status && status!=='all') tickets = tickets.filter(t=>t.status===status);
      if (type   && type!=='all')   tickets = tickets.filter(t=>t.type===type);
      const total = tickets.length;
      tickets = tickets.slice((parseInt(page)-1)*25, parseInt(page)*25);
      return res.json({ success:true, tickets, total });
    }

    if (req.method === 'PATCH') {
      const { id, status, admin_notes, admin_reply, message, cancel_cleanup } = req.body || {};
      if (!id) return res.status(400).json({ success:false, message:'ID diperlukan' });

      // Admin kirim pesan ke tiket
      if (message !== undefined) {
        if (!message?.trim()) return res.status(400).json({ success:false, message:'Pesan kosong' });
        const msg = { id: randomBytes(4).toString('hex'), sender:'Admin', sender_type:'admin', text:message.trim() };
        await TicketsAsync.addMessage(id, msg);
        const tk = await TicketsAsync.byId(id);
        if (tk?.status==='open') await TicketsAsync.update(id, { status:'in_review' });
        return res.json({ success:true });
      }

      // Admin cancel auto-cleanup (reset closed_at)
      if (cancel_cleanup) {
        await TicketsAsync.update(id, { closed_at: null, status: 'in_review' });
        return res.json({ success:true, message:'Grace period dibatalkan' });
      }

      const patch = {};
      if (status !== undefined) {
        patch.status = status;
        // Set closed_at saat pertama kali status jadi resolved/rejected
        if (status==='resolved' || status==='rejected') {
          const tk = await TicketsAsync.byId(id);
          if (!tk?.closed_at) patch.closed_at = new Date().toISOString();
        } else {
          patch.closed_at = null; // reset jika status diubah balik
        }
      }
      if (admin_notes !== undefined) patch.admin_notes  = admin_notes || null;
      if (admin_reply !== undefined) {
        patch.admin_reply      = admin_reply || null;
        patch.admin_replied_at = admin_reply ? new Date().toISOString() : null;
      }
      await TicketsAsync.update(id, patch);
      return res.json({ success:true });
    }

    return res.status(405).end();
  } catch(e) {
    return res.status(500).json({ success:false, message:e.message });
  }
}
