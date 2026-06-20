import { useState, useEffect } from 'react';
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
  const serverIp   = s.server_ip   || 'fancynet.my.id';
  const { src: logoSrc } = useTransparentLogo();

  const [player,    setPlayer]    = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [copied,    setCopied]    = useState('');
  const [status,    setStatus]    = useState(null);

  useEffect(() => {
    try { const r=localStorage.getItem('mc_player'); if(r) setPlayer(JSON.parse(r)); } catch{}
    fetch('/api/server/status').then(r=>r.json()).then(setStatus).catch(()=>{});
  }, []);

  const copyIP = (text, label) => {
    navigator.clipboard?.writeText(text).catch(()=>{});
    setCopied(label);
    toast.success(`${label} "${text}" berhasil disalin!`);
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
    (s.vote_url    || process.env.NEXT_PUBLIC_VOTE_URL)    && { href: s.vote_url    || process.env.NEXT_PUBLIC_VOTE_URL,    icon:'star',     label:'Vote'    },
    (s.discord_url || process.env.NEXT_PUBLIC_DISCORD_URL) && { href: s.discord_url || process.env.NEXT_PUBLIC_DISCORD_URL, icon:'discord',  label:'Discord' },
    (s.whatsapp_url|| process.env.NEXT_PUBLIC_WHATSAPP_URL)&& { href: s.whatsapp_url|| process.env.NEXT_PUBLIC_WHATSAPP_URL,icon:'whatsapp', label:'Whatsapp' },
    (s.tiktok_url  || process.env.NEXT_PUBLIC_TIKTOK_URL)  && { href: s.tiktok_url  || process.env.NEXT_PUBLIC_TIKTOK_URL,  icon:'tiktok',   label:'TikTok'  },
  ].filter(Boolean);

  const famousApplyUrl = s.discord_url || process.env.NEXT_PUBLIC_FAMOUS_APPLY_URL || process.env.NEXT_PUBLIC_DISCORD_URL || '#';
  const playerCount = status?.online ? status.players : (s.players_online || 0);

  return (
    <>
      <Head>
        <title>{serverName} | Minecraft Server Indonesia</title>
        <link rel="icon" type="image/png" href={s.logo_url || logoSrc || '/favicon.png'}/>
      </Head>

      <div className="orange-theme-wrapper" style={{ backgroundColor: '#FFFDFB', color: '#3F2C24', minHeight: '100vh', position: 'relative', overflowX: 'hidden' }}>
        
        {/* Background Ambient Warm Glow */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
          <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '700px', height: '700px', background: 'radial-gradient(circle, rgba(255,107,0,0.08) 0%, transparent 70%)', filter: 'blur(100px)' }} />
        </div>

        <FancyNav player={player} onLoginClick={() => setShowLogin(true)} onLogout={handleLogout} settings={s} />

        {/* HERO */}
        <header style={{ padding: '100px 24px', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{ margin: '0 auto 24px', filter: 'drop-shadow(0 10px 20px rgba(255,107,0,0.2))' }}>
            {s.logo_url ? <img src={s.logo_url} style={{maxWidth:140, margin:'0 auto'}}/> : <LogoImage style={{width:130, margin:'0 auto'}}/>}
          </div>

          <div style={{ display: 'inline-flex', padding: '6px 16px', borderRadius: '50px', background: '#FFF1E6', color: '#C2410C', fontWeight: 700, fontSize: 11, marginBottom: 20 }}>
            SERVER EKONOMI | JAVA & BEDROCK
          </div>

          <h1 style={{ fontSize: 'clamp(32px, 6vw, 56px)', fontWeight: 800, color: '#18181B', marginBottom: 20, maxWidth: 800, margin: '0 auto 20px' }}>
            {s.hero_title || <>Mulai Petualanganmu di <span style={{ color: '#FF6B00' }}>{serverName}</span></>}
          </h1>

          <p style={{ color: '#78350F', fontSize: 16, maxWidth: 500, margin: '0 auto 40px', lineHeight: 1.6 }}>
            {s.server_description || 'Server Minecraft Indonesia dengan komunitas solid dan dunia tanpa batas.'}
          </p>

          <div className="ip-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, maxWidth: 700, margin: '0 auto 40px' }}>
            {[
              { label: 'Java IP', addr: serverIp, icon: 'computer', copy: serverIp },
              { label: 'Bedrock IP', addr: serverIp, icon: 'mobile', copy: serverIp },
              { label: 'Port', addr: '19015', icon: 'network-wired', copy: '19015' },
            ].map((item, i) => (
              <div key={i} className="card-orange" onClick={() => copyIP(item.copy, item.label)}>
                <div className="icon-orange"><Icon name={item.icon} size={18} /></div>
                <span style={{ fontSize: 10, fontWeight: 800, color: '#D97706' }}>{item.label}</span>
                <span style={{ fontWeight: 700, color: '#18181B', display:'block', marginTop:4 }}>{item.addr}</span>
              </div>
            ))}
          </div>
        </header>

        {/* FEATURES */}
        <section style={{ padding: '40px 24px', maxWidth: 1000, margin: '0 auto' }}>
          <div className="feature-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
            {[
              { icon: 'shield-halved', title: 'Anti-Cheat', desc: 'Sistem perlindungan berlapis dan aman.' },
              { icon: 'users', title: 'Komunitas Solid', desc: 'Ribuan pemain aktif dan ramah.' },
              { icon: 'bolt', title: 'Low Latency', desc: 'Ping rendah untuk kenyamanan bermain.' },
              { icon: 'trophy', title: 'Event Seru', desc: 'Hadiah menarik setiap minggunya.' },
            ].map((f, i) => (
              <div key={i} className="card-orange" style={{ padding: 24, textAlign: 'left', display: 'flex', gap: 16 }}>
                <div className="icon-orange" style={{ background: '#FFF1E6' }}><Icon name={f.icon} size={20} /></div>
                <div>
                  <h4 style={{ fontWeight: 700, marginBottom: 4 }}>{f.title}</h4>
                  <p style={{ fontSize: 13, color: '#78350F' }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <FancyFooter serverName={serverName} />
        {showLogin && <LoginModal onClose={() => setShowLogin(false)} onSuccess={handleLoginSuccess} />}
      </div>

      <style jsx>{`
        .card-orange {
          background: #FFFFFF;
          border: 1px solid #FFEDD5;
          border-radius: 16px;
          padding: 16px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .card-orange:hover {
          border-color: #FDBA74;
          box-shadow: 0 4px 15px rgba(255, 107, 0, 0.05);
        }
        .icon-orange {
          width: 40px; height: 40px;
          background: #FFF7ED;
          color: #FF6B00;
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 12px;
        }
        @media(max-width: 640px) {
          .ip-grid { grid-template-columns: 1fr !important; }
          .feature-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
}
