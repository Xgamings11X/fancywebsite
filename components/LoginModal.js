import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import Icon from './Icon';

const UUID_RE = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;

function PlayerHeadPreview({ uuid, username, size=80 }) {
  const isValidUUID = uuid && UUID_RE.test(uuid);
  const name = username || 'steve';
  const fallbackUrl = `https://minotar.net/helm/${encodeURIComponent(name)}/${size * 2}`;
  const preferredUrl = isValidUUID
    ? `https://crafatar.com/renders/head/${uuid}?size=${size * 2}&overlay`
    : fallbackUrl;
  const [src, setSrc] = useState(preferredUrl);

  useEffect(() => setSrc(preferredUrl), [preferredUrl]);

  return (
    <img
      src={src}
      alt={`Avatar ${name}`}
      width={size}
      height={size}
      className="login-head-preview"
      referrerPolicy="no-referrer"
      onError={() => setSrc(fallbackUrl)}
    />
  );
}

export default function LoginModal({ onClose, onSuccess, product }) {
  const [platform, setPlatform] = useState('java');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);
  const successTimerRef = useRef(null);

  const isBedrock = platform === 'bedrock';
  const cleanUsername = username.trim().replace(/^\.+/, '');
  const finalUsername = isBedrock ? `.${cleanUsername}` : cleanUsername;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !preview && !loading) onClose?.();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      if (successTimerRef.current) window.clearTimeout(successTimerRef.current);
    };
  }, [loading, onClose, preview]);

  const changePlatform = (nextPlatform) => {
    if (loading) return;
    setPlatform(nextPlatform);
    setError('');
    setUsername('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!cleanUsername || loading) return;

    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/auth/login', {
        method:'POST',
        headers:{ 'Content-Type':'application/json', Accept:'application/json' },
        body:JSON.stringify({ username:finalUsername, platform }),
        credentials:'include',
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success || !data.player) {
        throw new Error(data.message || 'Username tidak ditemukan di server.');
      }

      setPreview(data.player);
      if (data.token) {
        try { localStorage.setItem('mc_token', data.token); } catch {}
      }
      successTimerRef.current = window.setTimeout(() => {
        toast.success(`Selamat datang, ${data.player.displayName || data.player.username}!`);
        onSuccess?.(data.player);
      }, 1100);
    } catch (submitError) {
      setError(submitError?.message || 'Tidak bisa terhubung ke server. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fn-modal-overlay"
      role="presentation"
      onClick={event => {
        if (event.target === event.currentTarget && !preview && !loading) onClose?.();
      }}>
      <div className="fn-modal animate-in" role="dialog" aria-modal="true" aria-labelledby="login-modal-title">
        <div className="login-modal-topbar"/>
        <div className="login-modal-body">
          {preview ? (
            <div className="login-success-wrap" aria-live="polite">
              <div className="login-success-avatar">
                <PlayerHeadPreview uuid={preview.uuid} username={preview.username} size={88}/>
              </div>
              <div className="login-success-head">
                <Icon name="circle-check" size={20} color="#2ecc71"/>
                <h2 id="login-modal-title" className="font-space login-success-title">Login berhasil</h2>
              </div>
              <p className="login-success-name">{preview.displayName || preview.username}</p>
              {preview.rank && preview.rank !== 'default' && <span className="login-success-rank">{preview.rank}</span>}
              <p className="login-success-sub">Menghubungkan akun...</p>
            </div>
          ) : (
            <>
              <div className="login-modal-head">
                <div>
                  <h2 id="login-modal-title" className="font-space login-modal-title">
                    {product ? 'Login untuk membeli' : 'Masuk ke akun pemain'}
                  </h2>
                  <p className="login-modal-subtitle">Gunakan username Minecraft yang pernah masuk ke server</p>
                </div>
                <button type="button" onClick={onClose} className="login-modal-close" disabled={loading} aria-label="Tutup modal login">
                  <Icon name="xmark" size={14}/>
                </button>
              </div>

              {product && (
                <div className="login-product-badge">
                  <Icon name="cart-shopping" size={16} color="var(--primary)"/>
                  <div><p className="login-product-label">Produk pilihan</p><p className="login-product-name">{product.name}</p></div>
                </div>
              )}

              <div className="tabs-container login-tabs" role="tablist" aria-label="Pilih platform Minecraft">
                <button type="button" role="tab" aria-selected={platform === 'java'} disabled={loading}
                  className={`tab-btn${platform === 'java' ? ' active' : ''}`} onClick={() => changePlatform('java')}>
                  <Icon name="mug" size={13} className="fn-icon-mr"/> Java
                </button>
                <button type="button" role="tab" aria-selected={platform === 'bedrock'} disabled={loading}
                  className={`tab-btn${platform === 'bedrock' ? ' active' : ''}`} onClick={() => changePlatform('bedrock')}>
                  <Icon name="mobile" size={13} className="fn-icon-mr"/> Bedrock
                </button>
              </div>

              <div className="login-info-strip">
                <Icon name="circle-info" size={13} color="var(--primary)" className="login-info-icon"/>
                {isBedrock
                  ? <>Masukkan nickname <strong className="login-info-strong">tanpa titik</strong>. Prefix titik ditambahkan otomatis.</>
                  : <>Masukkan username Java persis seperti yang tercatat di server.</>}
              </div>

              {error && (
                <div className="login-error" role="alert">
                  <Icon name="circle-exclamation" size={13} color="#e74c3c" className="login-error-icon"/>
                  <p className="login-error-text">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="login-field">
                  <label htmlFor="minecraft-username" className="login-field-label">
                    {isBedrock ? 'Nickname Bedrock' : 'Username Java'}
                  </label>
                  <div className="login-input-wrap">
                    {isBedrock && <span className="login-input-dot" aria-hidden="true">.</span>}
                    <input
                      id="minecraft-username"
                      type="text"
                      value={username}
                      onChange={event => setUsername(event.target.value.replace(/^\.+/, ''))}
                      placeholder={isBedrock ? 'NicknameBedrock' : 'UsernameJava'}
                      className={`fn-input login-username-input ${isBedrock ? 'bedrock' : ''}`}
                      maxLength={20}
                      autoComplete="username"
                      autoFocus
                      disabled={loading}
                      required
                    />
                  </div>
                  {isBedrock && cleanUsername && (
                    <p className="login-bedrock-hint">Di server: <strong className="login-bedrock-hint-name">.{cleanUsername}</strong></p>
                  )}
                </div>

                <button type="submit" className="btn-primary-fn login-submit-btn" disabled={loading || !cleanUsername}>
                  {loading
                    ? <><span className="fn-spinner fn-spinner-sm"/> Memeriksa...</>
                    : <><Icon name="right-to-bracket" size={13} className="fn-icon-mr"/> Masuk</>}
                </button>
              </form>

              <p className="login-footer-note">
                Akun harus sudah pernah <strong className="login-footer-strong">join ke server</strong> minimal sekali.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
