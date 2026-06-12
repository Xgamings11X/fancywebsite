/**
 * lib/discord.js
 * TX  : DISCORD_WEBHOOK_TX     (transaksi + PDF invoice)
 * RPT : DISCORD_WEBHOOK_REPORT (support / arsip tiket)
 *
 * PDF digenerate pakai PDFKit (pure Node.js, works di Vercel)
 * Install: npm install pdfkit
 */
const idr = v => `Rp ${Number(v||0).toLocaleString('id-ID')}`;

const STATUS_EMOJI = { success:'✅', settlement:'✅', capture:'✅', pending:'⏳', failed:'❌', cancelled:'🚫', cancel:'🚫', expired:'⌛', expire:'⌛', deny:'❌' };
const STATUS_COLOR = { success:0x22c55e, settlement:0x22c55e, capture:0x22c55e, pending:0xf59e0b, failed:0xef4444, cancelled:0x95a5a6, cancel:0x95a5a6, expired:0x6b7280, expire:0x6b7280, deny:0xef4444 };
const STATUS_LABEL = { success:'LUNAS', settlement:'LUNAS', capture:'LUNAS', paid:'LUNAS', pending:'MENUNGGU', failed:'GAGAL', cancelled:'DIBATALKAN', cancel:'DIBATALKAN', expired:'KADALUARSA', expire:'KADALUARSA', deny:'DITOLAK' };

/** Kirim embed JSON */
async function sendEmbed(url, payload) {
  if (!url?.startsWith('http')) { console.warn('[discord] webhook URL kosong'); return; }
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) {
      const txt = await r.text().catch(()=>'');
      console.error(`[discord] embed error ${r.status}:`, txt.slice(0,200));
    }
  } catch(e) { console.error('[discord] sendEmbed:', e.message); }
}

/** Kirim file attachment ke Discord via multipart */
async function sendFile(url, filename, buffer, mimeType, embedPayload) {
  if (!url?.startsWith('http')) return;
  try {
    const formData = new FormData();
    formData.append('payload_json', JSON.stringify(embedPayload));
    formData.append('files[0]', new Blob([buffer], { type: mimeType }), filename);
    const r = await fetch(url, { method:'POST', body:formData, signal:AbortSignal.timeout(20000) });
    if (!r.ok) {
      const txt = await r.text().catch(()=>'');
      console.error(`[discord] file error ${r.status}:`, txt.slice(0,200));
    }
  } catch(e) { console.error('[discord] sendFile:', e.message); }
}

/** Generate PDF invoice pakai PDFKit → return Buffer */
async function generateInvoicePdf(order) {
  // Dynamic import agar tidak crash jika pdfkit belum di-install
  let PDFDocument;
  try {
    const mod = await import('pdfkit');
    PDFDocument = mod.default || mod;
  } catch {
    throw new Error('pdfkit belum diinstall. Jalankan: npm install pdfkit');
  }

  const idrFmt     = v => `Rp ${Number(v||0).toLocaleString('id-ID')}`;
  const subtotal   = (order.amount||0) + (order.discount_amount||0);
  const discount   = order.discount_amount||0;
  const serviceFee = Math.round((order.amount||0)*0.025);
  const total      = (order.amount||0) + serviceFee;
  const statusLbl  = STATUS_LABEL[order.payment_status] || (order.payment_status||'').toUpperCase();
  const formatDate = iso => iso ? new Date(iso).toLocaleString('id-ID',{day:'2-digit',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'}) + ' WIB' : '-';

  // Warna status
  const statusColors = {
    success:[34,197,94], settlement:[34,197,94], capture:[34,197,94],
    pending:[245,158,11],
    failed:[239,68,68], deny:[239,68,68],
    cancelled:[107,114,128], cancel:[107,114,128],
    expired:[107,114,128], expire:[107,114,128],
  };
  const [sr,sg,sb] = statusColors[order.payment_status] || [107,114,128];

  return new Promise((resolve, reject) => {
    const doc    = new PDFDocument({ size:'A4', margin:50, info:{ Title:`Invoice #${order.order_id}`, Author:'Fancy Network Store' } });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end',  () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W      = doc.page.width - 100; // lebar konten (margin kiri+kanan 50)
    const LEFT   = 50;
    const RIGHT  = doc.page.width - 50;
    const ORANGE = '#FF6B00';
    const GRAY   = '#888888';
    const BLACK  = '#111111';
    const LINE   = '#EEEEEE';

    // ── Header ────────────────────────────────────────────────────
    // Brand
    doc.fontSize(22).fillColor(ORANGE).font('Helvetica-Bold').text('FANCY', LEFT, 50, { continued:true })
       .fillColor(BLACK).text(' NETWORK');
    doc.fontSize(10).fillColor(GRAY).font('Helvetica').text('Fancy Network', LEFT, 78);

    // Invoice title (kanan)
    doc.fontSize(24).fillColor(BLACK).font('Helvetica-Bold').text('INVOICE', RIGHT-120, 50, { width:120, align:'right' });
    doc.fontSize(11).fillColor(GRAY).font('Helvetica').text(`#${order.order_id}`, RIGHT-200, 82, { width:200, align:'right' });

    // Status badge (kanan)
    const badgeW = 110, badgeH = 22, badgeX = RIGHT - badgeW, badgeY = 95;
    doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 4).fillAndStroke(`rgb(${sr},${sg},${sb})`, `rgb(${sr},${sg},${sb})`);
    doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold')
       .text(statusLbl, badgeX, badgeY+6, { width:badgeW, align:'center' });

    // Tanggal
    doc.fillColor(GRAY).fontSize(9).font('Helvetica')
       .text(formatDate(order.created_at), RIGHT-200, 123, { width:200, align:'right' });

    // Garis pemisah header
    let y = 140;
    doc.moveTo(LEFT, y).lineTo(RIGHT, y).lineWidth(1.5).strokeColor(ORANGE).stroke();
    y += 18;

    // ── Info Grid (2 kolom) ───────────────────────────────────────
    const col1X = LEFT, col2X = LEFT + W/2 + 10;

    // Kolom kiri — Ditagih Kepada
    doc.fontSize(8).fillColor(ORANGE).font('Helvetica-Bold')
       .text('DITAGIH KEPADA', col1X, y, { characterSpacing:1 });
    y += 14;
    doc.fontSize(12).fillColor(BLACK).font('Helvetica-Bold').text(order.player_username||'-', col1X, y);
    y += 16;
    if (order.discord_username) {
      doc.fontSize(10).fillColor(GRAY).font('Helvetica').text(`Discord: ${order.discord_username}`, col1X, y);
      y += 14;
    }
    if (order.player_rank && order.player_rank !== 'default') {
      doc.fontSize(10).fillColor(GRAY).font('Helvetica').text(`Rank: ${order.player_rank}`, col1X, y);
      y += 14;
    }

    // Kolom kanan — Detail Transaksi
    let ry = 158;
    doc.fontSize(8).fillColor(ORANGE).font('Helvetica-Bold')
       .text('DETAIL TRANSAKSI', col2X, ry, { characterSpacing:1 });
    ry += 14;
    const details = [
      ['Tanggal',  formatDate(order.created_at)],
      ['Metode',   order.payment_method||'QRIS'],
      ['Order ID', order.order_id],
      ...(order.redeem_code ? [['Kode Redeem', order.redeem_code]] : []),
    ];
    for (const [lbl, val] of details) {
      const valW = RIGHT - col2X - 85;
      doc.fontSize(9).fillColor(GRAY).font('Helvetica').text(lbl, col2X, ry, { width:80 });
      doc.fontSize(9).fillColor(BLACK).font('Helvetica-Bold').text(val, col2X+85, ry, { width: valW });
      const lines = Math.ceil(doc.widthOfString(val, { font:'Helvetica-Bold', size:9 }) / valW) || 1;
      ry += Math.max(13, lines*12 + 1);
    }

    y = Math.max(y, ry) + 20;

    // ── Tabel Produk ─────────────────────────────────────────────
    // Header tabel
    doc.rect(LEFT, y, W, 24).fillColor('#F9F9F9').fill();
    doc.moveTo(LEFT, y).lineTo(RIGHT, y).lineWidth(1).strokeColor('#DDDDDD').stroke();
    doc.moveTo(LEFT, y+24).lineTo(RIGHT, y+24).strokeColor('#DDDDDD').stroke();

    const col = { desc:LEFT+8, cat:LEFT+W*0.55, price:RIGHT-8 };
    doc.fontSize(8).fillColor(GRAY).font('Helvetica-Bold')
       .text('DESKRIPSI PRODUK', col.desc, y+8)
       .text('KATEGORI', col.cat, y+8)
       .text('HARGA', col.price, y+8, { align:'right' });
    y += 24;

    // Row produk
    const rowH = 44;
    doc.rect(LEFT, y, W, rowH).fillColor('#FFFFFF').fill();
    doc.moveTo(LEFT, y+rowH).lineTo(RIGHT, y+rowH).lineWidth(0.5).strokeColor(LINE).stroke();

    doc.fontSize(11).fillColor(BLACK).font('Helvetica-Bold').text(order.product_name||'-', col.desc, y+8, { width:W*0.5 });

    // Badge kategori
    const catLabel = order.category_name||'Produk';
    const catW = Math.min(catLabel.length*7+16, 100);
    doc.roundedRect(col.cat, y+12, catW, 18, 3).fillColor('#FFF3E8').fill();
    doc.fontSize(9).fillColor(ORANGE).font('Helvetica-Bold').text(catLabel, col.cat+4, y+16, { width:catW-8, align:'center' });

    doc.fontSize(11).fillColor(BLACK).font('Helvetica-Bold')
       .text(idrFmt(subtotal), LEFT, y+14, { width:W-8, align:'right' });
    y += rowH;

    // Row diskon (jika ada)
    if (discount > 0) {
      doc.rect(LEFT, y, W, 40).fillColor('#F0FDF4').fill();
      doc.moveTo(LEFT, y+40).lineTo(RIGHT, y+40).lineWidth(0.5).strokeColor(LINE).stroke();
      doc.fontSize(11).fillColor('#22A85A').font('Helvetica-Bold').text('Diskon Kode Redeem', col.desc, y+8, { width:W*0.5 });
      doc.fontSize(9).fillColor(GRAY).font('Helvetica').text(`Kode: ${order.redeem_code}`, col.desc, y+22, { width:W*0.5 });
      const dW = Math.min(50, 60);
      doc.roundedRect(col.cat, y+10, dW, 18, 3).fillColor('#DCFCE7').fill();
      doc.fontSize(9).fillColor('#22A85A').font('Helvetica-Bold').text('Diskon', col.cat+2, y+14, { width:dW-4, align:'center' });
      doc.fontSize(11).fillColor('#22A85A').font('Helvetica-Bold')
         .text(`-${idrFmt(discount)}`, LEFT, y+14, { width:W-8, align:'right' });
      y += 40;
    }
    y += 12;

    // ── Summary ──────────────────────────────────────────────────
    const sumX = LEFT + W*0.55, sumW = W*0.45;
    const rows = [
      ['Subtotal',              idrFmt(order.amount||0), BLACK, false],
      ['Biaya Layanan (2.5%)',  idrFmt(serviceFee),      BLACK, false],
      ...(discount>0 ? [['Diskon Redeem', `-${idrFmt(discount)}`, '#22A85A', false]] : []),
    ];
    for (const [lbl,val,color] of rows) {
      doc.fontSize(10).fillColor(GRAY).font('Helvetica').text(lbl, sumX, y, { width:sumW*0.6 });
      doc.fontSize(10).fillColor(color).font('Helvetica').text(val, sumX+sumW*0.6, y, { width:sumW*0.4, align:'right' });
      y += 16;
    }
    // Garis total
    doc.moveTo(sumX, y).lineTo(RIGHT, y).lineWidth(1.5).strokeColor(BLACK).stroke();
    y += 8;
    doc.fontSize(14).fillColor(BLACK).font('Helvetica-Bold').text('Total Pembayaran', sumX, y);
    doc.fontSize(14).fillColor(ORANGE).font('Helvetica-Bold').text(idrFmt(total), sumX, y, { width:sumW, align:'right' });
    y += 28;

    // ── Status delivered ─────────────────────────────────────────
    if (['success','settlement','capture'].includes(order.payment_status)) {
      const chipColor = order.plugin_notified ? '#22A85A' : '#F59E0B';
      const chipBg    = order.plugin_notified ? '#F0FDF4' : '#FFFBEB';
      const chipText  = order.plugin_notified ? '✓ Item telah dikirim ke server Minecraft' : '⏳ Menunggu pengiriman item ke server';
      doc.roundedRect(LEFT, y, 280, 22, 4).fillColor(chipBg).fill();
      doc.fontSize(9).fillColor(chipColor).font('Helvetica-Bold').text(chipText, LEFT+8, y+6, { width:264 });
      y += 30;
    }

    // ── Footer ────────────────────────────────────────────────────
    doc.moveTo(LEFT, y).lineTo(RIGHT, y).lineWidth(0.5).strokeColor(LINE).stroke();
    y += 10;
    doc.fontSize(8).fillColor(GRAY).font('Helvetica')
       .text('Dokumen ini digenerate otomatis oleh Fancy Network Store · Simpan sebagai bukti pembayaran resmi.', LEFT, y, { width:W, align:'center' });

    doc.end();
  });
}

// ── Webhook transaksi + kirim PDF ───────────────────────────────
export async function webhookTransaction(order) {
  const url = process.env.DISCORD_WEBHOOK_TX;
  if (!url) { console.warn('[discord] DISCORD_WEBHOOK_TX tidak di-set'); return; }

  const s     = order.payment_status;
  const emoji = STATUS_EMOJI[s]  || '🔄';
  const color = STATUS_COLOR[s]  || 0x3b82f6;

  const content = `**${emoji} [${s?.toUpperCase()}]** · Player: \`${order.player_username}\` · Order: \`${order.order_id}\` · Discord: \`${order.discord_username||'-'}\``;

  // Kirim embed dulu (cepat)
  await sendEmbed(url, {
    content,
    embeds: [{
      title: `${emoji} Transaksi ${s?.toUpperCase()}`,
      color,
      fields: [
        { name:'🆔 Order ID',      value:`\`${order.order_id}\``,              inline:true },
        { name:'👤 Player MC',      value:String(order.player_username),        inline:true },
        { name:'💬 Discord',        value:String(order.discord_username||'-'),  inline:true },
        { name:'📦 Produk',         value:String(order.product_name||'-'),      inline:true },
        { name:'💰 Total',          value:idr(order.amount),                    inline:true },
        { name:'🎁 Reward Trigger', value:String(order.reward_trigger||'-'),    inline:true },
        { name:'💳 Metode',         value:String(order.payment_method||'qris'), inline:true },
        ...(order.discount_amount>0 ? [{ name:'🏷️ Diskon', value:idr(order.discount_amount), inline:true }] : []),
      ],
      timestamp: new Date().toISOString(),
      footer: { text: 'Fancy Network Store' },
    }],
  });

  // Kirim PDF invoice sebagai attachment
  try {
    const pdfBuffer = await generateInvoicePdf(order);
    const filename  = `invoice-${order.order_id}.pdf`;
    await sendFile(url, filename, pdfBuffer, 'application/pdf', {
      content: `📄 Invoice PDF · \`${order.order_id}\``,
    });
  } catch (e) {
    console.error('[discord] Gagal generate/kirim PDF:', e.message);
  }
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
        { name:'🎫 Ticket ID', value:`\`${ticket.ticket_id}\``,                    inline:true },
        { name:'👤 Player',    value:String(ticket.player_username),               inline:true },
        { name:'📋 Subjek',    value:String(ticket.subject),                       inline:false },
        { name:'📝 Deskripsi', value:String(ticket.description||'').slice(0,500),  inline:false },
        ...(ticket.target_player ? [{ name:'🎯 Target', value:ticket.target_player, inline:true }] : []),
      ],
      timestamp: new Date().toISOString(),
      footer: { text: 'Fancy Network Support' },
    }],
  });
}

// ── Arsip tiket ──────────────────────────────────────────────────
export async function webhookTicketArchive(ticket) {
  const url = process.env.DISCORD_WEBHOOK_REPORT;
  if (!url) return;
  const types  = { banding:'Aju Banding', bug:'Report Bug', report_player:'Report Pemain', lainnya:'Lainnya' };
  const colors = { resolved:0x2ecc71, rejected:0xe74c3c, expired:0x95a5a6 };
  const lines  = [
    `===== ARSIP TIKET: ${ticket.ticket_id} =====`,
    `Tipe    : ${types[ticket.type]||ticket.type}`,
    `Player  : ${ticket.player_username}`,
    `Subjek  : ${ticket.subject}`,
    `Status  : ${ticket.status}`,
    `Dibuat  : ${ticket.created_at}`,
    `Update  : ${ticket.updated_at}`,
    ticket.target_player ? `Target  : ${ticket.target_player}` : null,
    ticket.admin_notes   ? `Catatan : ${ticket.admin_notes}`   : null,
    '', '===== PERCAKAPAN =====',
    ...(ticket.messages||[]).map(m => {
      const time = m.created_at ? new Date(m.created_at).toLocaleString('id-ID') : '';
      return `[${time}] ${m.sender_type==='admin'?'[ADMIN]':'[PLAYER]'} ${m.sender}: ${m.text}`;
    }),
    '', '===== SELESAI =====',
  ].filter(Boolean).join('\n');

  await sendFile(url, `${ticket.ticket_id}.txt`, Buffer.from(lines,'utf-8'), 'text/plain; charset=utf-8', {
    content: `📁 Arsip tiket \`${ticket.ticket_id}\` (${ticket.player_username}) — Status: **${ticket.status}**`,
    embeds: [{
      title: `📁 Arsip: ${ticket.ticket_id}`,
      color: colors[ticket.status]||0x95a5a6,
      fields: [
        { name:'👤 Player', value:ticket.player_username,               inline:true },
        { name:'📋 Subjek', value:ticket.subject,                       inline:true },
        { name:'📊 Status', value:ticket.status,                        inline:true },
        { name:'💬 Pesan',  value:String((ticket.messages||[]).length), inline:true },
        { name:'📅 Dibuat', value:ticket.created_at?.slice(0,10)||'-',  inline:true },
      ],
      timestamp: new Date().toISOString(),
      footer: { text: 'Fancy Network Support — Auto Cleanup' },
    }],
  });
}

// ── Arsip log transaksi ──────────────────────────────────────────
export async function webhookOrderArchive(orders) {
  const url = process.env.DISCORD_WEBHOOK_TX;
  if (!url) return;
  const lines = [
    `Fancy Network Store — Arsip Log Transaksi`,
    `Tanggal cleanup: ${new Date().toISOString()}`,
    `Total: ${orders.length} transaksi`, '',
    ...orders.map(o => [
      `Order   : ${o.order_id}`,
      `Player  : ${o.player_username}`,
      `Discord : ${o.discord_username||'-'}`,
      `Produk  : ${o.product_name}`,
      `Total   : Rp ${Number(o.amount||0).toLocaleString('id-ID')}`,
      `Status  : ${o.payment_status}`,
      `Plugin  : ${o.plugin_notified?'Terkirim':o.plugin_queued?'Antri':'Gagal'}`,
      `Tanggal : ${o.created_at?.slice(0,19)||'-'}`,
      `---`,
    ].join('\n')),
  ];
  const filename = `orders-cleanup-${new Date().toISOString().slice(0,10)}.txt`;
  await sendFile(url, filename, Buffer.from(lines.join('\n'),'utf-8'), 'text/plain', {
    content: `🗃️ **Cleanup Log Transaksi** — ${orders.length} order diarsipkan`,
    embeds: [{
      title: '🗃️ Arsip Log Transaksi', color: 0xf59e0b,
      fields: [
        { name:'📊 Total',        value:String(orders.length), inline:true },
        { name:'✅ Sukses',        value:String(orders.filter(o=>['success','settlement','capture'].includes(o.payment_status)).length), inline:true },
        { name:'❌ Gagal/Expired', value:String(orders.filter(o=>['failed','expired','expire','cancelled','cancel'].includes(o.payment_status)).length), inline:true },
      ],
      timestamp: new Date().toISOString(),
      footer: { text: 'Fancy Network Store — Auto Cleanup' },
    }],
  });
}
