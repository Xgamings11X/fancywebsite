import Link from 'next/link';
import Icon from './Icon';
import LogoImage from './LogoImage';

function safeUrl(value) {
  if (!value) return '';
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : '';
  } catch {
    return '';
  }
}

export default function FancyFooter({ serverName = 'Fancy Network', discordUrl = '', settings = {} }) {
  const year = new Date().getFullYear();
  const s = settings || {};
  const javaIp = s.server_ip || 'play.fancynet.my.id';
  const bedrockIp = s.bedrock_ip || javaIp;
  const bedrockPort = String(s.bedrock_port || '19132');
  const resolvedDiscord = safeUrl(s.discord_url || discordUrl);

  const socials = [
    { href: resolvedDiscord, label: 'Discord', icon: 'discord' },
    { href: safeUrl(s.whatsapp_url), label: 'WhatsApp', icon: 'whatsapp' },
    { href: safeUrl(s.tiktok_url), label: 'TikTok', icon: 'tiktok' },
    { href: safeUrl(s.youtube_url), label: 'YouTube', icon: 'youtube' },
  ].filter(item => item.href);

  return (
    <footer className="public-footer">
      <div className="public-footer-cta">
        <div>
          <span>MULAI PETUALANGANMU</span>
          <h2>Siap bermain di {serverName}?</h2>
          <p>Login, pilih produk bila diperlukan, atau hubungi tim support melalui ticket web yang terhubung dengan Discord.</p>
        </div>
        <div className="public-footer-cta-actions">
          <Link href="/store" className="public-footer-primary-action">
            Buka Store <Icon name="arrow-right" size={16} />
          </Link>
          <Link href="/support" className="public-footer-secondary-action">
            Buat Ticket <Icon name="comment-dots" size={16} />
          </Link>
        </div>
      </div>

      <div className="public-footer-grid">
        <div className="public-footer-brand">
          <div className="public-footer-logo-row">
            <span className="public-footer-logo"><LogoImage alt="" /></span>
            <div><strong>{serverName}</strong><small>Minecraft Java &amp; Bedrock Network</small></div>
          </div>
          <p>Survival Economy semi-RPG dengan progres yang jelas, komunitas aktif, transaksi otomatis, dan dukungan lintas website serta Discord.</p>
          {socials.length > 0 && (
            <div className="public-footer-socials">
              {socials.map(item => (
                <a key={item.label} href={item.href} target="_blank" rel="noopener noreferrer" aria-label={item.label}>
                  <Icon name={item.icon} size={17} />
                </a>
              ))}
            </div>
          )}
        </div>

        <div className="public-footer-column">
          <strong>Navigasi</strong>
          <Link href="/">Home</Link>
          <Link href="/store">Store</Link>
          <Link href="/support">Support</Link>
          {safeUrl(s.vote_url) && <a href={safeUrl(s.vote_url)} target="_blank" rel="noopener noreferrer">Vote Server</a>}
        </div>

        <div className="public-footer-column public-footer-server-column">
          <strong>Server Info</strong>
          <div><span>Java IP</span><code>{javaIp}</code></div>
          <div><span>Bedrock IP</span><code>{bedrockIp}</code></div>
          <div><span>Bedrock Port</span><code>{bedrockPort}</code></div>
        </div>

        <div className="public-footer-column">
          <strong>Bantuan</strong>
          <Link href="/support">Buat ticket baru</Link>
          <Link href="/support?view=tickets">Lihat ticket saya</Link>
          {resolvedDiscord && <a href={resolvedDiscord} target="_blank" rel="noopener noreferrer">Discord community</a>}
          <span className="public-footer-small-copy">Balasan ticket dapat diterima melalui web atau Discord.</span>
        </div>
      </div>

      <div className="public-footer-bottom">
        <span>© {year} {serverName}. Semua hak dilindungi.</span>
        <span>Minecraft adalah merek dagang Mojang Studios. Situs ini tidak berafiliasi dengan Mojang atau Microsoft.</span>
      </div>
    </footer>
  );
}
