/**
 * pages/invoice/[orderId].js
 * - Landing → langsung buka Snap payment gateway otomatis
 * - Tombol buka lagi jika snap ditutup
 * - Download PDF (print dialog)
 * - Expired otomatis 1 hari (24 jam) via midtrans expiry
 * - Cancel jika user keluar halaman saat pending
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import FancyNav from '../../components/FancyNav';
import LogoImage, { useTransparentLogo } from '../../components/LogoImage';
import LoginModal from '../../components/LoginModal';

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

const idr = v => `Rp ${Number(v||0).toLocaleString('id-ID')}`;
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
  settlement: { label:'Pembayaran Berhasil',    icon:'fa-circle-check',         color:'#2ecc71', bg:'rgba(46,204,113,0.08)',  border:'rgba(46,204,113,0.2)'  },
  capture:    { label:'Pembayaran Berhasil',    icon:'fa-circle-check',         color:'#2ecc71', bg:'rgba(46,204,113,0.08)',  border:'rgba(46,204,113,0.2)'  },
  success:    { label:'Pembayaran Berhasil',    icon:'fa-circle-check',         color:'#2ecc71', bg:'rgba(46,204,113,0.08)',  border:'rgba(46,204,113,0.2)'  },
  paid:       { label:'Pembayaran Berhasil',    icon:'fa-circle-check',         color:'#2ecc71', bg:'rgba(46,204,113,0.08)',  border:'rgba(46,204,113,0.2)'  },
  pending:    { label:'Menunggu Pembayaran',    icon:'fa-clock',                color:'#ffc800', bg:'rgba(255,200,0,0.08)',   border:'rgba(255,200,0,0.2)'   },
  expire:     { label:'Transaksi Kadaluarsa',   icon:'fa-circle-xmark',         color:'#ff3b30', bg:'rgba(255,59,48,0.08)',   border:'rgba(255,59,48,0.2)'   },
  expired:    { label:'Transaksi Kadaluarsa',   icon:'fa-circle-xmark',         color:'#ff3b30', bg:'rgba(255,59,48,0.08)',   border:'rgba(255,59,48,0.2)'   },
  cancel:     { label:'Transaksi Dibatalkan',   icon:'fa-ban',                  color:'#888',    bg:'rgba(136,136,136,0.08)', border:'rgba(136,136,136,0.2)' },
  cancelled:  { label:'Transaksi Dibatalkan',   icon:'fa-ban',                  color:'#888',    bg:'rgba(136,136,136,0.08)', border:'rgba(136,136,136,0.2)' },
  deny:       { label:'Pembayaran Ditolak',     icon:'fa-triangle-exclamation', color:'#ff3b30', bg:'rgba(255,59,48,0.08)',   border:'rgba(255,59,48,0.2)'   },
  failed:     { label:'Pembayaran Gagal',       icon:'fa-triangle-exclamation', color:'#ff3b30', bg:'rgba(255,59,48,0.08)',   border:'rgba(255,59,48,0.2)'   },
};

export default function InvoicePage({ order: initialOrder, settings }) {
  const router     = useRouter();
  const s          = settings || {};
  const serverName = s.server_name || 'Fancy Network';
  const logoUrl    = s.logo_url || '';
  const { src: logoSrc } = useTransparentLogo(logoUrl);

  const [player,      setPlayer]      = useState(null);
  const [showLogin,   setShowLogin]   = useState(false);
  const [copied,      setCopied]      = useState(false);
  const [liveOrder,   setLiveOrder]   = useState(initialOrder);
  const [snapLoading, setSnapLoading] = useState(false);
  const [snapClosed,  setSnapClosed]  = useState(false);
  const [autoOpened,  setAutoOpened]  = useState(false);

  const pollRef    = useRef(null);
  const snapActive = useRef(false);

  const statusKey = liveOrder?.payment_status || 'pending';
  const cfg       = STATUS_CFG[statusKey] || STATUS_CFG.pending;
  const isPaid    = PAID_STATUSES.includes(statusKey);
  const isDone    = DONE_STATUSES.includes(statusKey);
  const isPending = !isDone;

  // ── Auth ────────────────────────────────────────────────────────
  useEffect(() => {
    try { const r = localStorage.getItem('mc_player'); if(r) setPlayer(JSON.parse(r)); } catch {}
  }, []);
  const handleLogout = async () => {
    await fetch('/api/auth/logout',{method:'POST',credentials:'include'});
    setPlayer(null); localStorage.removeItem('mc_player'); localStorage.removeItem('mc_token');
  };
  const handleLoginSuccess = p => { setPlayer(p); localStorage.setItem('mc_player',JSON.stringify(p)); setShowLogin(false); };

  // ── Verifikasi langsung saat halaman dibuka (untuk return dari payment gateway) ──
  useEffect(() => {
    const checkNow = async () => {
      try {
        const res  = await fetch('/api/orders/verify/'+initialOrder.order_id, { credentials:'include' });
        const data = await res.json();
        if (data?.order) setLiveOrder(data.order);
      } catch {}
    };
    checkNow();
  }, []);

  // ── Polling status ──────────────────────────────────────────────
  useEffect(() => {
    if (isDone) return;
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts++;
      try {
        const res  = await fetch('/api/orders/verify/'+initialOrder.order_id, { credentials:'include' });
        const data = await res.json();
        if (data?.order) {
          setLiveOrder(data.order);
          if (DONE_STATUSES.includes(data.order.payment_status) || attempts >= 60) {
            clearInterval(pollRef.current);
          }
        }
      } catch {}
    }, 3000);
    return () => clearInterval(pollRef.current);
  }, []);

  // ── Cancel saat user navigasi keluar ───────────────────────────
  useEffect(() => {
    const onUnload = () => {
      if (!isDone && !snapActive.current)
        navigator.sendBeacon('/api/orders/cancel', JSON.stringify({ orderId: initialOrder.order_id }));
    };
    const onRoute = url => {
      if (!url.startsWith('/invoice/') && isPending && !snapActive.current) {
        fetch('/api/orders/cancel', {
          method:'POST', credentials:'include',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ orderId: initialOrder.order_id }),
        }).catch(()=>{});
      }
    };
    window.addEventListener('beforeunload', onUnload);
    router.events.on('routeChangeStart', onRoute);
    return () => {
      window.removeEventListener('beforeunload', onUnload);
      router.events.off('routeChangeStart', onRoute);
    };
  }, [isPending, isDone]);

  // ── Buka Snap ───────────────────────────────────────────────────
  const openSnap = useCallback(async () => {
    const snapToken = liveOrder?.midtrans_snap_token;
    if (!snapToken) { alert('Token pembayaran tidak ditemukan. Hubungi admin.'); return; }

    setSnapLoading(true);
    setSnapClosed(false);
    snapActive.current = true;

    try {
      const clientKey = s.midtrans_client_key || process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || '';
      const env       = (s.midtrans_env || process.env.NEXT_PUBLIC_MIDTRANS_ENV) === 'production' ? 'app' : 'app.sandbox';

      // Inject/reload snap.js
      const old = document.querySelector('script[src*="midtrans.com/snap"]');
      if (old) { old.remove(); delete window.snap; }
      await new Promise((resolve, reject) => {
        const sc = document.createElement('script');
        sc.src = `https://${env}.midtrans.com/snap/snap.js`;
        sc.setAttribute('data-client-key', clientKey);
        sc.onload = resolve; sc.onerror = reject;
        document.head.appendChild(sc);
      });

      setSnapLoading(false);

      const refreshOrder = async () => {
        snapActive.current = false;
        try {
          const r = await fetch('/api/orders/verify/'+liveOrder.order_id, { credentials:'include' });
          const d = await r.json();
          if (d.order) setLiveOrder(d.order);
        } catch {}
      };

      window.snap.pay(snapToken, {
        onSuccess: async () => { await refreshOrder(); },
        onPending: async () => { await refreshOrder(); },
        onError:   async () => { snapActive.current = false; setSnapClosed(true); await refreshOrder(); },
        onClose:   async () => {
          snapActive.current = false;
          try {
            const r = await fetch('/api/orders/verify/'+liveOrder.order_id, { credentials:'include' });
            const d = await r.json();
            if (d.order) {
              setLiveOrder(d.order);
              if (!PAID_STATUSES.includes(d.order.payment_status)) setSnapClosed(true);
            }
          } catch { setSnapClosed(true); }
        },
      });
    } catch (e) {
      snapActive.current = false;
      setSnapLoading(false);
      alert('Gagal membuka payment gateway: ' + e.message);
    }
  }, [liveOrder, s]);

  // ── Auto-buka Snap saat pertama landing (jika pending) ─────────
  useEffect(() => {
    if (isPending && !autoOpened && liveOrder?.midtrans_snap_token) {
      setAutoOpened(true);
      // Delay sedikit agar halaman render dulu
      setTimeout(() => openSnap(), 800);
    }
  }, [isPending, liveOrder?.midtrans_snap_token]);

  // ── Download PDF ────────────────────────────────────────────────
  const handleDownloadPdf = () => {
    const html = generateInvoiceHtml(liveOrder, serverName, logoSrc);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `invoice-${liveOrder.order_id}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ── Copy order ID ───────────────────────────────────────────────
  const copyId = () => {
    navigator.clipboard?.writeText(initialOrder.order_id).catch(()=>{});
    setCopied(true); setTimeout(()=>setCopied(false), 2000);
  };

  const subtotal   = (liveOrder.amount||0) + (liveOrder.discount_amount||0);
  const discount   = liveOrder.discount_amount||0;
  const serviceFee = Math.round((liveOrder.amount||0)*0.025);
  const total      = (liveOrder.amount||0) + serviceFee;

  return (
    <>
      <Head>
        <title>Invoice #{initialOrder.order_id} | {serverName}</title>
        <meta name="robots" content="noindex,nofollow"/>
        <link rel="icon" type="image/png" href={s.logo_url || logoSrc || '/favicon.png'}/>
      </Head>

      <FancyNav player={player} onLoginClick={()=>setShowLogin(true)} onLogout={handleLogout} settings={settings}/>
      {showLogin && <LoginModal onClose={()=>setShowLogin(false)} onSuccess={handleLoginSuccess}/>}

      <main style={{paddingTop:120,paddingBottom:80,paddingLeft:24,paddingRight:24,display:'flex',flexDirection:'column',alignItems:'center'}}>

        {/* Status Banner */}
        <div style={{width:'100%',maxWidth:820,display:'flex',alignItems:'center',gap:16,background:cfg.bg,border:`1px solid ${cfg.border}`,borderRadius:14,padding:'16px 22px',marginBottom:16,flexWrap:'wrap'}}>
          <div style={{width:44,height:44,borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:20,background:cfg.bg,color:cfg.color,border:`1px solid ${cfg.border}`}}>
            <i className={`fa-solid ${cfg.icon}`}/>
          </div>
          <div style={{flex:1,minWidth:200}}>
            <div style={{fontFamily:'Space Grotesk,sans-serif',fontWeight:700,fontSize:16,color:'#fff'}}>{cfg.label}</div>
            <div style={{fontSize:13,color:'var(--text-muted)',marginTop:2}}>
              {isPaid    ? 'Item akan dikirim ke akun Minecraft kamu dalam beberapa saat.'
              : isPending ? 'Selesaikan pembayaran di payment gateway untuk melanjutkan.'
              :             'Transaksi ini tidak berhasil diselesaikan.'}
            </div>
          </div>
          {isPending && (
            <button onClick={openSnap} disabled={snapLoading} style={{display:'inline-flex',alignItems:'center',gap:8,padding:'10px 20px',background:'linear-gradient(135deg,var(--primary),var(--primary-light))',color:'#fff',border:'none',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap',flexShrink:0,opacity:snapLoading?0.6:1,boxShadow:'0 4px 16px rgba(255,107,0,0.3)'}}>
              <i className={`fa-solid ${snapLoading?'fa-spinner fa-spin':snapClosed?'fa-rotate-right':'fa-credit-card'}`}/>
              {snapLoading?'Memuat...':snapClosed?'Buka Lagi':'Bayar Sekarang'}
            </button>
          )}
        </div>

        {/* Reopen bar */}
        {isPending && snapClosed && (
          <div style={{width:'100%',maxWidth:820,display:'flex',alignItems:'center',gap:12,background:'rgba(255,200,0,0.07)',border:'1px solid rgba(255,200,0,0.2)',borderRadius:12,padding:'12px 18px',marginBottom:12,fontSize:13,color:'var(--text-muted)',flexWrap:'wrap'}}>
            <i className="fa-solid fa-circle-info" style={{color:'#ffc800',flexShrink:0}}/>
            <span style={{flex:1}}>Payment gateway ditutup. Klik tombol di atas untuk membuka lagi, atau <Link href="/store" style={{color:'var(--primary)',fontWeight:600}}>kembali ke store</Link> (order akan dibatalkan otomatis).</span>
          </div>
        )}

        {/* Invoice Card */}
        <div style={{width:'100%',maxWidth:820,background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:24,padding:40,backdropFilter:'blur(12px)',position:'relative',overflow:'hidden',boxShadow:'0 20px 50px rgba(0,0,0,0.5)'}}>
          <div style={{position:'absolute',top:0,left:0,width:'100%',height:4,background:'linear-gradient(90deg,var(--primary),var(--primary-light))',boxShadow:'0 2px 20px var(--primary-glow)'}}/>

          {/* Header */}
          <header style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',borderBottom:'1px solid rgba(255,255,255,0.06)',paddingBottom:28,marginBottom:28,flexWrap:'wrap',gap:16}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <LogoImage src={logoUrl||undefined} alt={serverName} style={{height:38,width:38,objectFit:'contain',filter:'drop-shadow(0 0 10px rgba(255,107,0,0.55))'}}/>
              <div>
                <div style={{fontFamily:'Space Grotesk,sans-serif',fontWeight:700,fontSize:20,letterSpacing:0.5}}>
                  <span style={{color:'var(--primary)'}}>FANCY</span>{' '}
                  <span>{serverName.replace(/fancy/gi,'').trim()||'NETWORK'}</span>
                </div>
                <div style={{fontSize:12,color:'var(--text-muted)',marginTop:1}}>Premium Minecraft Server Shop</div>
              </div>
            </div>
            <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:8}}>
              <div style={{display:'inline-flex',alignItems:'center',gap:6,padding:'6px 14px',borderRadius:100,background:cfg.bg,border:`1px solid ${cfg.border}`,color:cfg.color,fontSize:12,fontWeight:700,textTransform:'uppercase',letterSpacing:1}}>
                <i className={`fa-solid ${cfg.icon}`}/> {cfg.label}
              </div>
              <button onClick={copyId} style={{fontFamily:'Space Grotesk,sans-serif',fontSize:14,fontWeight:700,color:'#fff',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:8,padding:'5px 12px',cursor:'pointer',display:'flex',alignItems:'center',gap:6}}>
                <i className={`fa-solid ${copied?'fa-check':'fa-copy'}`} style={{fontSize:11,opacity:0.6}}/> #{initialOrder.order_id}
              </button>
            </div>
          </header>

          {/* Details grid */}
          <section style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:28,marginBottom:32}}>
            <div>
              <h4 style={{fontSize:11,textTransform:'uppercase',letterSpacing:'1.2px',color:'var(--primary-light)',marginBottom:12,fontWeight:700}}>Ditagih Kepada</h4>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <img src={liveOrder.player_uuid?`https://crafatar.com/avatars/${liveOrder.player_uuid}?size=64&overlay`:`https://minotar.net/helm/${encodeURIComponent(liveOrder.player_username||'steve')}/64`} alt={liveOrder.player_username} style={{width:40,height:40,borderRadius:6,imageRendering:'pixelated',flexShrink:0,border:'1px solid rgba(255,255,255,0.08)'}} onError={e=>{e.target.src='https://minotar.net/helm/steve/64';}}/>
                <div>
                  <div style={{display:'inline-flex',alignItems:'center',gap:6,background:'rgba(255,255,255,0.04)',padding:'4px 10px',borderRadius:6,border:'1px solid rgba(255,255,255,0.06)',fontWeight:600,fontSize:14,color:'#fff'}}>
                    <i className="fa-solid fa-gamepad" style={{fontSize:11,color:'var(--primary)'}}/> {liveOrder.player_username}
                  </div>
                  {liveOrder.discord_username && <div style={{fontSize:12,color:'var(--text-muted)',marginTop:3,display:'flex',alignItems:'center',gap:5}}><i className="fa-brands fa-discord" style={{fontSize:11,color:'#5865F2'}}/> {liveOrder.discord_username}</div>}
                </div>
              </div>
            </div>
            <div>
              <h4 style={{fontSize:11,textTransform:'uppercase',letterSpacing:'1.2px',color:'var(--primary-light)',marginBottom:12,fontWeight:700}}>Rincian Transaksi</h4>
              <div style={{display:'grid',gridTemplateColumns:'auto 1fr',gap:'6px 12px',fontSize:13}}>
                <span style={{color:'var(--text-muted)'}}>Tanggal</span><span style={{fontWeight:500}}>{formatDate(liveOrder.created_at)}</span>
                <span style={{color:'var(--text-muted)'}}>Metode</span><span style={{fontWeight:500}}>{liveOrder.payment_method||'QRIS'}</span>
                <span style={{color:'var(--text-muted)'}}>ID Transaksi</span><span style={{fontFamily:'Space Grotesk,sans-serif',fontSize:12,fontWeight:500}}>{initialOrder.order_id}</span>
                {liveOrder.redeem_code && <><span style={{color:'var(--text-muted)'}}>Kode Redeem</span><span style={{color:'#2ecc71',fontWeight:500}}>{liveOrder.redeem_code}</span></>}
              </div>
            </div>
          </section>

          {/* Table */}
          <section style={{width:'100%',overflowX:'auto',marginBottom:24}}>
            <table style={{width:'100%',borderCollapse:'collapse',textAlign:'left'}}>
              <thead>
                <tr>
                  {['Deskripsi Produk','Kategori','Harga'].map((h,i)=>(
                    <th key={h} style={{fontSize:11,textTransform:'uppercase',letterSpacing:'0.5px',color:'var(--text-muted)',padding:'10px 14px',borderBottom:'1px solid rgba(255,255,255,0.08)',fontWeight:700,textAlign:i===2?'right':'left'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{padding:'16px 14px',borderBottom:'1px solid rgba(255,255,255,0.04)',fontSize:14,color:'#fff'}}>
                    <div style={{fontWeight:600}}>{liveOrder.product_name}</div>
                    <div style={{fontSize:12,color:'var(--text-muted)',marginTop:3,display:'flex',alignItems:'center',gap:4}}><i className="fa-solid fa-infinity" style={{fontSize:10}}/> Durasi: Permanen</div>
                  </td>
                  <td style={{padding:'16px 14px',borderBottom:'1px solid rgba(255,255,255,0.04)',fontSize:14,color:'#fff'}}>
                    <span style={{background:'rgba(255,107,0,0.1)',border:'1px solid rgba(255,107,0,0.18)',color:'var(--primary-light)',padding:'3px 10px',borderRadius:100,fontSize:11,fontWeight:600}}>{liveOrder.category_name||'Produk'}</span>
                  </td>
                  <td style={{padding:'16px 14px',borderBottom:'1px solid rgba(255,255,255,0.04)',fontSize:14,color:'#fff',textAlign:'right',fontWeight:600}}>{idr(subtotal)}</td>
                </tr>
                {discount>0 && (
                  <tr>
                    <td style={{padding:'16px 14px',borderBottom:'1px solid rgba(255,255,255,0.04)',fontSize:14,color:'#2ecc71'}}><div style={{fontWeight:600}}>Diskon Kode Redeem</div><div style={{fontSize:12,color:'var(--text-muted)',marginTop:3}}>Kode: {liveOrder.redeem_code}</div></td>
                    <td style={{padding:'16px 14px',borderBottom:'1px solid rgba(255,255,255,0.04)',textAlign:'right'}}><span style={{background:'rgba(46,204,113,0.1)',border:'1px solid rgba(46,204,113,0.2)',color:'#2ecc71',padding:'3px 10px',borderRadius:100,fontSize:11,fontWeight:600}}>Diskon</span></td>
                    <td style={{padding:'16px 14px',borderBottom:'1px solid rgba(255,255,255,0.04)',textAlign:'right',color:'#2ecc71',fontWeight:600}}>-{idr(discount)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>

          {/* Summary */}
          <section style={{display:'flex',justifyContent:'flex-end',marginBottom:24}}>
            <div style={{width:'100%',maxWidth:340,display:'flex',flexDirection:'column',gap:10}}>
              {[['Subtotal',idr(liveOrder.amount||0)],['Biaya Layanan (Gateway)',idr(serviceFee)]].map(([l,v])=>(
                <div key={l} style={{display:'flex',justifyContent:'space-between',fontSize:14,color:'var(--text-muted)'}}><span>{l}</span><span>{v}</span></div>
              ))}
              {discount>0 && <div style={{display:'flex',justifyContent:'space-between',fontSize:14,color:'#2ecc71'}}><span>Diskon Redeem</span><span>-{idr(discount)}</span></div>}
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',borderTop:'1px solid rgba(255,255,255,0.08)',paddingTop:14,marginTop:4,color:'#fff',fontWeight:700,fontSize:18}}>
                <span>Total Pembayaran</span>
                <span style={{color:'var(--primary-light)',fontFamily:'Space Grotesk,sans-serif'}}>{idr(total)}</span>
              </div>
            </div>
          </section>

          {/* Delivery */}
          {isPaid && (
            <div style={{marginBottom:24}}>
              <div style={{display:'inline-flex',alignItems:'center',gap:8,padding:'8px 16px',borderRadius:100,fontSize:13,fontWeight:600,...(liveOrder.plugin_notified?{background:'rgba(46,204,113,0.08)',border:'1px solid rgba(46,204,113,0.2)',color:'#2ecc71'}:{background:'rgba(255,200,0,0.08)',border:'1px solid rgba(255,200,0,0.2)',color:'#ffc800'})}}>
                <i className={`fa-solid ${liveOrder.plugin_notified?'fa-cube':'fa-hourglass-half'}`}/>
                {liveOrder.plugin_notified?'Item telah dikirim ke server Minecraft':'Menunggu pengiriman item ke server'}
              </div>
            </div>
          )}

          {/* Actions */}
          <footer style={{display:'flex',justifyContent:'space-between',alignItems:'center',borderTop:'1px solid rgba(255,255,255,0.06)',paddingTop:28,flexWrap:'wrap',gap:16}}>
            <Link href="/store" style={{color:'var(--text-muted)',textDecoration:'none',fontSize:13,fontWeight:600,display:'inline-flex',alignItems:'center',gap:8}}>
              <i className="fa-solid fa-arrow-left"/> Kembali ke Store
            </Link>
            <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
              {isPending ? (
                <button onClick={openSnap} disabled={snapLoading} className="btn-primary-fn" style={{display:'flex',alignItems:'center',gap:8,fontSize:13,fontWeight:600,opacity:snapLoading?0.6:1}}>
                  <i className={`fa-solid ${snapLoading?'fa-spinner fa-spin':'fa-credit-card'}`}/>
                  {snapLoading?'Memuat...':'Bayar Sekarang'}
                </button>
              ) : (
                <button onClick={handleDownloadPdf} className="btn-ghost-fn" style={{display:'flex',alignItems:'center',gap:8,fontSize:13,fontWeight:600}}>
                  <i className="fa-solid fa-file-pdf"/> Download PDF
                </button>
              )}
              <button onClick={copyId} className="btn-ghost-fn" style={{display:'flex',alignItems:'center',gap:8,fontSize:13,fontWeight:600}}>
                <i className={`fa-solid ${copied?'fa-check':'fa-copy'}`}/>
                {copied?'Tersalin!':'Salin ID Order'}
              </button>
            </div>
          </footer>
        </div>

        <p style={{marginTop:24,fontSize:12,color:'var(--text-muted)',textAlign:'center',maxWidth:500}}>
          Simpan halaman ini sebagai bukti pembayaran. Jika item belum masuk dalam 5 menit, hubungi kami di{' '}
          <Link href="/support" style={{color:'var(--primary)',textDecoration:'none',fontWeight:600}}>Support</Link>.
        </p>
      </main>
    </>
  );
}

function generateInvoiceHtml(order, serverName, logoSrc) {
  const idrFmt     = v => `Rp ${Number(v||0).toLocaleString('id-ID')}`;
  const subtotal   = (order.amount||0)+(order.discount_amount||0);
  const discount   = order.discount_amount||0;
  const serviceFee = Math.round((order.amount||0)*0.025);
  const total      = (order.amount||0)+serviceFee;
  const formatDate = iso => iso ? new Date(iso).toLocaleString('id-ID',{day:'2-digit',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'})+' WIB' : '-';
  const statusMap  = { success:'LUNAS', settlement:'LUNAS', capture:'LUNAS', pending:'MENUNGGU', failed:'GAGAL', cancelled:'DIBATALKAN', cancel:'DIBATALKAN', expired:'KADALUARSA', expire:'KADALUARSA' };
  const colorMap   = { success:'#22c55e', settlement:'#22c55e', capture:'#22c55e', pending:'#f59e0b', failed:'#ef4444', cancelled:'#6b7280', cancel:'#6b7280', expired:'#6b7280', expire:'#6b7280' };
  const sl = statusMap[order.payment_status] || (order.payment_status||'').toUpperCase();
  const sc = colorMap[order.payment_status] || '#6b7280';
  const sName = (serverName||'NETWORK').replace(/fancy/gi,'').trim()||'NETWORK';

  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8"/>
<title>Invoice #${order.order_id}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; background: #ffffff; color: #111111; font-size: 13px; line-height: 1.5; }
  .page { width: 680px; margin: 0 auto; padding: 40px 40px 50px; }

  /* ── Header ── */
  .hdr-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 2px solid #eeeeee; }
  .brand-name { font-size: 22px; font-weight: 900; color: #ff6b00; }
  .brand-name span { color: #111111; }
  .brand-sub { font-size: 11px; color: #888888; margin-top: 2px; }
  .inv-title { font-size: 22px; font-weight: 800; color: #111111; text-align: right; }
  .inv-id { font-size: 12px; color: #888888; text-align: right; margin-top: 2px; }
  .badge { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 11px; font-weight: 700; letter-spacing: 1px; border: 1px solid; }

  /* ── Info grid ── */
  .info-table { width: 100%; border-collapse: collapse; margin-bottom: 28px; }
  .info-table td { width: 50%; vertical-align: top; padding: 0; }
  .info-table td:last-child { padding-left: 30px; }
  .section-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1.2px; color: #888888; font-weight: 700; margin-bottom: 8px; border-bottom: 1px solid #eeeeee; padding-bottom: 4px; }
  .info-row { font-size: 12px; color: #444444; margin-bottom: 4px; }
  .info-val { font-weight: 600; color: #111111; }

  /* ── Products table ── */
  .prod-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  .prod-table th { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #888888; padding: 9px 12px; background: #f7f7f7; border-top: 1px solid #e8e8e8; border-bottom: 2px solid #e8e8e8; font-weight: 700; }
  .prod-table th.tr { text-align: right; }
  .prod-table td { padding: 14px 12px; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
  .prod-table td.tr { text-align: right; }
  .prod-name { font-weight: 700; font-size: 13px; color: #111111; margin-bottom: 2px; }
  .prod-sub { font-size: 11px; color: #888888; }
  .cat-tag { display: inline-block; background: #fff3e8; border: 1px solid #ffcc99; color: #cc5500; padding: 2px 8px; border-radius: 3px; font-size: 11px; font-weight: 600; }
  .disc-tag { display: inline-block; background: #eafaf1; border: 1px solid #a9dfbf; color: #1a8a45; padding: 2px 8px; border-radius: 3px; font-size: 11px; font-weight: 600; }

  /* ── Summary ── */
  .sum-table { width: 100%; border-collapse: collapse; margin-bottom: 28px; }
  .sum-table td { padding: 5px 0; font-size: 13px; }
  .sum-table .sum-inner { width: 280px; margin-left: auto; }
  .sum-row-label { color: #555555; }
  .sum-row-val { text-align: right; color: #333333; }
  .sum-disc { color: #1a8a45; }
  .sum-total-row td { border-top: 2px solid #111111; padding-top: 10px; margin-top: 6px; }
  .sum-total-label { font-size: 16px; font-weight: 800; color: #111111; }
  .sum-total-val { font-size: 16px; font-weight: 800; color: #ff6b00; text-align: right; }

  /* ── Footer ── */
  .foot { margin-top: 36px; padding-top: 14px; border-top: 1px solid #eeeeee; font-size: 11px; color: #aaaaaa; text-align: center; }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { padding: 20px; }
  }
</style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <table class="hdr-table">
    <tr>
      <td style="vertical-align:top;">
        <div style="display:inline-flex;align-items:center;gap:10px;margin-bottom:4px;">
          ${logoSrc ? `<img src="${logoSrc}" alt="Logo" style="width:44px;height:44px;object-fit:contain;vertical-align:middle;"/>` : ''}
          <div>
            <div class="brand-name">FANCY<span> ${sName}</span></div>
            <div class="brand-sub">Premium Minecraft Server Shop</div>
          </div>
        </div>
        <div style="margin-top:14px;font-size:19px;font-weight:800;color:#111;">INVOICE</div>
        <div style="font-size:12px;color:#888;margin-top:2px;">#${order.order_id}</div>
      </td>
      <td style="vertical-align:top;text-align:right;">
        <div class="badge" style="color:${sc};border-color:${sc};background:${sc}18;">${sl}</div>
        <div style="font-size:12px;color:#888;margin-top:8px;">${formatDate(order.created_at)}</div>
      </td>
    </tr>
  </table>

  <!-- Info grid -->
  <table class="info-table">
    <tr>
      <td>
        <div class="section-label">Ditagih Kepada</div>
        <div class="info-row"><span class="info-val">${order.player_username||'-'}</span></div>
        ${order.discord_username?`<div class="info-row">Discord: <span class="info-val">${order.discord_username}</span></div>`:''}
      </td>
      <td>
        <div class="section-label">Detail Transaksi</div>
        <table style="border-collapse:collapse;width:100%;">
          <tr>
            <td style="font-size:12px;color:#888;padding:3px 0;white-space:nowrap;width:110px;vertical-align:top;">Tanggal</td>
            <td style="font-size:12px;font-weight:600;color:#111;padding:3px 0 3px 8px;vertical-align:top;">${formatDate(order.created_at)}</td>
          </tr>
          <tr>
            <td style="font-size:12px;color:#888;padding:3px 0;white-space:nowrap;vertical-align:top;">Metode Bayar</td>
            <td style="font-size:12px;font-weight:600;color:#111;padding:3px 0 3px 8px;vertical-align:top;">${order.payment_method||'QRIS'}</td>
          </tr>
          <tr>
            <td style="font-size:12px;color:#888;padding:3px 0;white-space:nowrap;vertical-align:top;">ID Order</td>
            <td style="font-size:12px;font-weight:600;color:#111;padding:3px 0 3px 8px;word-break:break-all;vertical-align:top;">${order.order_id}</td>
          </tr>
          ${order.redeem_code?`
          <tr>
            <td style="font-size:12px;color:#888;padding:3px 0;white-space:nowrap;vertical-align:top;">Kode Redeem</td>
            <td style="font-size:12px;font-weight:600;color:#1a8a45;padding:3px 0 3px 8px;vertical-align:top;">${order.redeem_code}</td>
          </tr>`:''}
        </table>
      </td>
    </tr>
  </table>

  <!-- Products table -->
  <table class="prod-table">
    <thead>
      <tr>
        <th style="width:55%;">Deskripsi Produk</th>
        <th style="width:20%;">Kategori</th>
        <th class="tr" style="width:25%;">Harga</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>
          <div class="prod-name">${order.product_name||'-'}</div>
          <div class="prod-sub">Durasi: Permanen &middot; Lifetime</div>
        </td>
        <td><span class="cat-tag">${order.category_name||'Produk'}</span></td>
        <td class="tr" style="font-weight:700;">${idrFmt(subtotal)}</td>
      </tr>
      ${discount>0?`
      <tr>
        <td>
          <div class="prod-name" style="color:#1a8a45;">Diskon Kode Redeem</div>
          <div class="prod-sub">Kode: ${order.redeem_code}</div>
        </td>
        <td><span class="disc-tag">Diskon</span></td>
        <td class="tr" style="font-weight:700;color:#1a8a45;">-${idrFmt(discount)}</td>
      </tr>`:''}
    </tbody>
  </table>

  <!-- Summary -->
  <table class="sum-table">
    <tr>
      <td>
        <table style="width:280px;margin-left:auto;border-collapse:collapse;">
          <tr>
            <td style="padding:5px 0;font-size:13px;color:#555;">Subtotal</td>
            <td style="padding:5px 0;font-size:13px;text-align:right;color:#333;">${idrFmt(order.amount||0)}</td>
          </tr>
          <tr>
            <td style="padding:5px 0;font-size:13px;color:#555;">Biaya Layanan (2.5%)</td>
            <td style="padding:5px 0;font-size:13px;text-align:right;color:#333;">${idrFmt(serviceFee)}</td>
          </tr>
          ${discount>0?`
          <tr>
            <td style="padding:5px 0;font-size:13px;color:#1a8a45;">Diskon Redeem</td>
            <td style="padding:5px 0;font-size:13px;text-align:right;color:#1a8a45;">-${idrFmt(discount)}</td>
          </tr>`:''}
          <tr style="border-top:2px solid #111;">
            <td style="padding-top:10px;font-size:16px;font-weight:800;color:#111;">Total Pembayaran</td>
            <td style="padding-top:10px;font-size:16px;font-weight:800;color:#ff6b00;text-align:right;">${idrFmt(total)}</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

  <!-- Footer -->
  <div class="foot">
    Dokumen ini digenerate otomatis oleh ${serverName||'Fancy Network'} Store &bull; Simpan sebagai bukti pembayaran resmi.
  </div>

</div>
</body>
</html>`;
}
