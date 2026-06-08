/**
 * lib/discord.js — 2 webhook Discord terpisah
 * TX  : DISCORD_WEBHOOK_TX    (transaksi)
 * RPT : DISCORD_WEBHOOK_REPORT (report/support)
 */
async function send(url, embed) {
  if (!url?.startsWith('http')) return;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
      signal: AbortSignal.timeout(8000),
    });
  } catch {}
}
const idr = v => `Rp ${Number(v||0).toLocaleString('id-ID')}`;

export async function webhookTransaction(order) {
  const url = process.env.DISCORD_WEBHOOK_TX;
  if (!url) return;
  const s = order.payment_status;
  const emoji = { success:'✅', pending:'⏳', failed:'❌', expired:'⌛' }[s] || '🔄';
  const color = { success:0x22c55e, pending:0xf59e0b, failed:0xef4444, expired:0x6b7280 }[s] || 0x3b82f6;
  await send(url, {
    title: `${emoji} Transaksi ${s?.toUpperCase()}`,
    color,
    fields: [
      { name:'🆔 Order ID',  value:`\`${order.order_id}\``,      inline:true },
      { name:'👤 Player',    value:String(order.player_username), inline:true },
      { name:'📦 Produk',    value:String(order.product_name||'-'), inline:true },
      { name:'💰 Total',     value:idr(order.amount),             inline:true },
      { name:'🎁 Reward',    value:String(order.reward_trigger||'-'), inline:true },
      { name:'💳 Metode',    value:String(order.payment_method||'qris'), inline:true },
    ],
    timestamp: new Date().toISOString(),
    footer: { text: 'Fancy Network Store • fancynet.my.id' },
  });
}

export async function webhookReport(ticket) {
  const url = process.env.DISCORD_WEBHOOK_REPORT;
  if (!url) return;
  const types = { banding:'⚖️ Aju Banding', bug:'🐛 Report Bug', report_player:'🚨 Report Pemain', lainnya:'📝 Lainnya' };
  await send(url, {
    title: `${types[ticket.type]||ticket.type} — Tiket Baru`,
    color: 0x6366f1,
    fields: [
      { name:'🎫 Ticket ID', value:`\`${ticket.ticket_id}\``,       inline:true },
      { name:'👤 Player',    value:String(ticket.player_username),   inline:true },
      { name:'📋 Subjek',    value:String(ticket.subject),           inline:false },
      { name:'📝 Deskripsi', value:String(ticket.description||'').slice(0,500), inline:false },
      ...(ticket.target_player ? [{ name:'🎯 Target', value:ticket.target_player, inline:true }] : []),
    ],
    timestamp: new Date().toISOString(),
    footer: { text: 'Fancy Network Support • fancynet.my.id' },
  });
}
