import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import LogoImage, { useTransparentLogo } from './LogoImage';
import Icon from './Icon';

export default function FancyNav({ player, onLoginClick, onLogout, settings }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const router  = useRouter();
  const s       = settings || {};
  const logoUrl = s.logo_url || null;
  const logoTxt = s.logo_text || 'Fancy Network';

  const links = [
    { href:'/',        label:'Home'    },
    { href:'/store',   label:'Store'   },
    { href:'/support', label:'Support' },
  ];

  return (
    <nav className="fn-nav">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 flex-shrink-0" style={{textDecoration:'none'}}>
        {logoUrl
          ? <img src={logoUrl} alt={logoTxt}
              style={{height:40,width:'auto',background:'transparent',objectFit:'contain',filter:'drop-shadow(0 2px 8px rgba(249,115,22,0.3))',animation:'logoFloat 3s ease-in-out infinite'}}/>
          : <span className="font-space font-bold text-base" style={{display:'flex',alignItems:'center',gap:6,color:'var(--text-main)'}}>
              <LogoImage src={logoUrl||undefined} alt={logoTxt} style={{height:38,width:38,objectFit:'contain',filter:'drop-shadow(0 2px 8px rgba(249,115,22,0.3))',animation:'logoFloat 3s ease-in-out infinite'}}/>
              <span><span style={{color:'var(--primary)'}}>FANCY</span> NETWORK</span>
            </span>
        }
      </Link>

      {/* Desktop menu */}
      <ul className="hidden md:flex list-none gap-5 items-center">
        {links.map(l => (
          <li key={l.href}>
            <Link href={l.href}
              style={{
                color: router.pathname===l.href ? 'var(--primary)' : 'var(--text-muted)',
                fontWeight:700, fontSize:14, textDecoration:'none',
                transition:'color 0.25s ease, transform 0.25s ease',
                display:'inline-block',
                transform: router.pathname===l.href ? 'translateY(-1px)' : 'translateY(0)'
              }}>
              {l.label}
            </Link>
          </li>
        ))}
      </ul>

      {/* Right side */}
      <div className="flex items-center gap-2 fn-nav-actions">
        {player ? (
          <div className="flex items-center gap-2">
            {/* Player badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full"
              style={{background:'rgba(249,115,22,0.06)',border:'1px solid rgba(249,115,22,0.15)'}}>
              <PlayerAvatar uuid={player.uuid} username={player.username} size={22}/>
              <span style={{color:'var(--text-main)',fontSize:13,fontWeight:600}}>
                {player.displayName || player.username}
              </span>
              {player.rank && player.rank !== 'default' && (
                <span className="hidden sm:inline px-1.5 py-0.5 rounded text-xs font-bold"
                  style={{background:'var(--primary)',color:'#fff',fontSize:10}}>
                  {player.rank.toUpperCase()}
                </span>
              )}
            </div>
            <button onClick={onLogout} className="btn-login-nav" style={{color:'var(--text-muted)',fontSize:12}}>
              <Icon name="right-from-bracket" size={14}/>
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        ) : (
          <button onClick={onLoginClick} className="btn-login-nav">
            <Icon name="right-to-bracket" size={14} style={{marginRight:6}}/> Login
          </button>
        )}

        {/* Hamburger */}
        <button className="md:hidden flex items-center justify-center w-10 h-10 rounded-xl"
          style={{
            background: menuOpen ? 'rgba(249,115,22,0.1)' : 'rgba(249,115,22,0.04)',
            border: menuOpen ? '1px solid rgba(249,115,22,0.4)' : '1px solid rgba(249,115,22,0.15)',
            color:'var(--primary)', fontSize:16,
            transition:'all 0.25s ease',
          }}
          onClick={() => setMenuOpen(!menuOpen)}>
          <Icon name={menuOpen ? "xmark" : "bars"}
            style={{transition:'transform 0.3s cubic-bezier(0.34,1.56,0.64,1)',
              transform: menuOpen ? 'rotate(90deg) scale(1.1)' : 'rotate(0deg) scale(1)'}}/>
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="md:hidden absolute left-0 right-0 rounded-xl p-4 flex flex-col gap-3"
          style={{
            top:64,
            background:'rgba(255, 255, 255, 0.98)',
            border:'1px solid rgba(249,115,22,0.2)',
            boxShadow:'0 16px 35px rgba(67, 26, 4, 0.08)',
            backdropFilter:'blur(16px)',
            animation:'mobileMenuIn 0.32s cubic-bezier(0.22,1,0.36,1) both',
          }}>
          {links.map((l, i) => (
            <Link key={l.href} href={l.href} onClick={() => setMenuOpen(false)}
              style={{
                color: router.pathname===l.href ? 'var(--primary)' : 'var(--text-muted)',
                fontWeight:700, fontSize:14, textDecoration:'none',
                padding:'10px 12px', borderRadius:10,
                background: router.pathname===l.href ? 'rgba(249,115,22,0.06)' : 'transparent',
                borderLeft: router.pathname===l.href ? '3px solid var(--primary)' : '3px solid transparent',
                display:'flex', alignItems:'center', gap:10,
                animation:`menuItemIn 0.25s cubic-bezier(0.22,1,0.36,1) both`,
                animationDelay: `${i * 0.04}s`,
                transition:'background 0.2s, color 0.2s',
              }}>
              {l.label}
            </Link>
          ))}
          {!player && (
            <button onClick={() => { setMenuOpen(false); onLoginClick?.(); }}
              className="btn-primary-fn justify-center w-full">
              <Icon name="right-to-bracket" size={14} style={{marginRight:6}}/> Login
            </button>
          )}
          {player && (
            <button onClick={() => { setMenuOpen(false); onLogout?.(); }}
              className="btn-ghost-fn justify-center w-full">
              <Icon name="right-from-bracket" size={14}/> Keluar ({player.displayName||player.username})
            </button>
          )}
        </div>
      )}
    </nav>
  );
}

const UUID_RE = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;

export function PlayerAvatar({ uuid, username, size = 28 }) {
  const [hasFailed, setHasFailed] = useState(false);

  useEffect(() => {
    setHasFailed(false);
  }, [uuid, username]);

  const isValidUUID = uuid && UUID_RE.test(uuid);
  const name        = username || 'steve';
  const fallbackUrl = `https://minotar.net/helm/${encodeURIComponent(name)}/${size * 2}`;
  
  const currentSrc = (isValidUUID && !hasFailed)
    ? `https://crafatar.com/renders/head/${uuid}?size=${size * 2}&overlay`
    : fallbackUrl;

  return (
    <img 
      src={currentSrc} 
      alt={name} 
      width={size} 
      height={size}
      style={{borderRadius:4, imageRendering:'pixelated', flexShrink:0}}
      onError={() => setHasFailed(true)}
    />
  );
}
