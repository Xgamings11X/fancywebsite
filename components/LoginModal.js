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
      style={{borderRadius:12,imageRendering:'pixelated',border:'2px solid rgba(255,107,0,0.3)',boxShadow:'0 8px 24px rgba(255,107,0,0.15)',display:'block',margin:'0 auto'}}
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
        <div style={{height:3,background:`linear-gradient(90deg,var(--primary),var(--primary-light),var(--primary))`}}/>

        <div style={{padding:'28px 28px 32px'}}>

          {/* SUCCESS STATE — tampilkan head skin */}
          {preview ? (
            <div style={{textAlign:'center',padding:'8px 0'}}>
              <div style={{marginBottom:20}}>
                <PlayerHeadPreview uuid={preview.uuid} username={preview.username} size={88}/>
              </div>
              <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,marginBottom:6}}>
                <Icon name="circle-check" size={20} color="#2ecc71"/>
                <h2 className="font-space" style={{fontSize:22,fontWeight:700}}>Login Berhasil!</h2>
              </div>
              <p style={{color:'var(--primary-light)',fontWeight:700,fontSize:17,marginBottom:4}}>{preview.displayName||preview.username}</p>
              {preview.rank && preview.rank!=='default' && (
                <span style={{background:'rgba(255,107,0,0.15)',color:'var(--primary-light)',padding:'4px 12px',borderRadius:6,fontSize:11,fontWeight:700,textTransform:'uppercase',display:'inline-block',marginBottom:8}}>
                  {preview.rank}
                </span>
              )}
              <p style={{color:'var(--text-muted)',fontSize:13,marginTop:8}}>Back To Homepage...</p>
            </div>

          ) : (
            /* FORM STATE */
            <>
              <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:22}}>
                <div>
                  <h2 className="font-space" style={{fontSize:20,fontWeight:700,marginBottom:4}}>
                    {product ? 'Login untuk Membeli' : 'Masuk'}
                  </h2>
                  <p style={{color:'var(--text-muted)',fontSize:13}}>Gunakan username Minecraft kamu</p>
                </div>
                <button onClick={onClose} style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',color:'var(--text-muted)',width:32,height:32,borderRadius:8,cursor:'pointer',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <Icon name="xmark" size={14}/>
                </button>
              </div>

              {/* Product mini-badge */}
              {product && (
                <div style={{background:'rgba(255,107,0,0.06)',border:'1px solid rgba(255,107,0,0.15)',borderRadius:10,padding:'10px 14px',marginBottom:20,display:'flex',alignItems:'center',gap:12}}>
                  <Icon name="cart-shopping" size={16} color="var(--primary)"/>
                  <div>
                    <p style={{fontSize:10,color:'var(--text-muted)',fontWeight:700,textTransform:'uppercase',marginBottom:2}}>Kamu ingin membeli</p>
                    <p style={{fontWeight:700,fontSize:14,color:'#fff'}}>{product.name}</p>
                  </div>
                </div>
              )}

              {/* Platform Tabs */}
              <div className="tabs-container" style={{marginBottom:20}}>
                <button className={`tab-btn${platform==='java'?' active':''}`} onClick={()=>{setPlatform('java');setError('');setUsername('');}}>
                  <Icon name="mug" size={13} style={{marginRight:5}}/> Java
                </button>
                <button className={`tab-btn${platform==='bedrock'?' active':''}`} onClick={()=>{setPlatform('bedrock');setError('');setUsername('');}}>
                  <Icon name="mobile" size={13} style={{marginRight:5}}/> Bedrock
                </button>
              </div>

              {/* Info strip */}
              <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.05)',borderRadius:8,padding:'10px 14px',marginBottom:18,fontSize:12,color:'var(--text-muted)',lineHeight:1.5}}>
                {isBedrock
                  ? <><Icon name="circle-info" size={13} color="var(--primary)" style={{marginRight:6}}/>Masukkan nickname <strong style={{color:'#fff'}}>tanpa titik</strong>. Prefix <code style={{color:'var(--primary-light)',fontWeight:700}}> . </code> ditambahkan otomatis.</>
                  : <><Icon name="circle-info" size={13} color="var(--primary)" style={{marginRight:6}}/>Masukkan username Java persis seperti di server.</>
                }
              </div>

              {/* Error */}
              {error && (
                <div style={{background:'rgba(231,76,60,0.08)',border:'1px solid rgba(231,76,60,0.2)',borderRadius:8,padding:'10px 14px',marginBottom:16,display:'flex',alignItems:'flex-start',gap:10}}>
                  <Icon name="circle-exclamation" size={13} color="#e74c3c" style={{marginTop:1,flexShrink:0}}/>
                  <p style={{fontSize:13,color:'#e74c3c',lineHeight:1.5}}>{error}</p>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit}>
                <div style={{marginBottom:16}}>
                  <label style={{display:'block',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:0.5,color:'var(--text-muted)',marginBottom:8}}>
                    {isBedrock ? 'Nickname Bedrock' : 'Username Java'}
                  </label>
                  <div style={{position:'relative',display:'flex',alignItems:'center'}}>
                    {isBedrock && (
                      <span style={{position:'absolute',left:14,fontFamily:'monospace',fontWeight:700,color:'var(--primary-light)',fontSize:16,userSelect:'none',zIndex:1}}>.</span>
                    )}
                    <input type="text" value={username} onChange={e=>setUsername(e.target.value)}
                      placeholder={isBedrock ? 'NicknameBedrock' : 'UsernameJava'}
                      className="fn-input" maxLength={20} autoComplete="off" required
                      style={{paddingLeft: isBedrock ? 26 : 16}}/>
                  </div>
                  {isBedrock && username && (
                    <p style={{fontSize:11,color:'var(--text-muted)',marginTop:6}}>
                      Di server: <strong style={{color:'var(--primary-light)',fontFamily:'monospace'}}>.{username}</strong>
                    </p>
                  )}
                </div>

                <button type="submit" className="btn-primary-fn" disabled={loading||!username.trim()}
                  style={{width:'100%',justifyContent:'center',padding:'13px',fontSize:14,borderRadius:10}}>
                  {loading
                    ? <><span className="fn-spinner" style={{width:16,height:16,borderWidth:2}}/> Memeriksa...</>
                    : <><Icon name="right-to-bracket" size={13} style={{marginRight:6}}/> Masuk</>
                  }
                </button>
              </form>

              <p style={{textAlign:'center',color:'var(--text-muted)',fontSize:12,marginTop:16}}>
                Harus sudah pernah <strong style={{color:'var(--primary-light)'}}>join ke server</strong> minimal sekali
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
