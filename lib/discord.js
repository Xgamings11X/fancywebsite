/**
 * lib/discord.js — 2 webhook Discord terpisah
 * TX  : DISCORD_WEBHOOK_TX     (transaksi)
 * RPT : DISCORD_WEBHOOK_REPORT (support / arsip tiket)
 */
const idr = v => `Rp ${Number(v||0).toLocaleString('id-ID')}`;

/** Kirim embed biasa */
async function sendEmbed(url, payload) {
  if (!url?.startsWith('http')) {
    console.warn('[discord] webhook URL kosong atau tidak valid');
    return;
  }
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) {
      const txt = await r.text().catch(()=>'');
      console.error(`[discord] webhook error ${r.status}:`, txt.slice(0,200));
    }
  } catch (e) {
    console.error('[discord] fetch error:', e.message);
  }
}

/** Kirim file attachment + embed (untuk arsip tiket) */
async function sendFile(url, filename, fileContent, payload) {
  if (!url?.startsWith('http')) return;
  try {
    const formData = new FormData();
    formData.append('payload_json', JSON.stringify(payload));
    formData.append('files[0]', new Blob([fileContent], { type:'text/plain; charset=utf-8' }), filename);
    await fetch(url, { method:'POST', body:formData, signal:AbortSignal.timeout(15000) });
  } catch (e) {
    console.error('[discord] sendFile error:', e.message);
  }
}

// ── Webhook transaksi ────────────────────────────────────────────
export async function webhookTransaction(order) {
  const url = process.env.DISCORD_WEBHOOK_TX;
  if (!url) { console.warn('[discord] DISCORD_WEBHOOK_TX tidak di-set'); return; }

  const s     = order.payment_status;
  const emoji = { success:'✅', pending:'⏳', failed:'❌', expired:'⌛' }[s] || '🔄';
  const color = { success:0x22c55e, pending:0xf59e0b, failed:0xef4444, expired:0x6b7280 }[s] || 0x3b82f6;

  // content = plain text DI LUAR embed — bisa di-search di Discord
  const content = `**${emoji} [${s?.toUpperCase()}]** · Player: \`${order.player_username}\` · Order: \`${order.order_id}\` · Discord: \`${order.discord_username||'-'}\``;

  await sendEmbed(url, {
    content,    // <-- SEARCHABLE di Discord
    embeds: [{
      title: `${emoji} Transaksi ${s?.toUpperCase()}`,
      color,
      fields: [
        { name:'🆔 Order ID',       value:`\`${order.order_id}\``,                 inline:true },
        { name:'👤 Player MC',       value:String(order.player_username),           inline:true },
        { name:'💬 Discord',         value:String(order.discord_username||'-'),     inline:true },
        { name:'📦 Produk',          value:String(order.product_name||'-'),         inline:true },
        { name:'💰 Total',           value:idr(order.amount),                       inline:true },
        { name:'🎁 Reward Trigger',  value:String(order.reward_trigger||'-'),       inline:true },
        { name:'💳 Metode',          value:String(order.payment_method||'qris'),    inline:true },
        ...(order.discount_amount>0
          ? [{ name:'🏷️ Diskon', value:idr(order.discount_amount), inline:true }]
          : []),
      ],
      timestamp: new Date().toISOString(),
      footer: { text: 'Fancy Network Store' },
    }],
  });
}

// ── Webhook tiket baru ───────────────────────────────────────────
export async function webhookReport(ticket) {
  const url = process.env.DISCORD_WEBHOOK_REPORT;
  if (!url) return;
  const types = { banding:'⚖️ Aju Banding', bug:'🐛 Report Bug', report_player:'🚨 Report Pemain', lainnya:'📝 Lainnya' };
  await sendEmbed(url, {
    content: `🎫 Tiket baru: \`${ticket.ticket_id}\` dari **${ticket.player_username}**`,
    embeds: [{
      title: `${types[ticket.type]||ticket.type} — Tiket Baru`,
      color: 0x6366f1,
      fields: [
        { name:'🎫 Ticket ID', value:`\`${ticket.ticket_id}\``,                              inline:true },
        { name:'👤 Player',    value:String(ticket.player_username),                          inline:true },
        { name:'📋 Subjek',    value:String(ticket.subject),                                  inline:false },
        { name:'📝 Deskripsi', value:String(ticket.description||'').slice(0,500),             inline:false },
        ...(ticket.target_player ? [{ name:'🎯 Target', value:ticket.target_player, inline:true }] : []),
      ],
      timestamp: new Date().toISOString(),
      footer: { text: 'Fancy Network Support' },
    }],
  });
}

// ── Arsip tiket ke webhook (sebelum dihapus) ─────────────────────
export async function webhookTicketArchive(ticket) {
  const url = process.env.DISCORD_WEBHOOK_REPORT;
  if (!url) return;

  const types  = { banding:'Aju Banding', bug:'Report Bug', report_player:'Report Pemain', lainnya:'Lainnya' };
  const colors = { resolved:0x2ecc71, rejected:0xe74c3c, expired:0x95a5a6 };

  // Buat teks transcript
  const lines = [
    `===== ARSIP TIKET: ${ticket.ticket_id} =====`,
    `Tipe     : ${types[ticket.type]||ticket.type}`,
    `Player   : ${ticket.player_username}`,
    `Subjek   : ${ticket.subject}`,
    `Status   : ${ticket.status}`,
    `Dibuat   : ${ticket.created_at}`,
    `Update   : ${ticket.updated_at}`,
    ticket.target_player ? `Target   : ${ticket.target_player}` : null,
    ticket.admin_notes   ? `Catatan  : ${ticket.admin_notes}` : null,
    '',
    '===== PERCAKAPAN =====',
    ...(ticket.messages||[]).map(m => {
      const time = m.created_at ? new Date(m.created_at).toLocaleString('id-ID') : '';
      return `[${time}] ${m.sender_type==='admin'?'[ADMIN]':'[PLAYER]'} ${m.sender}: ${m.text}`;
    }),
    '',
    `===== SELESAI =====`,
  ].filter(l => l !== null).join('\n');

  const filename = `${ticket.ticket_id}.txt`;

  await sendFile(url, filename, lines, {
    content: `📁 Arsip tiket \`${ticket.ticket_id}\` (${ticket.player_username}) — Status: **${ticket.status}**`,
    embeds: [{
      title: `📁 Arsip: ${ticket.ticket_id}`,
      color: colors[ticket.status] || 0x95a5a6,
      fields: [
        { name:'👤 Player',    value:ticket.player_username,                  inline:true },
        { name:'📋 Subjek',    value:ticket.subject,                          inline:true },
        { name:'📊 Status',    value:ticket.status,                           inline:true },
        { name:'💬 Pesan',     value:String((ticket.messages||[]).length),    inline:true },
        { name:'📅 Dibuat',    value:ticket.created_at?.slice(0,10)||'-',     inline:true },
      ],
      description: `File transcript: \`${filename}\``,
      timestamp: new Date().toISOString(),
      footer: { text: 'Fancy Network Support — Auto Cleanup' },
    }],
  });
}

// ── Arsip log transaksi ke webhook (sebelum dihapus cleanup) ─────
export async function webhookOrderArchive(orders) {
  const url = process.env.DISCORD_WEBHOOK_TX;
  if (!url) { console.warn('[discord] DISCORD_WEBHOOK_TX tidak di-set'); return; }

  const lines = [
    `Fancy Network Store — Arsip Log Transaksi`,
    `Tanggal cleanup: ${new Date().toISOString()}`,
    `Total: ${orders.length} transaksi`,
    ``,
    ...orders.map(o =>
      [
        `Order   : ${o.order_id}`,
        `Player  : ${o.player_username}`,
        `Discord : ${o.discord_username || '-'}`,
        `Produk  : ${o.product_name}`,
        `Trigger : ${o.reward_trigger || '-'}`,
        `Total   : Rp ${Number(o.amount || 0).toLocaleString('id-ID')}`,
        `Status  : ${o.payment_status}`,
        `Plugin  : ${o.plugin_notified ? 'Terkirim' : o.plugin_queued ? 'Antri' : 'Gagal'}`,
        `Tanggal : ${o.created_at?.slice(0, 19) || '-'}`,
        `---`,
      ].join('\n')
    ),
  ];

  const filename = `orders-cleanup-${new Date().toISOString().slice(0, 10)}.txt`;
  await sendFile(url, filename, lines, {
    content: `🗃️ **Cleanup Log Transaksi** — ${orders.length} order diarsipkan & dihapus`,
    embeds: [{
      title: '🗃️ Arsip Log Transaksi',
      color: 0xf59e0b,
      fields: [
        { name: '📊 Total Diarsipkan', value: String(orders.length),       inline: true },
        { name: '✅ Sukses',           value: String(orders.filter(o => o.payment_status === 'success').length), inline: true },
        { name: '❌ Gagal/Expired',    value: String(orders.filter(o => ['failed','expired'].includes(o.payment_status)).length), inline: true },
        { name: '📅 Cleanup',         value: new Date().toLocaleString('id-ID'), inline: false },
      ],
      description: `File lengkap: \`${filename}\``,
      timestamp: new Date().toISOString(),
      footer: { text: 'Fancy Network Store — Auto Cleanup' },
    }],
  });
}
