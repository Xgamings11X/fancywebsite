import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import LogoImage from './LogoImage';
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
      <Link href="/" className="flex items-center gap-2 flex-shrink-0 fn-logo-link">
        {logoUrl
          ? <img src={logoUrl} alt={logoTxt} className="fn-logo-img"/>
          : <span className="font-space font-bold text-white text-base fn-logo-fallback">
              <LogoImage src={logoUrl||undefined} alt={logoTxt} className="fn-logo-fallback-icon"/>
              <span><span className="fn-logo-brand">FANCY</span> NETWORK</span>
            </span>
        }
      </Link>

      {/* Desktop menu */}
      <ul className="hidden md:flex list-none gap-5 items-center">
        {links.map(l => (
          <li key={l.href}>
            <Link href={l.href}
              className={`fn-nav-link ${router.pathname===l.href ? 'active' : ''}`}>
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
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full fn-player-badge">
              <PlayerAvatar uuid={player.uuid} username={player.username} size={22}/>
              <span className="fn-player-name">
                {player.displayName || player.username}
              </span>
              {player.rank && player.rank !== 'default' && (
                <span className="hidden sm:inline px-1.5 py-0.5 rounded text-xs font-bold fn-player-rank">
                  {player.rank.toUpperCase()}
                </span>
              )}
            </div>
            <button onClick={onLogout} className="btn-login-nav fn-nav-logout">
              <Icon name="right-from-bracket" size={14}/>
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        ) : (
          <button onClick={onLoginClick} className="btn-login-nav">
            <Icon name="right-to-bracket" size={14} className="fn-icon-mr"/> Login
          </button>
        )}

        {/* Hamburger */}
        <button
          className={`md:hidden flex items-center justify-center w-10 h-10 rounded-xl fn-hamburger ${menuOpen ? 'active' : ''}`}
          onClick={() => setMenuOpen(!menuOpen)}>
          <Icon name={menuOpen ? "xmark" : "bars"}
            className={`fn-hamburger-icon ${menuOpen ? 'active' : ''}`}/>
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="md:hidden absolute left-0 right-0 rounded-xl p-4 flex flex-col gap-3 fn-mobile-menu">
          {links.map((l, i) => (
            <Link key={l.href} href={l.href} onClick={() => setMenuOpen(false)}
              className={`fn-mobile-link ${router.pathname===l.href ? 'active' : ''}`}
              style={{ '--item-delay': `${i * 0.05 + 0.05}s` }}>
              {l.label}
            </Link>
          ))}
          {!player && (
            <button onClick={() => { setMenuOpen(false); onLoginClick?.(); }}
              className="btn-primary-fn justify-center w-full">
              <Icon name="right-to-bracket" size={14} className="fn-icon-mr"/> Login
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

// ── FIX TOTAL: PlayerAvatar Komponen yang kini Reaktif terhadap Perubahan Properti ──
export function PlayerAvatar({ uuid, username, size = 28 }) {
  const [hasFailed, setHasFailed] = useState(false);

  // Jika uuid atau username berganti (misal pindah halaman/tab), reset status error gambar
  useEffect(() => {
    setHasFailed(false);
  }, [uuid, username]);

  const isValidUUID = uuid && UUID_RE.test(uuid);
  const name        = username || 'steve';
  const fallbackUrl = `https://minotar.net/helm/${encodeURIComponent(name)}/${size * 2}`;

  // URL ditentukan langsung saat proses render berjalan (Bukan dikunci di useState)
  const currentSrc = (isValidUUID && !hasFailed)
    ? `https://crafatar.com/renders/head/${uuid}?size=${size * 2}&overlay`
    : fallbackUrl;

  return (
    <img
      src={currentSrc}
      alt={name}
      width={size}
      height={size}
      className="fn-player-avatar"
      onError={() => setHasFailed(true)}
    />
  );
}
