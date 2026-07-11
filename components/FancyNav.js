import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import LogoImage from './LogoImage';
import Icon from './Icon';

export default function FancyNav({ player, onLoginClick, onLogout, settings }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navRef = useRef(null);
  const router = useRouter();
  const s = settings || {};
  const logoUrl = s.logo_url || null;
  const logoTxt = s.logo_text || s.server_name || 'Fancy Network';

  const links = [
    { href:'/', label:'Home' },
    { href:'/store', label:'Store' },
    { href:'/support', label:'Support' },
  ];

  const isActive = (href) => href === '/'
    ? router.pathname === '/'
    : router.pathname === href || router.pathname.startsWith(`${href}/`);

  useEffect(() => {
    const closeMenu = () => setMenuOpen(false);
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') closeMenu();
    };
    const handlePointerDown = (event) => {
      if (menuOpen && navRef.current && !navRef.current.contains(event.target)) closeMenu();
    };

    router.events.on('routeChangeStart', closeMenu);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      router.events.off('routeChangeStart', closeMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [menuOpen, router.events]);

  return (
    <nav ref={navRef} className="fn-nav" aria-label="Navigasi utama">
      <Link href="/" className="flex items-center gap-2 flex-shrink-0 fn-logo-link" aria-label={`${logoTxt} — Beranda`}>
        {logoUrl ? (
          <img src={logoUrl} alt={logoTxt} className="fn-logo-img"/>
        ) : (
          <span className="font-space font-bold text-white text-base fn-logo-fallback">
            <LogoImage alt="" className="fn-logo-fallback-icon"/>
            <span><span className="fn-logo-brand">FANCY</span> NETWORK</span>
          </span>
        )}
      </Link>

      <ul className="hidden md:flex list-none gap-5 items-center">
        {links.map(link => (
          <li key={link.href}>
            <Link href={link.href} aria-current={isActive(link.href) ? 'page' : undefined}
              className={`fn-nav-link ${isActive(link.href) ? 'active' : ''}`}>
              {link.label}
            </Link>
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-2 fn-nav-actions">
        {player ? (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full fn-player-badge" title={player.displayName || player.username}>
              <PlayerAvatar uuid={player.uuid} username={player.username} size={22}/>
              <span className="fn-player-name">{player.displayName || player.username}</span>
              {player.rank && player.rank !== 'default' && (
                <span className="hidden sm:inline px-1.5 py-0.5 rounded text-xs font-bold fn-player-rank">
                  {String(player.rank).toUpperCase()}
                </span>
              )}
            </div>
            <button type="button" onClick={onLogout} className="btn-login-nav fn-nav-logout" aria-label="Keluar dari akun">
              <Icon name="right-from-bracket" size={14}/>
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        ) : (
          <button type="button" onClick={onLoginClick} className="btn-login-nav">
            <Icon name="right-to-bracket" size={14} className="fn-icon-mr"/> Login
          </button>
        )}

        <button
          type="button"
          className={`md:hidden flex items-center justify-center w-10 h-10 rounded-xl fn-hamburger ${menuOpen ? 'active' : ''}`}
          onClick={() => setMenuOpen(open => !open)}
          aria-expanded={menuOpen}
          aria-controls="fn-mobile-navigation"
          aria-label={menuOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}>
          <Icon name={menuOpen ? 'xmark' : 'bars'} className={`fn-hamburger-icon ${menuOpen ? 'active' : ''}`}/>
        </button>
      </div>

      {menuOpen && (
        <div id="fn-mobile-navigation" className="md:hidden absolute left-0 right-0 rounded-xl p-4 flex flex-col gap-3 fn-mobile-menu">
          {links.map((link, index) => (
            <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)}
              aria-current={isActive(link.href) ? 'page' : undefined}
              className={`fn-mobile-link ${isActive(link.href) ? 'active' : ''}`}
              style={{ '--item-delay': `${index * 0.05 + 0.05}s` }}>
              {link.label}
            </Link>
          ))}
          {!player ? (
            <button type="button" onClick={() => { setMenuOpen(false); onLoginClick?.(); }} className="btn-primary-fn justify-center w-full">
              <Icon name="right-to-bracket" size={14} className="fn-icon-mr"/> Login
            </button>
          ) : (
            <button type="button" onClick={() => { setMenuOpen(false); onLogout?.(); }} className="btn-ghost-fn justify-center w-full">
              <Icon name="right-from-bracket" size={14}/> Keluar ({player.displayName || player.username})
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

  useEffect(() => setHasFailed(false), [uuid, username]);

  const isValidUUID = uuid && UUID_RE.test(uuid);
  const name = username || 'steve';
  const fallbackUrl = `https://minotar.net/helm/${encodeURIComponent(name)}/${size * 2}`;
  const currentSrc = isValidUUID && !hasFailed
    ? `https://crafatar.com/renders/head/${uuid}?size=${size * 2}&overlay`
    : fallbackUrl;

  return (
    <img
      src={currentSrc}
      alt={`Avatar ${name}`}
      width={size}
      height={size}
      className="fn-player-avatar"
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setHasFailed(true)}
    />
  );
}
