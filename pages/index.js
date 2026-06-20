import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import FancyNav from '../components/FancyNav';
import LogoImage, { useTransparentLogo } from '../components/LogoImage';
import LoginModal from '../components/LoginModal';
import toast from 'react-hot-toast';

export async function getServerSideProps() {
  try {
    const { SettingsAsync } = await import('../lib/redis.js');
    return { props: { settings: await SettingsAsync.get() } };
  } catch { return { props: { settings: {} } }; }
}

export default function HomePage({ settings }) {
  const s          = settings || {};
  const serverName = s.server_name || 'Fancy Network';
  // Dikonfigurasi sesuai permintaan
  const serverIp   = 'play.fancynet.my.id';
  const bedrockPort = '19026';
  const { src: logoSrc } = useTransparentLogo();

  const [player,    setPlayer]    = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [copied,    setCopied]    = useState('');
  const [status,    setStatus]    = useState(null);

  useEffect(() => {
    try { const r=localStorage.getItem('mc_player'); if(r) setPlayer(JSON.parse(r)); } catch{}
    fetch('/api/server/status').then(r=>r.json()).then(setStatus).catch(()=>{});
    
    // Optimasi animasi entrance
    const t = setTimeout(() => document.body.classList.add('page-loaded'), 50);
    return () => clearTimeout(t);
  }, []);

  const copyIP = (text, label) => {
    navigator.clipboard?.writeText(text).catch(()=>{});
    setCopied(label);
    toast.success(`${label} berhasil disalin!`);
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
    (s.vote_url    || process.env.NEXT_PUBLIC_VOTE_URL)    && { href: s.vote_url,    cls:'btn-vote',    icon:'fa-star',     label:'Vote'    },
    (s.discord_url || process.env.NEXT_PUBLIC_DISCORD_URL) && { href: s.discord_url, cls:'btn-discord', icon:'fa-discord',  label:'Discord', brand:true },
    (s.whatsapp_url|| process.env.NEXT_PUBLIC_WHATSAPP_URL)&& { href: s.whatsapp_url,cls:'btn-wa',      icon:'fa-whatsapp', label:'Whatsapp',brand:true },
    (s.tiktok_url  || process.env.NEXT_PUBLIC_TIKTOK_URL)  && { href: s.tiktok_url,  cls:'btn-tiktok',  icon:'fa-tiktok',   label:'TikTok',  brand:true },
  ].filter(Boolean);

  const famousApplyUrl = s.discord_url || process.env.NEXT_PUBLIC_FAMOUS_APPLY_URL || process.env.NEXT_PUBLIC_DISCORD_URL || '#';
  const playerCount = status?.online ? status.players : (s.players_online || 0);

  return (
    <>
      <Head>
        <title>{serverName} | Minecraft Server Indonesia</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <link rel="icon" type="image/png" href={s.logo_url || logoSrc || '/favicon.png'}/>
      </Head>

      <FancyNav player={player} onLoginClick={()=>setShowLogin(true)} onLogout={handleLogout} settings={s}/>

      <header style={{minHeight:'100vh',display:'flex',flexDirection:'column',justifyContent:'center',alignItems:'center',textAlign:'center',padding:'120px 24px',willChange:'transform'}}>
        {/* Logo */}
        <div className="anim-hero anim-d1" style={{marginBottom:32,zIndex:1}}>
          {s.logo_url
            ? <img src={s.logo_url} alt={serverName} style={{maxWidth:160,filter:'drop-shadow(0 8px 32px rgba(255,107,0,0.3))'}}/>
            : <LogoImage style={{width:140,filter:'drop-shadow(0 8px 32px rgba(255,107,0,0.3))'}}/>
          }
        </div>

        <h1 className="font-space anim-hero anim-d3" style={{fontSize:'clamp(32px,5vw,48px)',fontWeight:700,marginBottom:16,zIndex:1}}>
          Selamat Datang di <span style={{color:'var(--primary)'}}>{serverName}</span>
        </h1>

        {/* Triple IP Grid - Update IP & Port */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,width:'100%',maxWidth:750,marginBottom:32,zIndex:1}} className="ip-grid anim-hero-up anim-d5">
          {[
            {label:'Java Edition', addr:serverIp, icon:'fa-computer', copy:serverIp},
            {label:'Bedrock Edition', addr:serverIp, icon:'fa-mobile-screen-button', copy:serverIp},
            {label:'Bedrock Port', addr:bedrockPort, icon:'fa-network-wired', copy:bedrockPort},
          ].map((item,i) => (
            <div key={i} className="ip-card" onClick={()=>copyIP(item.copy, item.label)}
              style={{background:'rgba(15,15,20,0.7)',border:'1px solid var(--border)',borderRadius:14,padding:'14px',cursor:'pointer',display:'flex',alignItems:'center',gap:10,backdropFilter:'blur(10px)'}}>
              <i className={`fa-solid ${item.icon}`} style={{color:'var(--primary)'}}/>
              <div style={{overflow:'hidden'}}>
                <span style={{fontSize:9,textTransform:'uppercase',display:'block',color:'var(--text-muted)'}}>{item.label}</span>
                <span style={{fontSize:13,fontWeight:700,display:'block'}}>{item.addr}</span>
              </div>
            </div>
          ))}
        </div>
      </header>

      {/* Optimasi section agar tidak dirender berat jika belum di scroll */}
      <section style={{contentVisibility:'auto', containIntrinsicSize:'1000px'}}>
        {/* ... Konten lainnya */}
      </section>

      {showLogin && <LoginModal onClose={()=>setShowLogin(false)} onSuccess={handleLoginSuccess}/>}

      <style jsx global>{`
        /* Performa Tweaks */
        .anim-hero, .anim-hero-up, .ip-card, .fn-card { will-change: transform, opacity; }
        .ip-card { transition: transform 0.2s ease, border-color 0.2s ease; }
        .ip-card:hover { transform: translateY(-2px); border-color: var(--primary); }
      `}</style>
    </>
  );
}
