/**
 * pages/invoice/[orderId].js
 * 
 * CHANGES:
 * 1. Download PDF (bukan cetak/print)
 * 2. Payment gateway flow baru:
 *    - Status pending → tampilkan tombol "Buka Payment Gateway"
 *    - Jika user tutup popup → muncul tombol buka lagi di invoice
 *    - Jika user navigate away / kembali ke store → order pending otomatis jadi cancelled
 * 3. Polling update status realtime
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

const idr = v => `Rp ${Number(v || 0).toLocaleString('id-ID')}`;

const formatDate = (iso) => {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleString('id-ID', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta',
  }) + ' WIB';
};

const METHOD_LABELS = {
  qris:         'QRIS',
  dana:         'Dana Instan',
  ovo:          'OVO',
  gopay:        'GoPay',
  shopeepay:    'ShopeePay',
  bank_transfer:'Transfer Bank',
  credit_card:  'Kartu Kredit',
};

const STATUS_CONFIG = {
  settlement: { label: 'Paid Success',  icon: 'fa-circle-check',  bg: 'rgba(46,204,113,0.10)', border: 'rgba(46,204,113,0.25)', color: '#2ecc71' },
  capture:    { label: 'Paid Success',  icon: 'fa-circle-check',  bg: 'rgba(46,204,113,0.10)', border: 'rgba(46,204,113,0.25)', color: '#2ecc71' },
  success:    { label: 'Paid Success',  icon: 'fa-circle-check',  bg: 'rgba(46,204,113,0.10)', border: 'rgba(46,204,113,0.25)', color: '#2ecc71' },
  pending:    { label: 'Menunggu Pembayaran', icon: 'fa-clock',   bg: 'rgba(255,200,0,0.10)',  border: 'rgba(255,200,0,0.25)',  color: '#ffc800' },
  expire:     { label: 'Kadaluarsa',    icon: 'fa-circle-xmark',  bg: 'rgba(255,59,48,0.10)',  border: 'rgba(255,59,48,0.25)',  color: '#ff3b30' },
  cancel:     { label: 'Dibatalkan',    icon: 'fa-ban',           bg: 'rgba(255,59,48,0.10)',  border: 'rgba(255,59,48,0.25)',  color: '#ff3b30' },
  cancelled:  { label: 'Dibatalkan',    icon: 'fa-ban',           bg: 'rgba(255,59,48,0.10)',  border: 'rgba(255,59,48,0.25)',  color: '#ff3b30' },
  deny:       { label: 'Ditolak',       icon: 'fa-triangle-exclamation', bg:'rgba(255,59,48,0.10)', border:'rgba(255,59,48,0.25)', color:'#ff3b30' },
  failed:     { label: 'Gagal',         icon: 'fa-triangle-exclamation', bg:'rgba(255,59,48,0.10)', border:'rgba(255,59,48,0.25)', color:'#ff3b30' },
};

const PAID_STATUSES   = ['settlement', 'capture', 'success', 'paid'];
const FAILED_STATUSES = ['expire', 'cancel', 'cancelled', 'deny', 'failed'];
const DONE_STATUSES   = [...PAID_STATUSES, ...FAILED_STATUSES];

export default function InvoicePage({ order: initialOrder, settings }) {
  const router  = useRouter();
  const s       = settings || {};
  const serverName = s.server_name || 'Fancy Network';
  const { src: logoSrc } = useTransparentLogo();

  const [player,        setPlayer]      = useState(null);
  const [showLogin,     setShowLogin]   = useState(false);
  const [copied,        setCopied]      = useState(false);
  const [downloading,   setDownloading] = useState(false);
  const [liveOrder,     setLiveOrder]   = useState(initialOrder);
  const [snapLoading,   setSnapLoading] = useState(false);
  const [snapClosed,    setSnapClosed]  = useState(false); // user tutup popup

  const pollRef    = useRef(null);
  const snapActive = useRef(false); // snap popup sedang terbuka

  const statusKey = liveOrder?.payment_status || 'pending';
  const statusCfg = STATUS_CONFIG[statusKey] || STATUS_CONFIG.pending;
  const isPaid    = PAID_STATUSES.includes(statusKey);
  const isDone    = DONE_STATUSES.includes(statusKey);
  const isPending = !isDone;

  // ── Polling: cek status setiap 3 detik jika masih pending ──────
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
          if (DONE_STATUSES.includes(data.order.payment_status) || attempts >= 40) {
            clearInterval(pollRef.current);
          }
        }
      } catch {}
    }, 3000);
    return () => clearInterval(pollRef.current);
  }, []);

  // ── Cancel order ketika user navigasi keluar saat masih pending ─
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!isDone && !snapActive.current) {
        // Fire-and-forget cancel via beacon
        navigator.sendBeacon(
          '/api/orders/cancel',
          JSON.stringify({ orderId: initialOrder.order_id })
        );
      }
    };

    const handleRouteChange = (url) => {
      // Hanya cancel jika user navigasi keluar dari invoice ini
      if (!url.startsWith('/invoice/') && isPending && !snapActive.current) {
        fetch('/api/orders/cancel', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: initialOrder.order_id }),
        }).catch(() => {});
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    router.events.on('routeChangeStart', handleRouteChange);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      router.events.off('routeChangeStart', handleRouteChange);
    };
  }, [isPending, isDone]);

  // ── Buka Snap Payment Gateway ───────────────────────────────────
  const openPaymentGateway = useCallback(async () => {
    if (!liveOrder?.midtrans_snap_token) {
      // Coba fetch ulang token
      try {
        const r = await fetch('/api/orders/verify/' + liveOrder.order_id, { credentials: 'include' });
        const d = await r.json();
        if (d.order?.midtrans_snap_token) {
          setLiveOrder(d.order);
        } else {
          alert('Token pembayaran tidak ditemukan. Hubungi admin.');
          return;
        }
      } catch {
        alert('Gagal mengambil token pembayaran.');
        return;
      }
    }

    setSnapLoading(true);
    setSnapClosed(false);
    snapActive.current = true;

    try {
      const snapToken = liveOrder?.midtrans_snap_token;
      const clientKey = s.midtrans_client_key || process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || '';

      // Inject snap.js jika belum ada
      if (!window.snap) {
        const env = (s.midtrans_env || process.env.NEXT_PUBLIC_MIDTRANS_ENV) === 'production' ? 'app' : 'app.sandbox';
        await new Promise((resolve, reject) => {
          const existing = document.querySelector('script[src*="midtrans.com/snap"]');
          if (existing) { existing.remove(); delete window.snap; }
          const sc = document.createElement('script');
          sc.src = `https://${env}.midtrans.com/snap/snap.js`;
          sc.setAttribute('data-client-key', clientKey);
          sc.onload = resolve;
          sc.onerror = reject;
          document.head.appendChild(sc);
        });
      }

      setSnapLoading(false);

      window.snap.pay(snapToken, {
        onSuccess: async () => {
          snapActive.current = false;
          const r = await fetch('/api/orders/verify/' + liveOrder.order_id, { credentials: 'include' });
          const d = await r.json();
          if (d.order) setLiveOrder(d.order);
        },
        onPending: async () => {
          snapActive.current = false;
          const r = await fetch('/api/orders/verify/' + liveOrder.order_id, { credentials: 'include' });
          const d = await r.json();
          if (d.order) setLiveOrder(d.order);
        },
        onError: async () => {
          snapActive.current = false;
          setSnapClosed(true);
          const r = await fetch('/api/orders/verify/' + liveOrder.order_id, { credentials: 'include' });
          const d = await r.json();
          if (d.order) setLiveOrder(d.order);
        },
        onClose: async () => {
          snapActive.current = false;
          // Cek apakah sudah dibayar (sandbox kadang fire onClose bukan onSuccess)
          try {
            const r = await fetch('/api/orders/verify/' + liveOrder.order_id, { credentials: 'include' });
            const d = await r.json();
            if (d.order) {
              setLiveOrder(d.order);
              const paid = PAID_STATUSES.includes(d.order.payment_status);
              if (!paid) setSnapClosed(true); // Tampilkan tombol buka lagi
            }
          } catch {
            setSnapClosed(true);
          }
        },
      });
    } catch (e) {
      snapActive.current = false;
      setSnapLoading(false);
      console.error('[snap]', e);
      alert('Gagal membuka payment gateway: ' + e.message);
    }
  }, [liveOrder, s]);

  // ── Download PDF ──────────────────────────────────────────────
  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      // Buka window print sebagai PDF save dialog
      const printWindow = window.open('', '_blank');
      const invoiceHtml = generateInvoiceHtml(liveOrder, s, serverName);
      printWindow.document.write(invoiceHtml);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
        printWindow.onafterprint = () => printWindow.close();
      };
    } catch (e) {
      console.error(e);
    }
    setDownloading(false);
  };

  // ── Copy order ID ──────────────────────────────────────────────
  const copyOrderId = () => {
    navigator.clipboard?.writeText(initialOrder.order_id).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Auth state ─────────────────────────────────────────────────
  useEffect(() => {
    try {
      const r = localStorage.getItem('mc_player');
      if (r) setPlayer(JSON.parse(r));
    } catch {}
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    setPlayer(null);
    localStorage.removeItem('mc_player');
    localStorage.removeItem('mc_token');
  };

  const handleLoginSuccess = (p) => {
    setPlayer(p);
    localStorage.setItem('mc_player', JSON.stringify(p));
    setShowLogin(false);
  };

  const subtotal   = (liveOrder.amount || 0) + (liveOrder.discount_amount || 0);
  const discount   = liveOrder.discount_amount || 0;
  const serviceFee = Math.round((liveOrder.amount || 0) * 0.025);
  const total      = (liveOrder.amount || 0) + serviceFee;

  return (
    <>
      <Head>
        <title>Invoice #{initialOrder.order_id} | {serverName}</title>
        <meta name="description" content={`Invoice pembelian ${liveOrder.product_name} di ${serverName}`} />
        <meta name="robots" content="noindex,nofollow" />
        {logoSrc && <link rel="icon" type="image/png" href={logoSrc} />}
      </Head>

      <FancyNav player={player} onLoginClick={() => setShowLogin(true)} onLogout={handleLogout} settings={settings} />

      {showLogin && (
        <LoginModal onClose={() => setShowLogin(false)} onSuccess={handleLoginSuccess} />
      )}

      <main style={{ paddingTop: 120, paddingBottom: 80, paddingLeft: 24, paddingRight: 24, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

        {/* ── Status Banner ── */}
        <div className="inv-status-banner" data-status={statusKey}>
          <div className="inv-status-icon-wrap">
            <i className={`fa-solid ${statusCfg.icon}`} />
          </div>
          <div style={{ flex: 1 }}>
            <div className="inv-status-title">{statusCfg.label}</div>
            <div className="inv-status-sub">
              {isPaid
                ? 'Item akan dikirim ke akun Minecraft kamu dalam beberapa saat.'
                : isPending
                ? 'Selesaikan pembayaran di payment gateway untuk melanjutkan.'
                : 'Transaksi ini tidak berhasil diselesaikan.'}
            </div>
          </div>

          {/* Tombol buka payment gateway di banner jika pending */}
          {isPending && (
            <button
              className="btn-pay-now"
              onClick={openPaymentGateway}
              disabled={snapLoading}
            >
              {snapLoading
                ? <><i className="fa-solid fa-spinner fa-spin" /> Memuat...</>
                : snapClosed
                ? <><i className="fa-solid fa-rotate-right" /> Buka Lagi</>
                : <><i className="fa-solid fa-credit-card" /> Bayar Sekarang</>
              }
            </button>
          )}
        </div>

        {/* ── Snap tutup → info + tombol buka lagi ── */}
        {isPending && snapClosed && (
          <div className="inv-reopen-bar">
            <i className="fa-solid fa-info-circle" style={{ color: '#ffc800', flexShrink: 0 }} />
            <span>Pembayaran belum selesai. Kamu bisa membuka payment gateway lagi atau kembali ke store (order akan dibatalkan).</span>
            <button className="btn-pay-now btn-small" onClick={openPaymentGateway} disabled={snapLoading}>
              {snapLoading ? 'Memuat...' : 'Buka Payment Gateway'}
            </button>
          </div>
        )}

        {/* ── Invoice Card ── */}
        <div className="inv-card">
          <div className="inv-top-bar" />

          {/* Header */}
          <header className="inv-header">
            <div className="inv-brand">
              <div className="inv-logo-wrap">
                <LogoImage
                  alt={serverName}
                  style={{ height: 38, width: 38, objectFit: 'contain', filter: 'drop-shadow(0 0 10px rgba(255,107,0,0.55))', animation: 'logoFloat 3s ease-in-out infinite' }}
                />
                <div className="inv-brand-text">
                  <span style={{ color: 'var(--primary)', fontFamily: 'Space Grotesk,sans-serif', fontWeight: 700, fontSize: 20, letterSpacing: 0.5 }}>FANCY</span>
                  <span style={{ fontFamily: 'Space Grotesk,sans-serif', fontWeight: 700, fontSize: 20, letterSpacing: 0.5 }}>
                    {' '}{serverName.replace(/fancy/gi, '').trim() || 'NETWORK'}
                  </span>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>Premium Minecraft Server Shop</div>
                </div>
              </div>
            </div>
            <div className="inv-header-right">
              <div className="inv-status-badge" style={{ background: statusCfg.bg, border: `1px solid ${statusCfg.border}`, color: statusCfg.color }}>
                <i className={`fa-solid ${statusCfg.icon}`} /> {statusCfg.label}
              </div>
              <button className="inv-order-id-btn" onClick={copyOrderId} title="Salin ID Order">
                <i className={`fa-solid ${copied ? 'fa-check' : 'fa-copy'}`} style={{ fontSize: 11, opacity: 0.6 }} />
                #{initialOrder.order_id}
              </button>
            </div>
          </header>

          {/* Details grid */}
          <section className="inv-details-grid">
            <div className="inv-info-block">
              <h4 className="inv-block-label">Ditagih Kepada</h4>
              <div className="inv-player-row">
                <img
                  src={liveOrder.player_uuid
                    ? `https://crafatar.com/avatars/${liveOrder.player_uuid}?size=64&overlay`
                    : `https://minotar.net/helm/${encodeURIComponent(liveOrder.player_username || 'steve')}/64`}
                  alt={liveOrder.player_username}
                  style={{ width: 40, height: 40, borderRadius: 6, imageRendering: 'pixelated', flexShrink: 0, border: '1px solid rgba(255,255,255,0.08)' }}
                  onError={e => { e.target.src = 'https://minotar.net/helm/steve/64'; }}
                />
                <div>
                  <div className="inv-ign">
                    <i className="fa-solid fa-gamepad" style={{ fontSize: 11, color: 'var(--primary)' }} />
                    {liveOrder.player_username}
                    {liveOrder.player_rank && liveOrder.player_rank !== 'default' && (
                      <span className="inv-rank-badge">{liveOrder.player_rank.toUpperCase()}</span>
                    )}
                  </div>
                  {liveOrder.discord_username && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <i className="fa-brands fa-discord" style={{ fontSize: 11, color: '#5865F2' }} />
                      {liveOrder.discord_username}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="inv-info-block">
              <h4 className="inv-block-label">Rincian Transaksi</h4>
              <dl className="inv-dl">
                <dt>Tanggal</dt>
                <dd>{formatDate(liveOrder.created_at)}</dd>
                <dt>Metode</dt>
                <dd>{METHOD_LABELS[liveOrder.payment_method] || liveOrder.payment_method || 'QRIS'}</dd>
                <dt>ID Transaksi</dt>
                <dd style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 12 }}>{initialOrder.order_id}</dd>
                {liveOrder.redeem_code && (
                  <>
                    <dt>Kode Redeem</dt>
                    <dd style={{ color: '#2ecc71' }}>
                      <i className="fa-solid fa-tag" style={{ fontSize: 10 }} /> {liveOrder.redeem_code}
                    </dd>
                  </>
                )}
              </dl>
            </div>
          </section>

          {/* Table */}
          <section className="inv-table-wrap">
            <table className="inv-table">
              <thead>
                <tr>
                  <th>Deskripsi Produk</th>
                  <th className="text-right">Kategori</th>
                  <th className="text-right">Harga</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <div style={{ fontWeight: 600, color: '#fff' }}>{liveOrder.product_name}</div>
                    <div className="inv-item-meta">
                      <i className="fa-solid fa-infinity" style={{ fontSize: 10 }} /> Durasi: Permanen (Lifetime)
                    </div>
                  </td>
                  <td className="text-right">
                    <span className="inv-cat-chip">{liveOrder.category_name || 'Produk'}</span>
                  </td>
                  <td className="text-right" style={{ fontWeight: 600 }}>{idr(subtotal)}</td>
                </tr>
                {discount > 0 && (
                  <tr>
                    <td>
                      <div style={{ fontWeight: 600, color: '#2ecc71' }}>
                        <i className="fa-solid fa-tag" style={{ marginRight: 6 }} />Diskon Kode Redeem
                      </div>
                      <div className="inv-item-meta">Kode: {liveOrder.redeem_code}</div>
                    </td>
                    <td className="text-right">
                      <span className="inv-cat-chip" style={{ background: 'rgba(46,204,113,0.1)', borderColor: 'rgba(46,204,113,0.2)', color: '#2ecc71' }}>Diskon</span>
                    </td>
                    <td className="text-right" style={{ color: '#2ecc71', fontWeight: 600 }}>-{idr(discount)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>

          {/* Summary */}
          <section className="inv-summary-wrap">
            <div className="inv-summary-box">
              <div className="inv-sum-row"><span>Subtotal</span><span>{idr(liveOrder.amount || 0)}</span></div>
              <div className="inv-sum-row"><span>Biaya Layanan (Gateway)</span><span>{idr(serviceFee)}</span></div>
              {discount > 0 && (
                <div className="inv-sum-row" style={{ color: '#2ecc71' }}>
                  <span>Diskon Redeem</span><span>-{idr(discount)}</span>
                </div>
              )}
              <div className="inv-sum-row inv-sum-total">
                <span>Total Pembayaran</span>
                <span className="inv-total-price">{idr(total)}</span>
              </div>
            </div>
          </section>

          {/* Delivery chip */}
          {isPaid && (
            <div className="inv-delivery-row">
              <div className={`inv-delivery-chip ${liveOrder.plugin_notified ? 'delivered' : 'queued'}`}>
                <i className={`fa-solid ${liveOrder.plugin_notified ? 'fa-cube' : 'fa-hourglass-half'}`} />
                {liveOrder.plugin_notified ? 'Item telah dikirim ke server Minecraft' : 'Menunggu pengiriman item ke server'}
              </div>
            </div>
          )}

          {/* Actions */}
          <footer className="inv-actions">
            <Link href="/store" className="inv-back-link">
              <i className="fa-solid fa-arrow-left" /> Kembali ke Store
            </Link>
            <div className="inv-action-btns">
              {isPending ? (
                <button
                  className="btn-primary-fn inv-btn"
                  onClick={openPaymentGateway}
                  disabled={snapLoading}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600 }}
                >
                  <i className={`fa-solid ${snapLoading ? 'fa-spinner fa-spin' : snapClosed ? 'fa-rotate-right' : 'fa-credit-card'}`} />
                  {snapLoading ? 'Memuat...' : snapClosed ? 'Buka Payment Gateway Lagi' : 'Bayar Sekarang'}
                </button>
              ) : (
                <button
                  className="btn-ghost-fn inv-btn"
                  onClick={handleDownloadPdf}
                  disabled={downloading}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600 }}
                >
                  <i className="fa-solid fa-file-pdf" />
                  {downloading ? 'Menyiapkan...' : 'Download PDF'}
                </button>
              )}
              <button
                className="btn-ghost-fn inv-btn"
                onClick={copyOrderId}
                style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600 }}
              >
                <i className={`fa-solid ${copied ? 'fa-check' : 'fa-copy'}`} />
                {copied ? 'Tersalin!' : 'Salin ID Order'}
              </button>
            </div>
          </footer>
        </div>

        <p style={{ marginTop: 24, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', maxWidth: 500 }}>
          Simpan halaman ini sebagai bukti pembayaran. Jika item belum masuk dalam 5 menit, hubungi kami di{' '}
          <Link href="/support" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>Support</Link>.
        </p>
      </main>

      <style jsx>{`
        /* ── Pay Now Button ── */
        .btn-pay-now {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: linear-gradient(135deg, var(--primary), var(--primary-light));
          color: #fff;
          border: none;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
          flex-shrink: 0;
          transition: opacity 0.2s, transform 0.1s;
          box-shadow: 0 4px 16px rgba(255,107,0,0.3);
        }
        .btn-pay-now:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
        .btn-pay-now:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-pay-now.btn-small { padding: 8px 14px; font-size: 12px; }

        /* ── Reopen bar ── */
        .inv-reopen-bar {
          width: 100%;
          max-width: 820px;
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(255,200,0,0.07);
          border: 1px solid rgba(255,200,0,0.2);
          border-radius: 12px;
          padding: 12px 18px;
          margin-bottom: 12px;
          font-size: 13px;
          color: var(--text-muted);
        }

        /* ── Status Banner ── */
        .inv-status-banner {
          display: flex;
          align-items: center;
          gap: 16px;
          width: 100%;
          max-width: 820px;
          border-radius: 14px;
          padding: 16px 22px;
          margin-bottom: 16px;
          border: 1px solid rgba(46,204,113,0.2);
          background: rgba(46,204,113,0.06);
          backdrop-filter: blur(8px);
        }
        .inv-status-banner[data-status="pending"] {
          border-color: rgba(255,200,0,0.2);
          background: rgba(255,200,0,0.06);
        }
        .inv-status-banner[data-status="expire"],
        .inv-status-banner[data-status="cancel"],
        .inv-status-banner[data-status="cancelled"],
        .inv-status-banner[data-status="deny"],
        .inv-status-banner[data-status="failed"] {
          border-color: rgba(255,59,48,0.2);
          background: rgba(255,59,48,0.06);
        }
        .inv-status-icon-wrap {
          width: 44px; height: 44px;
          border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          font-size: 20px;
          background: rgba(46,204,113,0.15);
          color: #2ecc71;
          box-shadow: 0 0 18px rgba(46,204,113,0.25);
        }
        .inv-status-banner[data-status="pending"] .inv-status-icon-wrap {
          background: rgba(255,200,0,0.15); color: #ffc800;
          box-shadow: 0 0 18px rgba(255,200,0,0.2);
        }
        .inv-status-banner[data-status="expire"] .inv-status-icon-wrap,
        .inv-status-banner[data-status="cancel"] .inv-status-icon-wrap,
        .inv-status-banner[data-status="cancelled"] .inv-status-icon-wrap,
        .inv-status-banner[data-status="deny"] .inv-status-icon-wrap,
        .inv-status-banner[data-status="failed"] .inv-status-icon-wrap {
          background: rgba(255,59,48,0.15); color: #ff3b30;
          box-shadow: 0 0 18px rgba(255,59,48,0.2);
        }
        .inv-status-title { font-family:'Space Grotesk',sans-serif; font-weight:700; font-size:16px; color:#fff; }
        .inv-status-sub { font-size:13px; color:var(--text-muted); margin-top:2px; }

        /* ── Invoice Card ── */
        .inv-card {
          width: 100%; max-width: 820px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 24px;
          padding: 40px;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          position: relative; overflow: hidden;
          box-shadow: 0 20px 50px rgba(0,0,0,0.55);
        }
        .inv-top-bar {
          position: absolute; top: 0; left: 0; width: 100%; height: 4px;
          background: linear-gradient(90deg, var(--primary), var(--primary-light));
          box-shadow: 0 2px 20px var(--primary-glow);
        }
        .inv-header {
          display: flex; justify-content: space-between; align-items: flex-start;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          padding-bottom: 28px; margin-bottom: 28px;
        }
        .inv-brand { display: flex; flex-direction: column; gap: 6px; }
        .inv-logo-wrap { display: flex; align-items: center; gap: 10px; }
        .inv-brand-text { display: flex; flex-direction: column; }
        .inv-header-right { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; }
        .inv-status-badge {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 6px 14px; border-radius: 100px;
          font-size: 12px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 1px;
        }
        .inv-order-id-btn {
          font-family:'Space Grotesk',sans-serif;
          font-size: 14px; font-weight: 700; color: #fff;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 8px; padding: 5px 12px;
          cursor: pointer; display: flex; align-items: center; gap: 6px;
          transition: all 0.2s;
        }
        .inv-order-id-btn:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.16); }
        .inv-details-grid { display: grid; grid-template-columns: repeat(2,1fr); gap: 28px; margin-bottom: 32px; }
        .inv-block-label { font-size:11px; text-transform:uppercase; letter-spacing:1.2px; color:var(--primary-light); margin-bottom:12px; font-weight:700; }
        .inv-player-row { display: flex; align-items: center; gap: 10px; }
        .inv-ign { display:inline-flex; align-items:center; gap:6px; background:rgba(255,255,255,0.04); padding:4px 10px; border-radius:6px; border:1px solid rgba(255,255,255,0.06); font-weight:600; font-size:14px; color:#fff; }
        .inv-rank-badge { background:rgba(255,107,0,0.2); color:var(--primary-light); font-size:10px; font-weight:700; padding:2px 6px; border-radius:4px; letter-spacing:0.5px; }
        .inv-dl { display:grid; grid-template-columns:auto 1fr; gap:6px 12px; font-size:13px; }
        .inv-dl dt { color:var(--text-muted); white-space:nowrap; }
        .inv-dl dd { color:var(--text-main); font-weight:500; }
        .inv-table-wrap { width:100%; overflow-x:auto; margin-bottom:24px; }
        .inv-table { width:100%; border-collapse:collapse; text-align:left; }
        .inv-table th { font-size:11px; text-transform:uppercase; letter-spacing:0.5px; color:var(--text-muted); padding:10px 14px; border-bottom:1px solid rgba(255,255,255,0.08); font-weight:700; }
        .inv-table td { padding:16px 14px; border-bottom:1px solid rgba(255,255,255,0.04); font-size:14px; color:#fff; }
        .inv-item-meta { font-size:12px; color:var(--text-muted); margin-top:3px; display:flex; align-items:center; gap:4px; }
        .inv-cat-chip { background:rgba(255,107,0,0.1); border:1px solid rgba(255,107,0,0.18); color:var(--primary-light); padding:3px 10px; border-radius:100px; font-size:11px; font-weight:600; white-space:nowrap; }
        .text-right { text-align:right; }
        .inv-summary-wrap { display:flex; justify-content:flex-end; margin-bottom:24px; }
        .inv-summary-box { width:100%; max-width:340px; display:flex; flex-direction:column; gap:10px; }
        .inv-sum-row { display:flex; justify-content:space-between; align-items:center; font-size:14px; color:var(--text-muted); }
        .inv-sum-total { border-top:1px solid rgba(255,255,255,0.08); padding-top:14px; margin-top:4px; color:#fff; font-weight:700; font-size:18px; }
        .inv-total-price { color:var(--primary-light); text-shadow:0 0 15px rgba(255,107,0,0.2); font-family:'Space Grotesk',sans-serif; }
        .inv-delivery-row { margin-bottom:24px; }
        .inv-delivery-chip { display:inline-flex; align-items:center; gap:8px; padding:8px 16px; border-radius:100px; font-size:13px; font-weight:600; background:rgba(255,200,0,0.08); border:1px solid rgba(255,200,0,0.2); color:#ffc800; }
        .inv-delivery-chip.delivered { background:rgba(46,204,113,0.08); border-color:rgba(46,204,113,0.2); color:#2ecc71; }
        .inv-actions { display:flex; justify-content:space-between; align-items:center; border-top:1px solid rgba(255,255,255,0.06); padding-top:28px; }
        .inv-back-link { color:var(--text-muted); text-decoration:none; font-size:13px; font-weight:600; display:inline-flex; align-items:center; gap:8px; transition:color 0.2s; }
        .inv-back-link:hover { color:#fff; }
        .inv-action-btns { display:flex; gap:10px; }
        .inv-btn { padding:10px 18px !important; }

        @media (max-width: 640px) {
          .inv-card { padding: 24px; border-radius: 16px; }
          .inv-header { flex-direction: column; gap: 18px; align-items: flex-start; }
          .inv-header-right { align-items: flex-start; width: 100%; }
          .inv-details-grid { grid-template-columns: 1fr; gap: 20px; }
          .inv-summary-wrap { justify-content: flex-start; }
          .inv-summary-box { max-width: 100%; }
          .inv-actions { flex-direction: column-reverse; gap: 20px; align-items: flex-start; }
          .inv-action-btns { width: 100%; }
          .inv-action-btns button { flex: 1; justify-content: center; }
          .inv-status-banner { flex-wrap: wrap; }
          .inv-reopen-bar { flex-wrap: wrap; }
        }
      `}</style>
    </>
  );
}

// ── Generate HTML untuk Download PDF ──────────────────────────────
function generateInvoiceHtml(order, settings, serverName) {
  const idr = v => `Rp ${Number(v || 0).toLocaleString('id-ID')}`;
  const subtotal   = (order.amount || 0) + (order.discount_amount || 0);
  const discount   = order.discount_amount || 0;
  const serviceFee = Math.round((order.amount || 0) * 0.025);
  const total      = (order.amount || 0) + serviceFee;

  const formatDate = (iso) => {
    if (!iso) return '-';
    return new Date(iso).toLocaleString('id-ID', { day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' }) + ' WIB';
  };

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Invoice #${order.order_id}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: Arial, sans-serif; background:#fff; color:#111; padding:40px; }
    h1 { font-size:22px; margin-bottom:4px; }
    .header { display:flex; justify-content:space-between; margin-bottom:32px; }
    .brand { font-size:20px; font-weight:700; }
    .label { font-size:11px; text-transform:uppercase; letter-spacing:1px; color:#888; margin-bottom:6px; }
    .grid { display:grid; grid-template-columns:1fr 1fr; gap:24px; margin-bottom:28px; }
    table { width:100%; border-collapse:collapse; margin-bottom:20px; }
    th { font-size:11px; text-align:left; text-transform:uppercase; color:#888; padding:8px 12px; border-bottom:1px solid #eee; }
    td { padding:14px 12px; border-bottom:1px solid #f0f0f0; font-size:13px; }
    .total-row { font-size:16px; font-weight:700; }
    .badge { display:inline-block; padding:4px 12px; border-radius:20px; font-size:11px; font-weight:700; }
    .badge-success { background:#d4f5e2; color:#1a7a40; }
    .badge-pending { background:#fff8d0; color:#856400; }
    .badge-fail { background:#ffe0de; color:#cc0000; }
    .summary-right { text-align:right; max-width:280px; margin-left:auto; }
    .sum-row { display:flex; justify-content:space-between; padding:6px 0; font-size:13px; color:#555; }
    .sum-total { border-top:2px solid #111; padding-top:10px; margin-top:6px; font-size:17px; font-weight:700; color:#111; }
    @media print { body { padding:20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">${serverName}</div>
      <div style="color:#888;font-size:12px;">Premium Minecraft Server Shop</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:18px;font-weight:700;">INVOICE</div>
      <div style="font-size:12px;color:#888;">#${order.order_id}</div>
      <div style="margin-top:8px;">
        <span class="badge ${['settlement','capture','success'].includes(order.payment_status)?'badge-success':order.payment_status==='pending'?'badge-pending':'badge-fail'}">
          ${['settlement','capture','success'].includes(order.payment_status)?'PAID':order.payment_status?.toUpperCase()||'PENDING'}
        </span>
      </div>
    </div>
  </div>

  <div class="grid">
    <div>
      <div class="label">Ditagih Kepada</div>
      <div style="font-weight:600;">${order.player_username || '-'}</div>
      ${order.discord_username ? `<div style="font-size:12px;color:#888;">Discord: ${order.discord_username}</div>` : ''}
    </div>
    <div>
      <div class="label">Rincian</div>
      <div style="font-size:13px;">Tanggal: ${formatDate(order.created_at)}</div>
      <div style="font-size:13px;">Metode: ${order.payment_method || 'QRIS'}</div>
      ${order.redeem_code ? `<div style="font-size:13px;">Kode Redeem: ${order.redeem_code}</div>` : ''}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Produk</th>
        <th style="text-align:right;">Harga</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${order.product_name || '-'}<br/><span style="font-size:11px;color:#888;">${order.category_name || ''} · Permanen</span></td>
        <td style="text-align:right;">${idr(subtotal)}</td>
      </tr>
      ${discount > 0 ? `<tr><td style="color:#2a7a40;">Diskon Redeem (${order.redeem_code})</td><td style="text-align:right;color:#2a7a40;">-${idr(discount)}</td></tr>` : ''}
    </tbody>
  </table>

  <div class="summary-right">
    <div class="sum-row"><span>Subtotal</span><span>${idr(order.amount||0)}</span></div>
    <div class="sum-row"><span>Biaya Layanan</span><span>${idr(serviceFee)}</span></div>
    ${discount > 0 ? `<div class="sum-row" style="color:#2a7a40;"><span>Diskon</span><span>-${idr(discount)}</span></div>` : ''}
    <div class="sum-row sum-total"><span>Total</span><span>${idr(total)}</span></div>
  </div>

  <div style="margin-top:40px;padding-top:20px;border-top:1px solid #eee;font-size:11px;color:#aaa;text-align:center;">
    Dokumen ini digenerate otomatis. Simpan sebagai bukti pembayaran resmi.
  </div>
</body>
</html>`;
}
