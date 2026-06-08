import { Tickets } from '../../../lib/storage.js';
import { verifyToken } from '../../../lib/auth.js';
import { webhookReport } from '../../../lib/discord.js';
import { parse } from 'cookie';
import { randomBytes } from 'crypto';

function getUser(req) {
  const t = parse(req.headers.cookie||'').token || req.headers.authorization?.replace('Bearer ','');
  return verifyToken(t);
}

export default async function handler(req, res) {
  try {
    // POST /api/support — buat tiket baru
    if (req.method === 'POST') {
      const user = getUser(req);
      if (!user || user.type!=='player') return res.status(401).json({ success:false, message:'Login terlebih dahulu' });
      const { type, subject, description, target_player, evidence_url } = req.body || {};
      if (!['banding','bug','report_player','lainnya'].includes(type))
        return res.status(400).json({ success:false, message:'Tipe tidak valid' });
      if (!subject?.trim() || !description?.trim())
        return res.status(400).json({ success:false, message:'Subjek dan deskripsi wajib diisi' });
      if (type==='report_player' && !target_player?.trim())
        return res.status(400).json({ success:false, message:'Nama pemain wajib diisi' });
      if (Tickets.countToday(user.username) >= 3)
        return res.status(429).json({ success:false, message:'Maksimal 3 tiket per hari' });

      const ticketId = 'TKT-'+randomBytes(4).toString('hex').toUpperCase();
      // Pesan pertama = deskripsi awal player
      const firstMsg = { id: randomBytes(4).toString('hex'), sender: user.username, sender_type: 'player', text: description.trim() };
      Tickets.add({ ticket_id:ticketId, type, player_username:user.username, subject:subject.trim(),
        description:description.trim(), target_player:target_player?.trim()||null, evidence_url:evidence_url?.trim()||null,
        messages: [firstMsg] });
      webhookReport({ ticket_id:ticketId, type, player_username:user.username, subject:subject.trim(),
        description:description.trim(), target_player }).catch(()=>{});
      return res.status(201).json({ success:true, ticketId });
    }

    // GET /api/support — list tiket player, atau detail tiket tertentu
    if (req.method === 'GET') {
      const user = getUser(req);
      if (!user) return res.status(401).json({ success:false });

      const { id } = req.query;
      if (id) {
        // Detail tiket + messages
        const tk = Tickets.byId(id);
        if (!tk) return res.status(404).json({ success:false, message:'Tiket tidak ditemukan' });
        if (tk.player_username !== user.username && user.type !== 'admin')
          return res.status(403).json({ success:false });
        return res.json({ success:true, ticket: tk });
      }

      return res.json({ success:true, tickets: Tickets.byPlayer(user.username)
        .sort((a,b)=>b.created_at?.localeCompare(a.created_at)) });
    }

    // PATCH /api/support — player kirim pesan baru ke tiket
    if (req.method === 'PATCH') {
      const user = getUser(req);
      if (!user || user.type!=='player') return res.status(401).json({ success:false, message:'Login terlebih dahulu' });

      const { ticket_id, text } = req.body || {};
      if (!ticket_id || !text?.trim()) return res.status(400).json({ success:false, message:'Data tidak lengkap' });

      const tk = Tickets.byId(ticket_id);
      if (!tk) return res.status(404).json({ success:false });
      if (tk.player_username !== user.username) return res.status(403).json({ success:false });
      if (tk.status === 'resolved' || tk.status === 'rejected')
        return res.status(400).json({ success:false, message:'Tiket sudah ditutup' });

      const msg = { id: randomBytes(4).toString('hex'), sender: user.username, sender_type: 'player', text: text.trim() };
      Tickets.addMessage(ticket_id, msg);
      return res.json({ success:true });
    }

    return res.status(405).end();
  } catch(e) {
    return res.status(500).json({ success:false, message: e.message });
  }
}
