import { useState, useEffect, useMemo, memo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import FancyNav from '../components/FancyNav';
import LogoImage, { useTransparentLogo } from '../components/LogoImage';
import toast from 'react-hot-toast';

// Lazy load komponen berat agar tidak memblokir main thread
const LoginModal = dynamic(() => import('../components/LoginModal'), { ssr: false });

// Memoized Stat Item agar tidak re-render saat state lain berubah
const StatItem = memo(({ val, sub, delay }) => (
  <div data-anim="scale-pop" data-delay={delay}>
    <h3 className="font-space" style={{fontSize:24,color:'var(--primary-light)',fontWeight:700}}>{val}</h3>
    <p style={{fontSize:12,color:'var(--text-muted)',marginTop:4,textTransform:'uppercase',fontWeight:600}}>{sub}</p>
  </div>
));

export default function HomePage({ settings }) {
  const s = settings || {};
  const serverName = s.server_name || 'Fancy Network';
  const serverIp = s.server_ip || 'fancynet.my.id';
  const { src: logoSrc } = useTransparentLogo();

  const [player, setPlayer] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [copied, setCopied] = useState('');
  const [status, setStatus] = useState(null);

  useEffect(() => {
    try { const r = localStorage.getItem('mc_player'); if(r) setPlayer(JSON.parse(r)); } catch{}
    fetch('/api/server/status').then(r=>r.json()).then(setStatus).catch(()=>{});
    
    // Smooth entry
    requestAnimationFrame(() => document.body.classList.add('page-loaded'));
  }, []);

  const copyIP = (text, label) => {
    navigator.clipboard?.writeText(text);
    setCopied(label);
    toast.success(`${label} disalin!`);
    setTimeout(() => setCopied(''), 2500);
  };

  const socials = useMemo(() => [
    (s.vote_url) && { href: s.vote_url, cls:'btn-vote', icon:'fa-star', label:'Vote' },
    (s.discord_url) && { href: s.discord_url, cls:'btn-discord', icon:'fa-discord', label:'Discord', brand:true },
  ].filter(Boolean), [s]);

  return (
    <>
      <Head>
        <title>{serverName} | Minecraft Server Indonesia</title>
      </Head>

      <FancyNav player={player} onLoginClick={()=>setShowLogin(true)} settings={s}/>

      <header className="hero-section" style={{minHeight:'100vh', display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', padding:'160px 24px 60px'}}>
        <div className="anim-hero anim-d1" style={{position:'relative', zIndex:1}}>
          {s.logo_url ? <img src={s.logo_url} alt={serverName} style={{maxWidth:180}}/> : <LogoImage alt={serverName} style={{width:160}}/>}
        </div>

        <h1 className="font-space anim-hero anim-d3" style={{fontSize:'clamp(28px,6vw,48px)', margin:'24px 0'}}>
          {s.hero_title || "Selamat Datang"}
        </h1>

        {/* IP Grid */}
        <div className="ip-grid anim-hero-up anim-d5">
          {[
            {label:'Java IP', addr:serverIp, copy:serverIp},
            {label:'Bedrock IP', addr:serverIp, copy:serverIp},
            {label:'Port', addr:'19015', copy:'19015'},
          ].map((item, i) => (
            <div key={i} className="ip-card" onClick={()=>copyIP(item.copy, item.label)}>
              <span>{item.label}</span>
              <p>{item.addr}</p>
            </div>
          ))}
        </div>
      </header>

      {/* Stats Bar dengan komponen memoized */}
      <section className="stats-bar" data-anim="fade-in">
        <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:20}}>
          <StatItem val="24/7" sub="Online" delay="1"/>
          <StatItem val="JAVA" sub="Bedrock" delay="2"/>
          <StatItem val="FREE" sub="Community" delay="3"/>
          <StatItem val="ID" sub="Server" delay="4"/>
        </div>
      </section>

      {showLogin && <LoginModal onClose={()=>setShowLogin(false)} />}
    </>
  );
}

export async function getServerSideProps() {
  try {
    const { SettingsAsync } = await import('../lib/redis.js');
    return { props: { settings: await SettingsAsync.get() } };
  } catch { return { props: { settings: {} } }; }
}
