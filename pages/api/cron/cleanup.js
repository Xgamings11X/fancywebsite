/**
 * /api/cron/cleanup — Pembersihan tiket otomatis
 *
 * Aturan:
 *  1. Status resolved / rejected → arsip + hapus setelah 2 menit (grace period untuk admin cancel)
 *  2. Tidak ada aktivitas > 5 hari → arsip + hapus (tiket ditinggal)
 *
 * Vercel Cron (vercel.json):
 *   Pro  : "schedule": "* * * * *"  (setiap menit)
 *   Hobby: "schedule": "0 * * * *"  (setiap jam — cukup untuk cleanup harian)
 *
 * Bisa juga dipanggil manual dari admin panel.
 */
import { TicketsAsync } from '../../../lib/redis.js';
import { webhookTicketArchive } from '../../../lib/discord.js';

const FIVE_DAYS_MS  = 5 * 24 * 60 * 60 * 1000;
const TWO_MINUTES_MS = 2 * 60 * 1000;

export default async function handler(req, res) {
  // Keamanan: hanya bisa dipanggil dari Vercel Cron atau admin dengan secret
  const authHeader = req.headers['authorization'];
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // Vercel Cron juga mengirim header x-vercel-cron
    if (!req.headers['x-vercel-cron']) {
      return res.status(401).json({ error:'Unauthorized' });
    }
  }

  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).end();

  try {
    const now     = Date.now();
    const tickets = await TicketsAsync.all();
    const archived = [];
    const skipped  = [];

    for (const ticket of tickets) {
      const updatedMs    = new Date(ticket.updated_at||ticket.created_at).getTime();
      const closedMs     = ticket.closed_at ? new Date(ticket.closed_at).getTime() : null;
      const isClosedStatus = ticket.status==='resolved' || ticket.status==='rejected';
      const inactiveMs   = now - updatedMs;

      let shouldArchive = false;
      let reason        = '';

      // Rule 1: closed status + sudah > 2 menit sejak closed_at
      if (isClosedStatus && closedMs && (now - closedMs) >= TWO_MINUTES_MS) {
        shouldArchive = true;
        reason        = `status=${ticket.status}, closed ${Math.round((now-closedMs)/1000)}s ago`;
      }
      // Rule 2: closed status tapi closed_at tidak di-set → set sekarang (grace period mulai)
      else if (isClosedStatus && !closedMs) {
        await TicketsAsync.update(ticket.ticket_id, { closed_at: new Date().toISOString() });
        skipped.push({ id:ticket.ticket_id, reason:'grace period dimulai' });
        continue;
      }
      // Rule 3: tidak aktif > 5 hari
      else if (!isClosedStatus && inactiveMs >= FIVE_DAYS_MS) {
        shouldArchive = true;
        reason        = `tidak aktif ${Math.round(inactiveMs/86400000)} hari`;
        // Update status ke expired sebelum arsip
        await TicketsAsync.update(ticket.ticket_id, { status:'expired' });
      }

      if (shouldArchive) {
        // Ambil data terbaru setelah update
        const fresh = await TicketsAsync.byId(ticket.ticket_id);
        // Kirim arsip ke Discord webhook
        if (fresh) {
          await webhookTicketArchive(fresh).catch(e =>
            console.error('[cleanup] archive webhook error:', e.message));
        }
        // Hapus dari Redis/file
        await TicketsAsync.delete(ticket.ticket_id);
        archived.push({ id:ticket.ticket_id, reason });
      }
    }

    console.log(`[cleanup] done — archived: ${archived.length}, skipped: ${skipped.length}`);
    return res.json({ success:true, archived, skipped, total: tickets.length });
  } catch(e) {
    console.error('[cleanup] error:', e.message);
    return res.status(500).json({ success:false, message:e.message });
  }
}
