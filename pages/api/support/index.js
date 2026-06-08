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
      Tickets.add({ ticket_id:ticketId, type, player_username:user.username, subject:subject.trim(),
        description:description.trim(), target_player:target_player?.trim()||null, evidence_url:evidence_url?.trim()||null });
      webhookReport({ ticket_id:ticketId, type, player_username:user.username, subject:subject.trim(),
        description:description.trim(), target_player }).catch(()=>{});
      return res.status(201).json({ success:true, ticketId });
    }
    if (req.method === 'GET') {
      const user = getUser(req);
      if (!user) return res.status(401).json({ success:false });
      return res.json({ success:true, tickets: Tickets.byPlayer(user.username)
        .sort((a,b)=>b.created_at?.localeCompare(a.created_at)).slice(0,20) });
    }
    return res.status(405).end();
  } catch(e) {
    return res.status(500).json({ success:false, message: e.message });
  }
}
