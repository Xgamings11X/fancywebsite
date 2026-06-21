import { useState } from 'react';
import toast from 'react-hot-toast';
import Icon from './Icon';

const UUID_RE = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;

function PlayerHeadPreview({ uuid, username, size=80 }) {
  const isValidUUID = uuid && UUID_RE.test(uuid);
  const name        = username || 'steve';
  const fallbackUrl = `https://minotar.net/helm/${encodeURIComponent(name)}/${size*2}`;
  const [src, setSrc] = useState(
    isValidUUID
      ? `https://crafatar.com/renders/head/${uuid}?size=${size*2}&overlay`
      : fallbackUrl
  );
  return (
    <img src={src} alt={name} width={size} height={size}
      className="login-head-preview"
      onError={()=>setSrc(fallbackUrl)}/>
  );
}

export default function LoginModal({ onClose, onSuccess, product }) {
  const [platform, setPlatform] = useState('java');
  const [username, setUsername] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [preview,  setPreview]  = useState(null);

  const isBedrock     = platform === 'bedrock';
  const finalUsername = isBedrock
    ? (username.startsWith('.') ? username : `.${username.trim()}`)
    : username.trim();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) return;
    setLoading(true); setError('');
    try {
      const res  = await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:finalUsername,platform}),credentials:'include'});
      const data = await res.json();
      if (res.ok && data.success) {
        setPreview(data.player);
        // Simpan token sebagai fallback untuk Authorization header
        if (data.token) { try { localStorage.setItem('mc_token', data.token); } catch{} }
        setTimeout(() => {
          toast.success(`Selamat datang, ${data.player.displayName||data.player.username}!`);
          onSuccess(data.player);
        }, 1400);
      } else {
        setError(data.message || 'Username tidak ditemukan di server.');
      }
    } catch { setError('Tidak bisa terhubung ke server. Coba lagi.'); }
    setLoading(false);
  };

  return (
    <div className="fn-modal-overlay" onClick={e=>{ if(e.target===e.currentTarget && !preview) onClose(); }}>
      <div className="fn-modal animate-in">

        {/* Top accent bar */}
        <div className="login-modal-topbar"/>

        <div className="login-modal-body">

          {/* SUCCESS STATE — tampilkan head skin */}
          {preview ? (
            <div className="login-success-wrap">
              <div className="login-success-avatar">
                <PlayerHeadPreview uuid={preview.uuid} username={preview.username} size={88}/>
              </div>
              <div className="login-success-head">
                <Icon name="circle-check" size={20} color="#2ecc71"/>
                <h2 className="font-space login-success-title">Login Berhasil!</h2>
              </div>
              <p className="login-success-name">{preview.displayName||preview.username}</p>
              {preview.rank && preview.rank!=='default' && (
                <span className="login-success-rank">
                  {preview.rank}
                </span>
              )}
              <p className="login-success-sub">Back To Homepage...</p>
            </div>

          ) : (
            /* FORM STATE */
            <>
              <div className="login-modal-head">
                <div>
                  <h2 className="font-space login-modal-title">
                    {product ? 'Login untuk Membeli' : 'Masuk'}
                  </h2>
                  <p className="login-modal-subtitle">Gunakan username Minecraft kamu</p>
                </div>
                <button onClick={onClose} className="login-modal-close">
                  <Icon name="xmark" size={14}/>
                </button>
              </div>

              {/* Product mini-badge */}
              {product && (
                <div className="login-product-badge">
                  <Icon name="cart-shopping" size={16} color="var(--primary)"/>
                  <div>
                    <p className="login-product-label">Kamu ingin membeli</p>
                    <p className="login-product-name">{product.name}</p>
                  </div>
                </div>
              )}

              {/* Platform Tabs */}
              <div className="tabs-container login-tabs">
                <button className={`tab-btn${platform==='java'?' active':''}`} onClick={()=>{setPlatform('java');setError('');setUsername('');}}>
                  <Icon name="mug" size={13} className="fn-icon-mr"/> Java
                </button>
                <button className={`tab-btn${platform==='bedrock'?' active':''}`} onClick={()=>{setPlatform('bedrock');setError('');setUsername('');}}>
                  <Icon name="mobile" size={13} className="fn-icon-mr"/> Bedrock
                </button>
              </div>

              {/* Info strip */}
              <div className="login-info-strip">
                {isBedrock
                  ? <><Icon name="circle-info" size={13} color="var(--primary)" className="login-info-icon"/>Masukkan nickname <strong className="login-info-strong">tanpa titik</strong>. Prefix <code className="login-info-code"> . </code> ditambahkan otomatis.</>
                  : <><Icon name="circle-info" size={13} color="var(--primary)" className="login-info-icon"/>Masukkan username Java persis seperti di server.</>
                }
              </div>

              {/* Error */}
              {error && (
                <div className="login-error">
                  <Icon name="circle-exclamation" size={13} color="#e74c3c" className="login-error-icon"/>
                  <p className="login-error-text">{error}</p>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit}>
                <div className="login-field">
                  <label className="login-field-label">
                    {isBedrock ? 'Nickname Bedrock' : 'Username Java'}
                  </label>
                  <div className="login-input-wrap">
                    {isBedrock && (
                      <span className="login-input-dot">.</span>
                    )}
                    <input type="text" value={username} onChange={e=>setUsername(e.target.value)}
                      placeholder={isBedrock ? 'NicknameBedrock' : 'UsernameJava'}
                      className={`fn-input login-username-input ${isBedrock?'bedrock':''}`} maxLength={20} autoComplete="off" required/>
                  </div>
                  {isBedrock && username && (
                    <p className="login-bedrock-hint">
                      Di server: <strong className="login-bedrock-hint-name">.{username}</strong>
                    </p>
                  )}
                </div>

                <button type="submit" className="btn-primary-fn login-submit-btn" disabled={loading||!username.trim()}>
                  {loading
                    ? <><span className="fn-spinner fn-spinner-sm"/> Memeriksa...</>
                    : <><Icon name="right-to-bracket" size={13} className="fn-icon-mr"/> Masuk</>
                  }
                </button>
              </form>

              <p className="login-footer-note">
                Harus sudah pernah <strong className="login-footer-strong">join ke server</strong> minimal sekali
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
