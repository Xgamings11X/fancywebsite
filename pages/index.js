import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import FancyNav from '../components/FancyNav';
import LogoImage, { useTransparentLogo } from '../components/LogoImage';
import toast from 'react-hot-toast';
import Icon from '../components/Icon';
import FancyFooter from '../components/FancyFooter';

const LoginModal = dynamic(() => import('../components/LoginModal'), { ssr: false });

export async function getServerSideProps() {
  try {
    const { SettingsAsync } = await import('../lib/redis.js');
    return { props: { settings: await SettingsAsync.get() } };
  } catch { return { props: { settings: {} } }; }
}

export default function HomePage({ settings }) {
  const s          = settings || {};
  const serverName = s.server_name || 'Fancy Network';
  const serverIp   = 'play.fancynet.my.id'; 
  const bedrockPort = '19026';               
  const { src: logoSrc } = useTransparentLogo();

  const [player,    setPlayer]    = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [copied,    setCopied]    = useState('');
  const [status,    setStatus]    = useState(null);
  const [isLoaded,  setIsLoaded]  = useState(false); // Trigger Page Load

  useEffect(() => {
    // 1. Ambil data player & status server
    try { const r=localStorage.getItem('mc_player'); if(r) setPlayer(JSON.parse(r)); } catch{}
    fetch('/api/server/status').then(r=>r.json()).then(setStatus).catch(()=>{});

    // 2. Memicu Animasi Page Load secara bertahap setelah komponen mounted
    const timer = setTimeout(() => setIsLoaded(true), 50);

    // 3. Pemicu Animasi Scroll menggunakan Intersection Observer (Sangat Ringan & Native)
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target); // Cukup animasi sekali saja saat di-scroll
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    document.querySelectorAll('.scroll-animate').forEach(el => observer.observe(el));

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, []);

  const copyIP = (text, label) => {
    navigator.clipboard?.writeText(text).catch(()=>{});
    setCopied(label);
    toast.success(`${label} Berhasil Disalin!`);
    setTimeout(() => setCopied(''), 2500);
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method:'POST', credentials:'include' });
    setPlayer(null);
    localStorage.removeItem('mc_player');
    toast.success('Berhasil keluar');
  };

  const handleLoginSuccess = (p) => {
    setPlayer(p);
    localStorage.setItem('mc_player', JSON.stringify(p));
    setShowLogin(false);
  };

  const socials = [
    (s.vote_url    || process.env.NEXT_PUBLIC_VOTE_URL)    && { href: s.vote_url    || process.env.NEXT_PUBLIC_VOTE_URL,    icon:'star',     label:'Vote' },
    (s.discord_url || process.env.NEXT_PUBLIC_DISCORD_URL) && { href: s.discord_url || process.env.NEXT_PUBLIC_DISCORD_URL, icon:'discord',  label:'Discord' },
    (s.whatsapp_url|| process.env.NEXT_PUBLIC_WHATSAPP_URL)&& { href: s.whatsapp_url|| process.env.NEXT_PUBLIC_WHATSAPP_URL,icon:'whatsapp', label:'WhatsApp' },
    (s.tiktok_url  || process.env.NEXT_PUBLIC_TIKTOK_URL)  && { href: s.tiktok_url  || process.env.NEXT_PUBLIC_TIKTOK_URL,  icon:'tiktok',   label:'TikTok' },
  ].filter(Boolean);

  const famousApplyUrl = s.discord_url || process.env.NEXT_PUBLIC_FAMOUS_APPLY_URL || process.env.NEXT_PUBLIC_DISCORD_URL || '#';
  const playerCount = status?.online ? status.players : (s.players_online || 0);

  return (
    <>
      <Head>
        <title>{serverName} | Minecraft Server Indonesia</title>
        <link rel="icon" type="image/png" href={s.logo_url || logoSrc || '/favicon.png'}/>
      </Head>

      {/* BACKGROUND PUTIH TERANG DENGAN ELEMEN KONTRAS FULL ORANGE */}
      <div className="orange-theme-wrapper" style={{ backgroundColor: '#FFFFFF', color: '#1A0D05', minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative', overflowX: 'hidden' }}>
        
        {/* Soft Ambient Glow */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }} className="gpu-glow-layer">
          <div style={{ position: 'absolute', top: '-10%', left: '50%', transform: 'translateX(-50%)', width: '500px', height: '400px', background: 'radial-gradient(circle, rgba(249,115,22,0.04) 0%, transparent 70%)', filter: 'blur(70px)' }} />
        </div>

        <FancyNav player={player} onLoginClick={() => setShowLogin(true)} onLogout={handleLogout} settings={s} />

        {/* MAIN CONTENT */}
        <main style={{ flex: 1, position: 'relative', zIndex: 1, padding: '0 16px' }}>
          
          {/* HERO SECTION (ANIMATED VIA PAGE LOAD) */}
          <header style={{ padding: '120px 0 40px', textAlign: 'center' }} className={`load-animate ${isLoaded ? 'loaded' : ''}`}>
            <div style={{ margin: '0 auto 16px' }} className="load-item-1">
              {s.logo_url ? <img src={s.logo_url} style={{maxWidth:120, margin:'0 auto'}} alt="Server Logo"/> : <LogoImage style={{width:110, margin:'0 auto'}}/>}
            </div>

            <div style={{ display: 'inline-flex', padding: '4px 12px', borderRadius: '50px', background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.25)', color: '#EA580C', fontWeight: 700, fontSize: 10.5, marginBottom: 16, letterSpacing: '0.5px' }} className="load-item-2">
              JAVA &amp; BEDROCK
            </div>

            <h1 style={{ fontSize: 'clamp(28px, 6vw, 48px)', fontWeight: 850, color: '#1A0D05', marginBottom: 14, maxWidth: 800, margin: '0 auto 14px', lineHeight: 1.15, letterSpacing: '-0.75px' }} className="load-item-3">
              {s.hero_title || <>Jelajahi Dunia <span style={{ color: '#F97316' }}>{serverName}</span></>}
            </h1>

            <p style={{ color: '#E4580C', opacity: 0.85, fontSize: 14.5, maxWidth: 480, margin: '0 auto 28px', lineHeight: 1.5, fontWeight: 500 }} className="load-item-4">
              {s.server_description || 'Server Minecraft Indonesia dengan komunitas aktif dan performa stabil.'}
            </p>

            {/* Status Player Online */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: '99px', backgroundColor: 'rgba(249,115,22,0.05)', border: '1px solid rgba(249,115,22,0.2)', fontSize: 12.5, fontWeight: 600, color: '#EA580C', marginBottom: 36 }} className="load-item-5">
              <div style={{ width: 7, height: 7, backgroundColor: '#F97316', borderRadius: '50%', position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, backgroundColor: '#F97316', borderRadius: '50%', transform: 'scale(1.8)', opacity: 0.4, animation: 'ping-orange 1.5s cubic-bezier(0, 0, 0.2, 1) infinite' }} />
              </div>
              <span><strong style={{ color: '#F97316', fontWeight: 800 }}>{playerCount}</strong> Online</span>
            </div>

            {/* TRIPLE IP GRID — INTERACTIVE ACTION */}
            <div className="ip-grid load-item-6" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, width: '100%', maxWidth: 800, margin: '0 auto 32px' }}>
              {[
                { label: 'Java IP', addr: serverIp, icon: 'computer', copy: serverIp, copyLabel: 'IP Java' },
                { label: 'Bedrock IP', addr: serverIp, icon: 'mobile', copy: serverIp, copyLabel: 'IP Bedrock' },
                { label: 'Bedrock Port', addr: bedrockPort, icon: 'network-wired', copy: bedrockPort, copyLabel: 'Port' },
              ].map((item, i) => (
                <div key={i} className="card-orange" onClick={() => copyIP(item.copy, item.copyLabel)}>
                  <span className="orange-copy-indicator">{copied === item.copyLabel ? '✓' : 'Salin'}</span>
                  <div className="icon-orange"><Icon name={item.icon} size={16} /></div>
                  <div style={{ textAlign: 'left', overflow: 'hidden' }}>
                    <span className="orange-card-label">{item.label}</span>
                    <span className="orange-card-addr">{item.addr}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* SOCIAL MEDIA ROW */}
            {socials.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 10 }} className="load-item-7">
                {socials.map((x, i) => (
                  <a key={i} href={x.href} target="_blank" rel="noopener noreferrer" className="orange-social-btn">
                    <Icon name={x.icon} size={14} />
                    <span>{x.label}</span>
                  </a>
                ))}
              </div>
            )}
          </header>

          {/* STATS BAR (ANIMATED VIA SCROLL) */}
          <section style={{ backgroundColor: 'rgba(249,115,22,0.03)', borderTop: '1px solid rgba(249,115,22,0.15)', borderBottom: '1px solid rgba(249,115,22,0.15)', padding: '20px', margin: '0 -16px 48px' }} className="scroll-animate">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', textAlign: 'center', gap: 12, maxWidth: 800, margin: '0 auto' }} className="stats-grid">
              {[
                { val: '24/7', sub: 'Online' },
                { val: 'JAVA', sub: 'Bedrock' },
                { val: 'FREE', sub: 'Play' },
                { val: 'ID', sub: 'Community' },
              ].map((st, i) => (
                <div key={i} style={{ background: '#FFFFFF', border: '1px solid rgba(249,115,22,0.2)', padding: '10px 4px', borderRadius: '10px' }}>
                  <h3 className="font-space" style={{ fontSize: 20, color: '#F97316', fontWeight: 800 }}>{st.val}</h3>
                  <p style={{ fontSize: 9, color: '#EA580C', marginTop: 2, textTransform: 'uppercase', fontWeight: 700 }}>{st.sub}</p>
                </div>
              ))}
            </div>
          </section>

          {/* FEATURES (ANIMATED VIA SCROLL) */}
          <section style={{ paddingBottom: 48, maxWidth: 800, margin: '0 auto' }} className="scroll-animate">
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <h2 className="font-space" style={{ fontSize: 22, fontWeight: 800, color: '#1A0D05' }}>Fitur Utama <span style={{ color: '#F97316' }}>Server</span></h2>
            </div>
            
            <div className="feature-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
              {[
                { icon: 'shield-halved', title: 'Anti-Cheat Ketat', desc: 'Sistem perlindungan tangguh menjamin kenyamanan bermain tanpa gangguan.' },
                { icon: 'users', title: 'Komunitas Solid', desc: 'Bergabunglah dengan pemain aktif lainnya di platform Discord kami.' },
                { icon: 'bolt', title: 'Low Latency', desc: 'Infrastruktur pilihan dioptimalkan untuk ping koneksi yang stabil.' },
                { icon: 'trophy', title: 'Event Rutin', desc: 'Nikmati berbagai event mingguan seru dengan reward menarik.' },
              ].map((f, i) => (
                <div key={i} className="card-orange" style={{ padding: 16, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, cursor: 'default' }}>
                  <div className="icon-orange" style={{ marginBottom: 0 }}><Icon name={f.icon} size={16} /></div>
                  <div>
                    <h4 style={{ fontSize: 14, fontWeight: 700, color: '#1A0D05', marginBottom: 2 }}>{f.title}</h4>
                    <p style={{ fontSize: 12.5, color: '#EA580C', opacity: 0.8, lineHeight: 1.4 }}>{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* RECRUITMENT (ANIMATED VIA SCROLL) */}
          <section style={{ paddingBottom: 60, maxWidth: 800, margin: '0 auto' }} className="scroll-animate">
            <div style={{ backgroundColor: 'rgba(249,115,22,0.03)', border: '1px solid rgba(249,115,22,0.15)', borderRadius: 14, padding: '28px 20px', maxWidth: 480, margin: '0 auto' }}>
              <h3 className="font-space" style={{ fontSize: 18, fontWeight: 800, color: '#1A0D05', marginBottom: 8 }}>Rank Famous Creator</h3>
              <p style={{ fontSize: 13, color: '#EA580C', opacity: 0.85, marginBottom: 16, lineHeight: 1.5 }}>
                Dapatkan tag kustom khusus, eksposur konten, dan reward eksklusif bagi kreator aktif.
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px 0' }}>
                {['Rutin membuat konten server', 'Komunitas organik & positif'].map((r, i) => (
                  <li key={i} style={{ fontSize: 12.5, color: '#1A0D05', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icon name="circle-check" size={13} color="#F97316" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
              <a href={famousApplyUrl} target="_blank" rel="noopener noreferrer" className="orange-apply-btn">
                <span>Daftar Sekarang</span>
                <Icon name="arrow-right" size={13} />
              </a>
            </div>
          </section>

        </main>

        <FancyFooter serverName={serverName} />
        
        {showLogin && <LoginModal onClose={() => setShowLogin(false)} onSuccess={handleLoginSuccess} />}
      </div>

      {/* STYLES INTERFACE DENGAN NATIVE ANIMATIONS */}
      <style jsx global>{`
        html {
          scroll-behavior: smooth;
        }

        .gpu-glow-layer {
          will-change: transform, opacity;
          transform: translateZ(0);
        }

        /* ---------------------------------------------
           1. ANIMASI PAGE LOAD (STAGGERED EFFECT)
        --------------------------------------------- */
        .load-animate [class^="load-item-"] {
          opacity: 0;
          transform: translateY(15px);
          transition: opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
          will-change: opacity, transform;
        }

        .load-animate.loaded .load-item-1 { opacity: 1; transform: translateY(0); transition-delay: 50ms; }
        .load-animate.loaded .load-item-2 { opacity: 1; transform: translateY(0); transition-delay: 120ms; }
        .load-animate.loaded .load-item-3 { opacity: 1; transform: translateY(0); transition-delay: 190ms; }
        .load-animate.loaded .load-item-4 { opacity: 1; transform: translateY(0); transition-delay: 260ms; }
        .load-animate.loaded .load-item-5 { opacity: 1; transform: translateY(0); transition-delay: 330ms; }
        .load-animate.loaded .load-item-6 { opacity: 1; transform: translateY(0); transition-delay: 400ms; }
        .load-animate.loaded .load-item-7 { opacity: 1; transform: translateY(0); transition-delay: 470ms; }

        /* ---------------------------------------------
           2. ANIMASI SCROLL (INTERSECTION OBSERVER)
        --------------------------------------------- */
        .scroll-animate {
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1), transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
          will-change: opacity, transform;
        }
        .scroll-animate.visible {
          opacity: 1;
          transform: translateY(0);
        }

        /* CARD DAN BUTTON COMPONENT */
        .card-orange {
          background: #FFFFFF; 
          border: 1px solid rgba(249,115,22,0.25);
          border-radius: 12px;
          padding: 12px 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 12px;
          position: relative;
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.15s ease, background-color 0.15s ease;
        }
        .card-orange:hover {
          background: rgba(249,115,22,0.02);
          border-color: #F97316;
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(249, 115, 22, 0.08);
        }

        .orange-copy-indicator {
          position: absolute;
          top: 6px;
          right: 8px;
          font-size: 8.5px;
          color: #EA580C;
          background: rgba(249,115,22,0.08);
          padding: 1px 5px;
          border-radius: 4px;
          font-weight: 700;
        }
        .icon-orange {
          width: 34px;
          height: 34px;
          background: rgba(249,115,22,0.08);
          color: #F97316;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          border: 1px solid rgba(249,115,22,0.15);
        }
        .orange-card-label {
          font-size: 8.5px;
          text-transform: uppercase;
          color: #EA580C;
          font-weight: 700;
          letter-spacing: 0.5px;
          display: block;
        }
        .orange-card-addr {
          font-size: 13.5px;
          font-weight: 700;
          color: #1A0D05;
          display: block;
          margin-top: 1px;
        }

        .orange-social-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 7px 12px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          text-decoration: none;
          background: #FFFFFF;
          border: 1px solid rgba(249,115,22,0.25);
          color: #EA580C;
          transition: all 0.15s ease;
        }
        .orange-social-btn:hover {
          border-color: #F97316;
          color: #FFFFFF;
          background: #F97316;
        }

        .orange-apply-btn {
          background: #F97316;
          color: #FFFFFF;
          padding: 10px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 12.5px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          text-decoration: none;
          transition: background 0.15s;
        }
        .orange-apply-btn:hover {
          background: #EA580C;
        }

        @keyframes ping-orange {
          75%, 100% { transform: scale(1.8); opacity: 0; }
        }

        @media(max-width: 768px) {
          .ip-grid { grid-template-columns: 1fr !important; gap: 10px !important; }
          .feature-grid { grid-template-columns: 1fr !important; gap: 12px !important; }
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 10px !important; }
        }
      `}</style>
    </>
  );
}
