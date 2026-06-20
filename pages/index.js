import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import FancyNav from '../components/FancyNav';
import LogoImage, { useTransparentLogo } from '../components/LogoImage';
import toast from 'react-hot-toast';
import Icon from '../components/Icon';
import FancyFooter from '../components/FancyFooter';

// Landing page = rute paling sering diakses; modal login HANYA perlu
// dimuat setelah user benar-benar klik tombol login.
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
    // Hero entrance
    const t = setTimeout(() => document.body.classList.add('page-loaded'), 80);
    return () => { clearTimeout(t); document.body.classList.remove('page-loaded'); };
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
    (s.vote_url    || process.env.NEXT_PUBLIC_VOTE_URL)    && { href: s.vote_url    || process.env.NEXT_PUBLIC_VOTE_URL,    cls:'btn-vote',    icon:'star',     label:'Vote'    },
    (s.discord_url || process.env.NEXT_PUBLIC_DISCORD_URL) && { href: s.discord_url || process.env.NEXT_PUBLIC_DISCORD_URL, cls:'btn-discord', icon:'discord',  label:'Discord', brand:true },
    (s.whatsapp_url|| process.env.NEXT_PUBLIC_WHATSAPP_URL)&& { href: s.whatsapp_url|| process.env.NEXT_PUBLIC_WHATSAPP_URL,cls:'btn-wa',      icon:'whatsapp', label:'Whatsapp',brand:true },
    (s.tiktok_url  || process.env.NEXT_PUBLIC_TIKTOK_URL)  && { href: s.tiktok_url  || process.env.NEXT_PUBLIC_TIKTOK_URL,  cls:'btn-tiktok',  icon:'tiktok',   label:'TikTok',  brand:true },
    (s.youtube_url || process.env.NEXT_PUBLIC_YOUTUBE_URL) && { href: s.youtube_url || process.env.NEXT_PUBLIC_YOUTUBE_URL, cls:'btn-ig',      icon:'youtube',  label:'YouTube', brand:true },
  ].filter(Boolean);

  const famousApplyUrl = s.discord_url || process.env.NEXT_PUBLIC_FAMOUS_APPLY_URL || process.env.NEXT_PUBLIC_DISCORD_URL || '#';
  const playerCount = status?.online ? status.players : (s.players_online || 0);

  return (
    <>
      <Head>
        <title>{serverName} | Minecraft Server Indonesia</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <meta name="description" content={s.server_description || `Server Minecraft Indonesia — ${serverName}`}/>
        <link rel="icon" type="image/png" href={s.logo_url || logoSrc || '/favicon.png'}/>
      </Head>

      <FancyNav player={player} onLoginClick={()=>setShowLogin(true)} onLogout={handleLogout} settings={s}/>

      {/* HERO */}
      <header style={{minHeight:'100vh',display:'flex',flexDirection:'column',justifyContent:'center',alignItems:'center',textAlign:'center',padding:'160px 24px 60px'}}>

        {/* Floating orbs ambient */}
        <div style={{position:'absolute',inset:0,overflow:'hidden',pointerEvents:'none',zIndex:0}}>
          <div style={{position:'absolute',top:'15%',left:'10%',width:300,height:300,background:'radial-gradient(circle,rgba(255,107,0,0.06) 0%,transparent 70%)',animation:'particleDrift 8s ease-in-out infinite',borderRadius:'50%'}}/>
          <div style={{position:'absolute',top:'60%',right:'8%',width:200,height:200,background:'radial-gradient(circle,rgba(255,107,0,0.04) 0%,transparent 70%)',animation:'particleDrift 11s ease-in-out infinite 2s',borderRadius:'50%'}}/>
          <div style={{position:'absolute',top:'40%',left:'60%',width:150,height:150,background:'radial-gradient(circle,rgba(255,148,66,0.05) 0%,transparent 70%)',animation:'particleDrift 7s ease-in-out infinite 4s',borderRadius:'50%'}}/>
        </div>

        {/* Logo */}
        <div className="anim-hero anim-d1" style={{margin:'0 auto 32px',display:'flex',alignItems:'center',justifyContent:'center',position:'relative',zIndex:1}}>
          {s.logo_url
            ? <img src={s.logo_url} alt={serverName} style={{maxWidth:180,maxHeight:180,display:'block',background:'transparent',objectFit:'contain',filter:'drop-shadow(0 8px 32px rgba(255,107,0,0.45))',animation:'logoFloat 3.5s ease-in-out infinite'}}/>
            : <LogoImage alt={serverName} style={{width:160,height:160,objectFit:'contain',display:'block',filter:'drop-shadow(0 8px 32px rgba(255,107,0,0.55)) drop-shadow(0 0 60px rgba(255,107,0,0.2))',animation:'logoFloat 3.5s ease-in-out infinite'}}/>
          }
        </div>

        <span className="tagline-pill anim-hero-up anim-d2" style={{marginBottom:24,position:'relative',zIndex:1}}>SERVER ECONOMY | JAVA &amp; BEDROCK</span>

        <h1 className="font-space anim-hero anim-d3" style={{fontSize:'clamp(28px,6vw,48px)',fontWeight:700,lineHeight:1.2,marginBottom:16,maxWidth:800,position:'relative',zIndex:1}}>
          {s.hero_title || <>Selamat <span style={{color:'var(--primary)',textShadow:'0 0 30px var(--primary-glow)'}}>Datang</span></>}
        </h1>

        <p className="anim-hero-up anim-d4" style={{color:'var(--text-muted)',fontSize:15,maxWidth:540,lineHeight:1.6,marginBottom:40,position:'relative',zIndex:1}}>
          {s.server_description || 'Server Minecraft Indonesia dengan komunitas solid, event seru, dan dunia tanpa batas.'}
        </p>

        {/* Triple IP Grid */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,width:'100%',maxWidth:750,marginBottom:24,position:'relative',zIndex:1}} className="ip-grid anim-hero-up anim-d5">
          {[
            {label:'Java Edition IP',    addr:serverIp, icon:'computer',             copy:serverIp, copyLabel:'IP Java'},
            {label:'Bedrock Edition IP', addr:serverIp, icon:'mobile', copy:serverIp, copyLabel:'IP Bedrock'},
            {label:'Bedrock Port',       addr:'19015',  icon:'network-wired',         copy:'19015',  copyLabel:'Port Bedrock'},
          ].map((item,i) => (
            <div key={i} className="ip-card" onClick={()=>copyIP(item.copy, item.copyLabel)}
              style={{background:'rgba(15,15,20,0.7)',border:'1px solid var(--border)',borderRadius:14,padding:'14px 16px',cursor:'pointer',display:'flex',alignItems:'center',gap:12,position:'relative',backdropFilter:'blur(10px)'}}>
              <span style={{position:'absolute',top:8,right:8,fontSize:9,color:'var(--text-muted)',background:'rgba(255,255,255,0.03)',padding:'2px 6px',borderRadius:4,fontWeight:600}}>
                {copied===item.copyLabel ? '✓ Disalin' : 'Salin'}
              </span>
              <div style={{width:40,height:40,background:'rgba(255,107,0,0.1)',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--primary)',fontSize:16,flexShrink:0}}>
                <Icon name={item.icon} size={18}/>
              </div>
              <div style={{overflow:'hidden'}}>
                <span style={{fontSize:9,textTransform:'uppercase',color:'var(--text-muted)',fontWeight:700,letterSpacing:0.5,display:'block'}}>{item.label}</span>
                <span style={{fontSize:14,fontWeight:700,color:'#fff',display:'block',marginTop:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.addr}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Status pill */}
        <div className="status-pill anim-hero-up anim-d5" style={{marginBottom:32,position:'relative',zIndex:1}}>
          <Icon name="circle" size={8} style={{animation:'pulse 1.5s infinite'}}/>
          <span id="player-count">{playerCount}</span> Players Online
        </div>

        {/* Social buttons */}
        {socials.length > 0 && (
          <div className="anim-hero-up anim-d6" style={{display:'flex',flexWrap:'wrap',justifyContent:'center',gap:10,position:'relative',zIndex:1}}>
            {socials.map((x,i) => (
              <a key={i} href={x.href} target="_blank" rel="noopener noreferrer" className={`social-btn ${x.cls}`}>
                <Icon name={x.icon} size={16}/> {x.label}
              </a>
            ))}
          </div>
        )}
      </header>

      {/* STATS BAR */}
      <section className="stats-bar" data-anim="fade-in">
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',textAlign:'center',gap:20}}>
          {[
            {val:'24/7', sub:'Server Online'},
            {val:'JAVA', sub:'+ Bedrock'},
            {val:'FREE', sub:'Untuk Semua'},
            {val:'ID',   sub:'Community'},
          ].map((st,i) => (
            <div key={i} data-anim="scale-pop" data-delay={String(i+1)}>
              <h3 className="font-space" style={{fontSize:24,color:'var(--primary-light)',fontWeight:700}}>{st.val}</h3>
              <p style={{fontSize:12,color:'var(--text-muted)',marginTop:4,textTransform:'uppercase',fontWeight:600,letterSpacing:0.5}}>{st.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES — 2×2 Desktop Grid */}
      <section style={{padding:'100px 6% 60px',maxWidth:1200,margin:'0 auto'}}>
        <div style={{textAlign:'center',marginBottom:50}} data-anim="fade-up">
          <span style={{color:'var(--primary)',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:1.5,display:'block',marginBottom:8}}>KENAPA FANCY NETWORK</span>
          <h2 className="font-space" style={{fontSize:32,fontWeight:700}}>Server yang <span style={{color:'var(--primary)'}}>Beda</span> dari yang Lain</h2>
        </div>
        {/* 2×2 symmetric desktop grid */}
        <div style={{
          display:'grid',
          gridTemplateColumns:'repeat(2,1fr)',
          gridTemplateRows:'repeat(2,1fr)',
          gap:20,
          maxWidth:860,
          margin:'0 auto'
        }}>
          {[
            {icon:'shield-halved', color:'#e67e22', title:'Anti-Cheat Ketat',  desc:'Sistem perlindungan berlapis yang menjamin kenyamanan bermain tanpa gangguan cheater.'},
            {icon:'users', color:'#3498db', title:'Komunitas Solid',   desc:'Bergabunglah dengan ribuan pemain aktif di Discord dan game room yang ramah dan interaktif.'},
            {icon:'bolt',           color:'#2ecc71', title:'Low Latency',       desc:'Infrastruktur server terbaik khusus dioptimalkan untuk performa ping super rendah.'},
            {icon:'trophy',         color:'#9b59b6', title:'Event & Reward',    desc:'Event mingguan, daily reward, dan hadiah menarik menanti pemain aktif setiap harinya.'},
          ].map((f,i) => (
            <div key={i} className="fn-card" style={{padding:'28px 24px',display:'flex',alignItems:'flex-start',gap:16}} data-anim="flip-in" data-delay={String(i+1)}>
              {/* Icon style synced with support page cat-icon */}
              <div style={{
                width:44, height:44,
                background:`rgba(${f.color==='#e67e22'?'230,126,34':f.color==='#3498db'?'52,152,219':f.color==='#2ecc71'?'46,204,113':'155,89,182'},0.12)`,
                border:`1px solid ${f.color}30`,
                borderRadius:10,
                display:'flex', alignItems:'center', justifyContent:'center',
                color:f.color, fontSize:18, flexShrink:0
              }}>
                <Icon name={f.icon} size={20}/>
              </div>
              <div>
                <h4 style={{fontSize:15,fontWeight:700,marginBottom:8}}>{f.title}</h4>
                <p style={{fontSize:13,color:'var(--text-muted)',lineHeight:1.6}}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* RECRUITMENT */}
      <section style={{padding:'20px 6% 100px',maxWidth:1200,margin:'0 auto'}}>
        <div style={{textAlign:'center',marginBottom:50}} data-anim="fade-up">
          <span style={{color:'var(--primary)',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:1.5,display:'block',marginBottom:8}}>KONTRIBUSI &amp; REWARD</span>
          <h2 className="font-space" style={{fontSize:32,fontWeight:700}}>Buka Potensimu di <span style={{color:'var(--primary)'}}>{serverName}</span></h2>
        </div>
        <div style={{maxWidth:580,margin:'0 auto'}} data-anim="scale-pop" data-delay="2">
          <div style={{background:'linear-gradient(145deg,rgba(20,20,27,0.8),rgba(10,10,14,0.8))',border:'1px solid var(--border)',borderRadius:20,padding:40,position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',top:0,right:0,width:120,height:120,background:'radial-gradient(circle,rgba(255,107,0,0.1) 0%,transparent 70%)',pointerEvents:'none'}}/>
            <h3 className="font-space" style={{fontSize:22,fontWeight:700,marginBottom:20}}>Rank Famous</h3>
            <p style={{fontSize:13,color:'var(--text-muted)',marginBottom:24,lineHeight:1.6}}>
              Kreator Konten YouTube atau TikTok? Dapatkan hak istimewa status media, kustomisasi tag name, serta exposure di platform kami.
            </p>
            <ul style={{listStyle:'none',marginBottom:35}}>
              {['Tidak memiliki masalah dengan server lain','Membuat konten Fancy Network rutin','Viewers aktif dan organik','Konten positif & membangun'].map((r,i) => (
                <li key={i} style={{fontSize:13.5,color:'#d1d1d6',marginBottom:12,display:'flex',alignItems:'center',gap:10}}>
                  <Icon name="circle-check" size={13} color="#2ecc71"/> {r}
                </li>
              ))}
            </ul>
            <a href={famousApplyUrl} target="_blank" rel="noopener noreferrer"
              style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',color:'#fff',padding:14,borderRadius:10,fontWeight:600,fontSize:13,cursor:'pointer',width:'100%',display:'flex',alignItems:'center',justifyContent:'center',gap:8,textDecoration:'none',transition:'all 0.3s'}}
              onMouseEnter={e=>{e.currentTarget.style.background='var(--primary)';e.currentTarget.style.borderColor='var(--primary)';}}
              onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.04)';e.currentTarget.style.borderColor='rgba(255,255,255,0.08)';}}>
              Apply Requirement <Icon name="arrow-right" size={14} style={{marginLeft:4}}/>
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <FancyFooter serverName={serverName} />

      {showLogin && <LoginModal onClose={()=>setShowLogin(false)} onSuccess={handleLoginSuccess}/>}

      <style jsx>{`
        /* Desktop: 2×2 grid stays locked */
        @media(min-width:641px){
          .feature-grid { grid-template-columns: repeat(2,1fr) !important; }
        }
        /* Mobile: everything collapses to 1 col */
        @media(max-width:640px){
          .ip-grid { grid-template-columns: 1fr !important; }
          .feature-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
}
