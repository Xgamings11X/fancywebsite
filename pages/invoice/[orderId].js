/**
 * pages/invoice/[orderId].js  (REVISI — Checkout via Snap EMBED)
 *
 * Perubahan utama dari versi Core API:
 * - Saat order masih pending DAN punya midtrans_snap_token, halaman ini menanam
 *   (embed) box pembayaran resmi Midtrans langsung ke <div id="snap-container">
 *   lewat <SnapEmbed> (snap.embed() — bukan pop-up snap.pay(), bukan UI custom).
 * - <PaymentInfoPanel> (QR/VA manual) tetap dipertahankan sebagai fallback untuk
 *   order LAMA yang dibuat lewat alur Core API sebelumnya (punya payment_info,
 *   tapi tidak punya midtrans_snap_token).
 * - Polling status tetap berjalan untuk auto-update saat webhook Midtrans masuk.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import FancyNav from '../../components/FancyNav';
import LogoImage, { useTransparentLogo } from '../../components/LogoImage';
import LoginModal from '../../components/LoginModal';
import Icon from '../../components/Icon';
import SnapEmbed from '../../components/SnapEmbed';

export async function getServerSideProps({ params }) {
  try {
    const { OrdersAsync, SettingsAsync } = await import('../../lib/redis.js');
    const [order, settings] = await Promise.all([
      OrdersAsync.byId(params.orderId),
      SettingsAsync.get(),
    ]);
    if (!order) return { notFound: true };
    return { props: { order, settings } };
  } catch (e) {
    console.error('[invoice/getSSP]', e.message);
    return { notFound: true };
  }
}

const idr       = v  => `Rp ${Number(v || 0).toLocaleString('id-ID')}`;
const formatDate = iso => {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('id-ID', {
    day:'2-digit', month:'long', year:'numeric',
    hour:'2-digit', minute:'2-digit', timeZone:'Asia/Jakarta',
  }) + ' WIB';
};

const PAID_STATUSES   = ['settlement','capture','success','paid'];
const FAILED_STATUSES = ['expire','cancel','cancelled','deny','failed','expired'];
const DONE_STATUSES   = [...PAID_STATUSES, ...FAILED_STATUSES];

const STATUS_CFG = {
  settlement: { label:'Pembayaran Berhasil',    icon:'circle-check',         color:'#2ecc71', bg:'rgba(46,204,113,0.08)',  border:'rgba(46,204,113,0.2)'  },
  capture:    { label:'Pembayaran Berhasil',    icon:'circle-check',         color:'#2ecc71', bg:'rgba(46,204,113,0.08)',  border:'rgba(46,204,113,0.2)'  },
  success:    { label:'Pembayaran Berhasil',    icon:'circle-check',         color:'#2ecc71', bg:'rgba(46,204,113,0.08)',  border:'rgba(46,204,113,0.2)'  },
  paid:       { label:'Pembayaran Berhasil',    icon:'circle-check',         color:'#2ecc71', bg:'rgba(46,204,113,0.08)',  border:'rgba(46,204,113,0.2)'  },
  pending:    { label:'Menunggu Pembayaran',    icon:'clock',                color:'#ffc800', bg:'rgba(255,200,0,0.08)',   border:'rgba(255,200,0,0.2)'   },
  expire:     { label:'Transaksi Kadaluarsa',   icon:'circle-xmark',         color:'#ff3b30', bg:'rgba(255,59,48,0.08)',   border:'rgba(255,59,48,0.2)'   },
  expired:    { label:'Transaksi Kadaluarsa',   icon:'circle-xmark',         color:'#ff3b30', bg:'rgba(255,59,48,0.08)',   border:'rgba(255,59,48,0.2)'   },
  cancel:     { label:'Transaksi Dibatalkan',   icon:'xmark',                  color:'#888',    bg:'rgba(136,136,136,0.08)', border:'rgba(136,136,136,0.2)' },
  cancelled:  { label:'Transaksi Dibatalkan',   icon:'xmark',                  color:'#888',    bg:'rgba(136,136,136,0.08)', border:'rgba(136,136,136,0.2)' },
  deny:       { label:'Pembayaran Ditolak',     icon:'circle-exclamation', color:'#ff3b30', bg:'rgba(255,59,48,0.08)',   border:'rgba(255,59,48,0.2)'   },
  failed:     { label:'Pembayaran Gagal',       icon:'circle-exclamation', color:'#ff3b30', bg:'rgba(255,59,48,0.08)',   border:'rgba(255,59,48,0.2)'   },
};

// ── Komponen PaymentInfoPanel ─────────────────────────────────────────────────
// Menampilkan detail pembayaran sesuai jenis metode yang dipilih user.
// FIX: Menggunakan qrImageUrl (direct URL) + qrString (raw data fallback via QR API publik)
// sehingga QR code selalu terrender meski Midtrans tidak mengembalikan image URL.
function PaymentInfoPanel({ order }) {
  const [copied,        setCopied]       = useState(false);
  const [qrImgFailed,   setQrImgFailed]  = useState(false);
  const info   = order.payment_info || {};
  const method = order.payment_method || '';

  const copyText = (text) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  // ── Deteksi tipe pembayaran ──────────────────────────────────────────
  // PENTING: deteksi diutamakan dari ISI payment_info (shape-based), bukan
  // hanya dari string `method`. Ini supaya order LAMA yang payment_method-nya
  // sempat ter-overwrite jadi generic Midtrans type (bank_transfer/echannel/qris,
  // akibat bug versi sebelumnya) tetap bisa menampilkan instruksi pembayarannya.
  const isVA        = ['bni_va','bri_va','cimb_va','permata_va','bca_va','other_va','bank_transfer'].includes(method)
                       || (!!info.vaNumber && !info.billKey && !info.billCode);
  const isMandiri   = method === 'mandiri_va' || method === 'echannel'
                       || !!(info.billKey || info.billCode);
  const isGopay     = method === 'gopay' || (!!info.deeplinkUrl && method !== 'shopeepay');
  const isQRIS      = method === 'qris' || method === 'gopay_qris'
                       || (!isGopay && !!(info.qrImageUrl || info.qrString || info.qrUrl));
  const isShopeePay = method === 'shopeepay';

  const labelMap = {
    gopay_qris:  'QRIS Dinamis (GoPay)',
    gopay:       'GoPay',
    bni_va:      'BNI Virtual Account',
    bri_va:      'BRI Virtual Account',
    cimb_va:     'CIMB Niaga Virtual Account',
    permata_va:  'Permata Virtual Account',
    mandiri_va:  'Mandiri Bill Payment',
    // backward-compat: order lama / generic Midtrans payment_type
    qris:           'QRIS',
    shopeepay:      'ShopeePay',
    bca_va:         'BCA Virtual Account',
    other_va:       'Virtual Account',
    bank_transfer:  info.vaBank ? `${info.vaBank} Virtual Account` : 'Virtual Account',
    echannel:       'Mandiri Bill Payment',
  };

  // Resolusi sumber QR code:
  // 1. qrImageUrl  → URL gambar langsung dari Midtrans (preferred)
  // 2. qrString    → raw QR data → render via api.qrserver.com (publik, no CORS)
  // 3. qrUrl       → backward compat dengan order lama
  const qrImageSrc = (() => {
    const raw = info.qrString || info.qrUrl;
    if (info.qrImageUrl && !qrImgFailed) return { src: info.qrImageUrl, isExternal: true };
    if (raw) {
      if (raw.startsWith('http')) return { src: raw, isExternal: true };
      // raw QR string → buat URL ke QR generator publik
      return { src: `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&data=${encodeURIComponent(raw)}`, isExternal: false };
    }
    return null;
  })();

  const hasQR     = (isQRIS || isGopay) && qrImageSrc;
  const hasInfo   = hasQR || info.vaNumber || info.deeplinkUrl || info.billKey || info.billCode;
  const vaBankLbl = info.vaBank || method.replace('_va','').replace('_',' ').toUpperCase();

  // ── Sub-komponen: baris value bisa-di-copy (dipakai utk VA & Mandiri) ──
  const CopyRow = ({ label, value }) => (
    <div style={{ marginBottom: 12 }}>
      <p style={{
        fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 700,
        letterSpacing: 0.5, marginBottom: 6, textTransform: 'uppercase',
      }}>
        {label}
      </p>
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 8 }}>
        <div style={{
          flex: 1, minWidth: 0,
          background: 'rgba(0,0,0,0.3)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8,
          padding: '10px 14px',
          fontFamily: 'monospace',
          fontSize: 16, fontWeight: 700, color: '#fff', letterSpacing: 1.5,
          overflowX: 'auto', whiteSpace: 'nowrap',
        }}>
          {value}
        </div>
        <button
          onClick={() => copyText(value)}
          aria-label={`Salin ${label}`}
          style={{
            flexShrink: 0,
            background: copied ? 'rgba(46,204,113,0.12)' : 'rgba(255,255,255,0.06)',
            border: `1px solid ${copied ? 'rgba(46,204,113,0.3)' : 'rgba(255,255,255,0.1)'}`,
            color: copied ? '#2ecc71' : 'var(--text-muted)',
            borderRadius: 8, padding: '0 14px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s',
          }}
        >
          <Icon name={copied ? 'circle-check' : 'copy'} size={14}/>
        </button>
      </div>
    </div>
  );

  return (
    <div style={{
      background:   'rgba(255,200,0,0.04)',
      border:       '1px solid rgba(255,200,0,0.15)',
      borderRadius: 14,
      padding:      0,
      marginBottom: 16,
      overflow:     'hidden',
    }}>
      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '14px 20px',
        borderBottom: '1px solid rgba(255,200,0,0.12)',
        background: 'rgba(255,200,0,0.05)',
      }}>
        <span style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 28, height: 28, borderRadius: 8,
          background: 'rgba(255,200,0,0.15)', flexShrink: 0,
        }}>
          <Icon name="receipt" size={14} color="#ffc800"/>
        </span>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 1 }}>
            Instruksi Pembayaran
          </p>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {labelMap[method] || method || 'Metode Pembayaran'}
          </p>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ padding: '20px 22px' }}>

        {/* QR Code (QRIS / GoPay QR) */}
        {hasQR && (
          <div style={{ textAlign: 'center', marginBottom: (isVA || isMandiri) ? 20 : 4 }}>
            <div style={{
              display: 'inline-block', background: '#fff', borderRadius: 14,
              padding: 10, border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <img
                src={qrImageSrc.src}
                alt="QR Code Pembayaran"
                width={200} height={200}
                style={{ width: 200, height: 200, display: 'block', borderRadius: 6 }}
                onError={() => { if (!qrImgFailed) setQrImgFailed(true); }}
              />
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10 }}>
              Scan QR code ini dengan aplikasi {isQRIS ? 'e-wallet / mobile banking (support QRIS)' : 'GoPay'} kamu
            </p>
          </div>
        )}

        {/* Deeplink button (GoPay / ShopeePay) */}
        {(isGopay || isShopeePay) && info.deeplinkUrl && (
          <button
            onClick={() => window.open(info.deeplinkUrl, '_blank', 'noopener,noreferrer')}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '12px 16px',
              background: isGopay ? '#00aed6' : '#ee4d2d',
              color: '#fff', borderRadius: 10, fontWeight: 700, fontSize: 13,
              border: 'none', cursor: 'pointer', marginBottom: 12, width: '100%',
            }}
          >
            <Icon name="mobile" size={16}/>
            Buka Aplikasi {isGopay ? 'GoPay' : 'ShopeePay'}
          </button>
        )}

        {/* Virtual Account */}
        {isVA && info.vaNumber && (
          <>
            <CopyRow label={`Nomor Virtual Account — ${vaBankLbl}`} value={info.vaNumber}/>
            <p style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Bayar melalui ATM, internet banking, atau mobile banking {vaBankLbl} sebelum batas waktu.
            </p>
          </>
        )}

        {/* Mandiri Bill Payment */}
        {isMandiri && (info.billKey || info.billCode) && (
          <>
            {info.billCode && <CopyRow label="Kode Perusahaan (Biller Code)" value={info.billCode}/>}
            {info.billKey  && <CopyRow label="Kode Pembayaran (Bill Key)"    value={info.billKey}/>}
            <p style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Bayar via menu <strong>Bayar / Beli → Multipayment</strong> di ATM Mandiri, atau Livin by Mandiri.
            </p>
          </>
        )}

        {/* Fallback jika payment_info benar-benar kosong */}
        {!hasInfo && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <Icon name="circle-exclamation" size={15} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: 1 }}/>
            <p style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Info pembayaran belum tersedia untuk order ini. Jika kamu sudah melakukan pembayaran,
              hubungi admin via Support dengan menyertakan Order ID di atas.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Invoice Page ─────────────────────────────────────────────────────────
export default function InvoicePage({ order: initialOrder, settings }) {
  const router     = useRouter();
  const s          = settings || {};
  const serverName = s.server_name || 'Fancy Network';
  const logoUrl    = s.logo_url    || '';
  const { src: logoSrc } = useTransparentLogo(logoUrl);

  const [player,    setPlayer]    = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [copied,    setCopied]    = useState(false);
  const [liveOrder, setLiveOrder] = useState(initialOrder);

  const pollRef = useRef(null);

  const statusKey = liveOrder?.payment_status || 'pending';
  const cfg       = STATUS_CFG[statusKey] || STATUS_CFG.pending;
  const isPaid    = PAID_STATUSES.includes(statusKey);
  const isDone    = DONE_STATUSES.includes(statusKey);
  const isPending = !isDone;

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    try { const r = localStorage.getItem('mc_player'); if (r) setPlayer(JSON.parse(r)); } catch {}
  }, []);
  const handleLogout       = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    setPlayer(null);
    localStorage.removeItem('mc_player');
    localStorage.removeItem('mc_token');
  };
  const handleLoginSuccess = p => { setPlayer(p); localStorage.setItem('mc_player', JSON.stringify(p)); setShowLogin(false); };

  // ── Verifikasi status order (dipakai saat mount & saat callback dari SnapEmbed) ──
  const checkNow = useCallback(async () => {
    try {
      const res  = await fetch('/api/orders/verify/' + initialOrder.order_id, { credentials: 'include' });
      const data = await res.json();
      if (data?.order) setLiveOrder(data.order);
    } catch {}
  }, [initialOrder.order_id]);

  useEffect(() => { checkNow(); }, [checkNow]);

  // ── Polling status setiap 3 detik ────────────────────────────────────────
  useEffect(() => {
    if (isDone) return;
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts++;
      try {
        const res  = await fetch('/api/orders/verify/' + initialOrder.order_id, { credentials: 'include' });
        const data = await res.json();
        if (data?.order) {
          setLiveOrder(data.order);
          if (DONE_STATUSES.includes(data.order.payment_status) || attempts >= 120) {
            clearInterval(pollRef.current);
          }
        }
      } catch {}
    }, 3000);
    return () => clearInterval(pollRef.current);
  }, []);

  // ── Download PDF ──────────────────────────────────────────────────────────
  const handleDownloadPdf = async () => {
    try {
      const res = await fetch(`/api/orders/invoice-pdf/${liveOrder.order_id}`);
      if (!res.ok) throw new Error('Gagal generate PDF');
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `invoice-${liveOrder.order_id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Gagal download invoice PDF: ' + e.message);
    }
  };

  const copyId     = () => {
    navigator.clipboard?.writeText(initialOrder.order_id).catch(() => {});
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const subtotal = (liveOrder.amount || 0) + (liveOrder.discount_amount || 0);
  const discount = liveOrder.discount_amount || 0;
  const total    = liveOrder.amount || 0;

  return (
    <>
      <Head>
        <title>Invoice #{initialOrder.order_id} | {serverName}</title>
        <meta name="robots" content="noindex,nofollow"/>
        <link rel="icon" type="image/png" href={s.logo_url || logoSrc || '/favicon.png'}/>
      </Head>

      <FancyNav player={player} onLoginClick={() => setShowLogin(true)} onLogout={handleLogout} settings={settings}/>
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} onSuccess={handleLoginSuccess}/>}

      <main style={{ paddingTop:120, paddingBottom:80, paddingLeft:24, paddingRight:24, display:'flex', flexDirection:'column', alignItems:'center' }}>

        {/* ── Status Banner ── */}
        <div style={{ width:'100%', maxWidth:820, display:'flex', alignItems:'center', gap:16, background:cfg.bg, border:`1px solid ${cfg.border}`, borderRadius:14, padding:'16px 22px', marginBottom:16, flexWrap:'wrap' }}>
          <div style={{ width:44, height:44, borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:20, background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.border}` }}>
            <Icon name={cfg.icon} size={20} color={cfg.color}/>
          </div>
          <div style={{ flex:1, minWidth:200 }}>
            <div style={{ fontFamily:'Space Grotesk,sans-serif', fontWeight:700, fontSize:16, color:'#fff' }}>{cfg.label}</div>
            <div style={{ fontSize:13, color:'var(--text-muted)', marginTop:2 }}>
              {isPaid    ? 'Item dikirim otomatis ke akun Minecraft kamu — terkirim instan begitu pembayaran berhasil dikonfirmasi.'
              : isPending ? 'Selesaikan pembayaran menggunakan instruksi di bawah.'
              :             'Transaksi ini tidak berhasil diselesaikan.'}
            </div>
          </div>
          {/* Auto-refresh indicator */}
          {isPending && (
            <div style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:12, color:'var(--text-muted)' }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background:'#ffc800', boxShadow:'0 0 6px #ffc800', display:'inline-block', animation:'pulse 1.5s ease-in-out infinite' }}/>
              Memantau status...
            </div>
          )}
        </div>

        {/* ── Pembayaran (hanya saat pending) ── */}
        {isPending && (
          <div style={{ width:'100%', maxWidth:820, marginBottom:0 }}>
            {(liveOrder.midtrans_snap_token || initialOrder.midtrans_snap_token) ? (
              <div style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14,
                padding: '20px 20px 6px', marginBottom: 16, backdropFilter: 'blur(12px)',
              }}>
                <h4 style={{ fontSize:11, textTransform:'uppercase', letterSpacing:'1.2px', color:'var(--primary-light)', marginBottom:14, fontWeight:700 }}>
                  Pilih Metode Pembayaran
                </h4>
                <SnapEmbed
                  snapToken={liveOrder.midtrans_snap_token || initialOrder.midtrans_snap_token}
                  embedId="snap-container"
                  onSuccess={checkNow}
                  onPending={checkNow}
                />
              </div>
            ) : (
              <PaymentInfoPanel order={liveOrder}/>
            )}
          </div>
        )}

        {/* ── Invoice Card ── */}
        <div style={{ width:'100%', maxWidth:820, background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:24, padding:40, backdropFilter:'blur(12px)', position:'relative', overflow:'hidden', boxShadow:'0 20px 50px rgba(0,0,0,0.5)' }}>
          <div style={{ position:'absolute', top:0, left:0, width:'100%', height:4, background:'linear-gradient(90deg,var(--primary),var(--primary-light))', boxShadow:'0 2px 20px var(--primary-glow)' }}/>

          {/* Header */}
          <header data-anim="fade-up" data-delay="1" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', borderBottom:'1px solid rgba(255,255,255,0.06)', paddingBottom:28, marginBottom:28, flexWrap:'wrap', gap:16 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <LogoImage src={logoUrl||undefined} alt={serverName} style={{ height:38, width:38, objectFit:'contain', filter:'drop-shadow(0 0 10px rgba(255,107,0,0.55))' }}/>
              <div>
                <div style={{ fontFamily:'Space Grotesk,sans-serif', fontWeight:700, fontSize:20, letterSpacing:0.5 }}>
                  <span style={{ color:'var(--primary)' }}>FANCY</span>{' '}
                  <span>{serverName.replace(/fancy/gi,'').trim()||'NETWORK'}</span>
                </div>
                <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:1 }}>Fancy Network</div>
              </div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:8 }}>
              <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'6px 14px', borderRadius:100, background:cfg.bg, border:`1px solid ${cfg.border}`, color:cfg.color, fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:1 }}>
                <Icon name={cfg.icon} size={20} color={cfg.color}/> {cfg.label}
              </div>
              <button onClick={copyId} style={{ fontFamily:'Space Grotesk,sans-serif', fontSize:14, fontWeight:700, color:'#fff', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8, padding:'5px 12px', cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
                <Icon name={copied?'circle-check':'copy'} size={11} style={{opacity:0.7}}/> #{initialOrder.order_id}
              </button>
            </div>
          </header>

          {/* Details grid */}
          <section data-anim="fade-up" data-delay="2" style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:28, marginBottom:32 }}>
            <div>
              <h4 style={{ fontSize:11, textTransform:'uppercase', letterSpacing:'1.2px', color:'var(--primary-light)', marginBottom:12, fontWeight:700 }}>Ditagih Kepada</h4>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <img
                  src={liveOrder.player_uuid
                    ? `https://crafatar.com/renders/head/${liveOrder.player_uuid}?size=64&overlay`
                    : `https://minotar.net/helm/${encodeURIComponent(liveOrder.player_username||'steve')}/64`}
                  alt={liveOrder.player_username}
                  style={{ width:40, height:40, borderRadius:6, imageRendering:'pixelated', flexShrink:0, border:'1px solid rgba(255,255,255,0.08)' }}
                  onError={e => { e.target.src = 'https://minotar.net/helm/steve/64'; }}
                />
                <div>
                  <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:'rgba(255,255,255,0.04)', padding:'4px 10px', borderRadius:6, border:'1px solid rgba(255,255,255,0.06)', fontWeight:600, fontSize:14, color:'#fff' }}>
                    <Icon name="bolt" size={11} color="var(--primary)"/> {liveOrder.player_username}
                  </div>
                  {liveOrder.discord_username && (
                    <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:3, display:'flex', alignItems:'center', gap:5 }}>
                      <Icon name="discord" size={11} color="#5865F2"/> {liveOrder.discord_username}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div>
              <h4 style={{ fontSize:11, textTransform:'uppercase', letterSpacing:'1.2px', color:'var(--primary-light)', marginBottom:12, fontWeight:700 }}>Rincian Transaksi</h4>
              <div style={{ display:'grid', gridTemplateColumns:'auto 1fr', gap:'6px 12px', fontSize:13 }}>
                <span style={{ color:'var(--text-muted)' }}>Tanggal</span>
                <span style={{ fontWeight:500 }}>{formatDate(liveOrder.created_at)}</span>
                <span style={{ color:'var(--text-muted)' }}>Metode</span>
                <span style={{ fontWeight:500 }}>{liveOrder.payment_method || 'QRIS'}</span>
                <span style={{ color:'var(--text-muted)' }}>ID Transaksi</span>
                <span style={{ fontFamily:'Space Grotesk,sans-serif', fontSize:12, fontWeight:500 }}>{initialOrder.order_id}</span>
                {liveOrder.redeem_code && (
                  <>
                    <span style={{ color:'var(--text-muted)' }}>Kode Redeem</span>
                    <span style={{ color:'#2ecc71', fontWeight:500 }}>{liveOrder.redeem_code}</span>
                  </>
                )}
              </div>
            </div>
          </section>

          {/* Table */}
          <section data-anim="fade-up" data-delay="3" style={{ width:'100%', overflowX:'auto', marginBottom:24 }}>
            <table style={{ width:'100%', borderCollapse:'collapse', textAlign:'left' }}>
              <thead>
                <tr>
                  {['Deskripsi Produk','Kategori','Harga'].map((h,i) => (
                    <th key={h} style={{ fontSize:11, textTransform:'uppercase', letterSpacing:'0.5px', color:'var(--text-muted)', padding:'10px 14px', borderBottom:'1px solid rgba(255,255,255,0.08)', fontWeight:700, textAlign:i===2?'right':'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding:'16px 14px', borderBottom:'1px solid rgba(255,255,255,0.04)', fontSize:14, color:'#fff' }}>
                    <div style={{ fontWeight:600 }}>{liveOrder.product_name}</div>
                  </td>
                  <td style={{ padding:'16px 14px', borderBottom:'1px solid rgba(255,255,255,0.04)', fontSize:14, color:'#fff' }}>
                    <span style={{ background:'rgba(255,107,0,0.1)', border:'1px solid rgba(255,107,0,0.18)', color:'var(--primary-light)', padding:'3px 10px', borderRadius:100, fontSize:11, fontWeight:600 }}>{liveOrder.category_name||'Produk'}</span>
                  </td>
                  <td style={{ padding:'16px 14px', borderBottom:'1px solid rgba(255,255,255,0.04)', fontSize:14, color:'#fff', textAlign:'right', fontWeight:600 }}>{idr(subtotal)}</td>
                </tr>
                {discount > 0 && (
                  <tr>
                    <td style={{ padding:'16px 14px', borderBottom:'1px solid rgba(255,255,255,0.04)', fontSize:14, color:'#2ecc71' }}><div style={{ fontWeight:600 }}>Diskon Kode Redeem</div><div style={{ fontSize:12, color:'var(--text-muted)', marginTop:3 }}>Kode: {liveOrder.redeem_code}</div></td>
                    <td style={{ padding:'16px 14px', borderBottom:'1px solid rgba(255,255,255,0.04)', textAlign:'right' }}><span style={{ background:'rgba(46,204,113,0.1)', border:'1px solid rgba(46,204,113,0.2)', color:'#2ecc71', padding:'3px 10px', borderRadius:100, fontSize:11, fontWeight:600 }}>Diskon</span></td>
                    <td style={{ padding:'16px 14px', borderBottom:'1px solid rgba(255,255,255,0.04)', textAlign:'right', color:'#2ecc71', fontWeight:600 }}>-{idr(discount)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>

          {/* Summary */}
          <section style={{ display:'flex', justifyContent:'flex-end', marginBottom:24 }}>
            <div style={{ width:'100%', maxWidth:340, display:'flex', flexDirection:'column', gap:10 }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:14, color:'var(--text-muted)' }}>
                <span>Subtotal</span><span>{idr(liveOrder.amount||0)}</span>
              </div>
              {discount > 0 && (
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:14, color:'#2ecc71' }}><span>Diskon Redeem</span><span>-{idr(discount)}</span></div>
              )}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', borderTop:'1px solid rgba(255,255,255,0.08)', paddingTop:14, marginTop:4, color:'#fff', fontWeight:700, fontSize:18 }}>
                <span>Total Pembayaran</span>
                <span style={{ color:'var(--primary-light)', fontFamily:'Space Grotesk,sans-serif' }}>{idr(total)}</span>
              </div>
            </div>
          </section>

          {/* Delivery status */}
          {isPaid && (
            <div style={{ marginBottom:24 }}>
              <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'8px 16px', borderRadius:100, fontSize:13, fontWeight:600, ...(liveOrder.plugin_notified ? { background:'rgba(46,204,113,0.08)', border:'1px solid rgba(46,204,113,0.2)', color:'#2ecc71' } : { background:'rgba(255,200,0,0.08)', border:'1px solid rgba(255,200,0,0.2)', color:'#ffc800' }) }}>
                <Icon name={liveOrder.plugin_notified ? 'circle-check' : 'clock'} size={14}/>
                {liveOrder.plugin_notified ? 'Item telah dikirim otomatis ke server Minecraft' : 'Item sedang dikirim otomatis ke server Minecraft'}
              </div>
            </div>
          )}

          {/* Footer actions */}
          <footer style={{ display:'flex', justifyContent:'space-between', alignItems:'center', borderTop:'1px solid rgba(255,255,255,0.06)', paddingTop:28, flexWrap:'wrap', gap:16 }}>
            <Link href="/store" style={{ color:'var(--text-muted)', textDecoration:'none', fontSize:13, fontWeight:600, display:'inline-flex', alignItems:'center', gap:8 }}>
              <Icon name="arrow-left" size={13} style={{marginRight:6}}/> Kembali ke Store
            </Link>
            <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
              {!isPending && (
                <button onClick={handleDownloadPdf} className="btn-ghost-fn" style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, fontWeight:600 }}>
                  <Icon name="folder-open" size={14} style={{marginRight:6}}/> Download PDF
                </button>
              )}
              <button onClick={copyId} className="btn-ghost-fn" style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, fontWeight:600 }}>
                <Icon name={copied?'circle-check':'copy'} size={13}/>
                {copied ? 'Tersalin!' : 'Salin ID Order'}
              </button>
            </div>
          </footer>
        </div>

        <p style={{ marginTop:24, fontSize:12, color:'var(--text-muted)', textAlign:'center', maxWidth:500 }}>
          Item dikirim otomatis & instan ke akun Minecraft kamu begitu pembayaran berhasil. Simpan halaman ini sebagai bukti pembayaran.
          Jika item belum masuk, segera hubungi kami di{' '}
          <Link href="/support" style={{ color:'var(--primary)', textDecoration:'none', fontWeight:600 }}>Support</Link>.
        </p>
      </main>
    </>
  );
}
