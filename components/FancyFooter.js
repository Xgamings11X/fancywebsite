/**
 * components/FancyFooter.js — Komponen footer global yang dipakai di semua halaman.
 * Import sekali, update sekali → semua halaman ikut.
 */
import Link from 'next/link';

export default function FancyFooter({ serverName = 'Fancy Network' }) {
  return (
    <footer className="fn-footer" data-anim="fade-up">
      <div className="font-space" style={{ fontWeight: 700, fontSize: 18, marginBottom: 12 }}>
        FANCY<span style={{ color: 'var(--primary)' }}> NETWORK</span>
      </div>
      <ul style={{ display: 'flex', justifyContent: 'center', gap: 20, listStyle: 'none', marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { href: '/',        label: 'Home'    },
          { href: '/store',   label: 'Store'   },
          { href: '/support', label: 'Support' },
        ].map(l => (
          <li key={l.href}>
            <Link href={l.href} style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: 13 }}>
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
      <div className="fn-footer-bottom">
        © {new Date().getFullYear()} {serverName}. Tidak terafiliasi dengan Mojang Studios.
      </div>
    </footer>
  );
}
