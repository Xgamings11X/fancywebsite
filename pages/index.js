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
  const s = settings || {};
  const serverName = s.server_name || 'Fancy Network';
  const serverIp = 'play.fancynet.my.id';
  const bedrockPort = '19026';
  const { src: logoSrc } = useTransparentLogo();

  const [player, setPlayer] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [copied, setCopied] = useState('');
  const [status, setStatus] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try { const r = localStorage.getItem('mc_player'); if (r) setPlayer(JSON.parse(r)); } catch { }
    fetch('/api/server/status').then(r => r.json()).then(setStatus).catch(() => { });
    const timer = setTimeout(() => setIsLoaded(true), 50);
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
    document.querySelectorAll('.scroll-animate').forEach(el => observer.observe(el));
    return () => { clearTimeout(timer); observer.disconnect(); };
  }, []);

  const copyIP = (text, label) => {
    navigator.clipboard?.writeText(text).catch(() => { });
    setCopied(label);
    toast.success(`${label} Berhasil Disalin!`);
    setTimeout(() => setCopied(''), 2500);
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
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
    (s.vote_url || process.env.NEXT_PUBLIC_VOTE_URL) && { href: s.vote_url || process.env.NEXT_PUBLIC_VOTE_URL, icon: 'star', label: 'Vote' },
    (s.discord_url || process.env.NEXT_PUBLIC_DISCORD_URL) && { href: s.discord_url || process.env.NEXT_PUBLIC_DISCORD_URL, icon: 'discord', label: 'Discord' },
    (s.whatsapp_url || process.env.NEXT_PUBLIC_WHATSAPP_URL) && { href: s.whatsapp_url || process.env.NEXT_PUBLIC_WHATSAPP_URL, icon: 'whatsapp', label: 'WhatsApp' },
    (s.tiktok_url || process.env.NEXT_PUBLIC_TIKTOK_URL) && { href: s.tiktok_url || process.env.NEXT_PUBLIC_TIKTOK_URL, icon: 'tiktok', label: 'TikTok' },
  ].filter(Boolean);

  const famousApplyUrl = s.discord_url || process.env.NEXT_PUBLIC_FAMOUS_APPLY_URL || process.env.NEXT_PUBLIC_DISCORD_URL || '#';
  const playerCount = status?.online ? status.players : (s.players_online || 0);

  return (
    <>
      <Head>
        <title>{serverName} | Minecraft Server Indonesia</title>
        <link rel="icon" type="image/png" href={s.logo_url || logoSrc || '/favicon.png'} />
      </Head>

      <div className="dark-theme-wrapper">
        <div className="bg-glow" />
        <FancyNav player={player} onLoginClick={() => setShowLogin(true)} onLogout={handleLogout} settings={s} />

        <main className="content-main">
          <header className={`load-animate ${isLoaded ? 'loaded' : ''}`}>
            <div className="logo-container load-item-1">
              {s.logo_url ? <img src={s.logo_url} style={{ maxWidth: 120 }} alt="Logo" /> : <LogoImage style={{ width: 100 }} />}
            </div>
            <h1 className="hero-title load-item-3">
              Jelajahi <span className="gradient-text">{serverName}</span>
            </h1>
            <p className="hero-desc load-item-4">{s.server_description || 'Server Minecraft Indonesia dengan performa tinggi.'}</p>
            
            <div className="ip-grid load-item-6">
              {[
                { label: 'Java IP', addr: serverIp, icon: 'computer' },
                { label: 'Bedrock IP', addr: serverIp, icon: 'mobile' },
                { label: 'Port', addr: bedrockPort, icon: 'network-wired' },
              ].map((item, i) => (
                <div key={i} className="dark-card" onClick={() => copyIP(item.addr, item.label)}>
                  <div className="dark-icon"><Icon name={item.icon} size={18} /></div>
                  <span className="card-label">{item.label}</span>
                  <span className="card-addr">{item.addr}</span>
                </div>
              ))}
            </div>
          </header>
        </main>

        <FancyFooter serverName={serverName} />
        {showLogin && <LoginModal onClose={() => setShowLogin(false)} onSuccess={handleLoginSuccess} />}
      </div>

      <style jsx global>{`
        .dark-theme-wrapper { background: #0A0A0B; color: #E5E7EB; min-height: 100vh; position: relative; overflow-x: hidden; }
        .bg-glow { position: fixed; inset: 0; z-index: 0; background: radial-gradient(circle at 50% -20%, rgba(249,115,22,0.1) 0%, transparent 60%); }
        .content-main { position: relative; z-index: 1; padding: 120px 16px 60px; max-width: 800px; margin: 0 auto; text-align: center; }
        .hero-title { font-size: clamp(32px, 6vw, 56px); font-weight: 800; color: #FFFFFF; margin-bottom: 20px; }
        .gradient-text { background: linear-gradient(to right, #F97316, #FB923C); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .hero-desc { color: #9CA3AF; font-size: 16px; margin-bottom: 40px; }
        .ip-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        .dark-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 20px; cursor: pointer; transition: 0.3s; }
        .dark-card:hover { background: rgba(255,255,255,0.06); border-color: #F97316; transform: translateY(-4px); }
        .dark-icon { color: #F97316; margin-bottom: 8px; }
        .card-label { display: block; font-size: 10px; color: #6B7280; text-transform: uppercase; letter-spacing: 1px; }
        .card-addr { display: block; font-size: 16px; font-weight: 700; color: #F3F4F6; margin-top: 4px; }
        .load-animate [class^="load-item-"] { opacity: 0; transform: translateY(15px); transition: 0.6s; }
        .load-animate.loaded [class^="load-item-"] { opacity: 1; transform: translateY(0); }
        @media(max-width: 768px) { .ip-grid { grid-template-columns: 1fr; } }
      `}</style>
    </>
  );
}
