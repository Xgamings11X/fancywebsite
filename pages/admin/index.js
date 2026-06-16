import { useState, useEffect, useCallback, useRef } from 'react';
import Head from 'next/head';
import toast from 'react-hot-toast';
import ImageUpload from '../../components/ImageUpload';

const TABS = [
  { id:'dashboard', label:'Dashboard',    icon:'fa-chart-line'    },
  { id:'products',  label:'Produk',        icon:'fa-box-open'      },
  { id:'categories',label:'Kategori',      icon:'fa-folder-open'   },
  { id:'redeem',    label:'Redeem Code',   icon:'fa-ticket'        },
  { id:'orders',    label:'Log Transaksi', icon:'fa-receipt'       },
  { id:'reports',   label:'Report',        icon:'fa-flag'          },
  { id:'settings',  label:'Pengaturan',    icon:'fa-gear'          },
];

const idr = v => `Rp ${Number(v||0).toLocaleString('id-ID')}`;
const fmt = d => d ? new Date(d).toLocaleString('id-ID',{dateStyle:'short',timeStyle:'short'}) : '-';

const ORDER_STATUS_BADGE = {
  pending:   'admin-badge-yellow',
  success:   'admin-badge-green',
  paid:      'admin-badge-green',
  failed:    'admin-badge-red',
  expired:   'admin-badge-gray',
  cancelled: 'admin-badge-gray',
};

const TICKET_STATUS_BADGE = {
  open:      'admin-badge-yellow',
  in_review: 'admin-badge-blue',
  resolved:  'admin-badge-green',
  rejected:  'admin-badge-red',
};

const TICKET_STATUS_LABEL = { open:'Menunggu', in_review:'Review', resolved:'Selesai', rejected:'Ditolak' };

const TICKET_TYPES = {
  banding:'⚖️ Aju Banding', bug:'🐛 Report Bug',
  report_player:'🚨 Report Pemain', lainnya:'📝 Lainnya',
};

function useAF() {
  return useCallback(async (url, opts={}) => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : '';
    const res = await fetch(url, {
      ...opts,
      headers: { 'Content-Type':'application/json', ...(t?{Authorization:`Bearer ${t}`}:{}), ...(opts.headers||{}) },
      credentials: 'include',
    });
    if (res.status === 401) { localStorage.removeItem('admin_token'); window.location.reload(); }
    return res.json().catch(()=>({}));
  }, []);
}

export default function AdminPanel() {
  const [tab,          setTab]          = useState('dashboard');
  const [sidebar,      setSidebar]      = useState(true);
  const [loggedIn,     setLoggedIn]     = useState(false);
  const [lForm,        setLForm]        = useState({username:'',password:''});
  const [lLoading,     setLLoading]     = useState(false);
  const [lError,       setLError]       = useState('');
  const [showPwd,      setShowPwd]      = useState(false);
  const [loading,      setLoading]      = useState(false);

  const [products,     setProducts]     = useState([]);
  const [categories,   setCategories]   = useState([]);
  const [prodSortDirty,   setProdSortDirty]   = useState(false);
  const [catSortDirty,    setCatSortDirty]    = useState(false);
  const [prodSortSaving,  setProdSortSaving]  = useState(false);
  const [catSortSaving,   setCatSortSaving]   = useState(false);
  const [orders,       setOrders]       = useState([]);
  const [tickets,      setTickets]      = useState([]);
  const [codes,        setCodes]        = useState([]);
  const [stats,        setStats]        = useState({total:0,success:0,pending:0,failed:0,revenue:0});
  const [orderFilter,  setOrderFilter]  = useState('all');
  const [reportFilter, setReportFilter] = useState('all');

  const [showProductModal,  setShowProductModal]  = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showRedeemModal,   setShowRedeemModal]   = useState(false);
  const [editProduct,       setEditProduct]       = useState(null);
  const [editCategory,      setEditCategory]      = useState(null);
  const [settings,          setSettings]          = useState({});
  const [settingsSaving,    setSettingsSaving]    = useState(false);
  const af = useAF();

  useEffect(() => { if (localStorage.getItem('admin_token')) setLoggedIn(true); }, []);
  useEffect(() => { if (loggedIn) load(); }, [loggedIn, tab, orderFilter, reportFilter]);

  // Realtime polling untuk tab reports dan orders (setiap 10 detik)
  useEffect(() => {
    if (!loggedIn) return;
    const REALTIME_TABS = ['reports', 'orders', 'dashboard'];
    if (!REALTIME_TABS.includes(tab)) return;
    const iv = setInterval(async () => {
      try {
        if (tab === 'reports') { const r=await af(`/api/admin/support?status=${reportFilter}`); if(r.success) setTickets(r.tickets||[]); }
        if (tab === 'orders' || tab === 'dashboard') { const r=await af(`/api/admin/orders?status=${orderFilter}`); if(r.success){setOrders(r.orders||[]);if(r.stats)setStats(r.stats);} }
      } catch {}
    }, 10000);
    return () => clearInterval(iv);
  }, [loggedIn, tab, orderFilter, reportFilter]);

  const load = async () => {
    setLoading(true);
    try {
      if (['dashboard','products'].includes(tab))   { const r=await af('/api/admin/products');  if(r.success){ setProducts(r.products||[]); setProdSortDirty(false); } }
      if (['dashboard','categories'].includes(tab)) { const r=await af('/api/admin/categories');if(r.success){ setCategories(r.categories||[]); setCatSortDirty(false); } }
      if (['dashboard','orders'].includes(tab))     { const r=await af(`/api/admin/orders?status=${orderFilter}`); if(r.success){setOrders(r.orders||[]);if(r.stats)setStats(r.stats);} }
      if (tab==='reports')                          { const r=await af(`/api/admin/support?status=${reportFilter}`); if(r.success) setTickets(r.tickets||[]); }
      if (tab==='redeem')                           { const r=await af('/api/admin/redeem'); if(r.success) setCodes(r.codes||[]); }
      if (tab==='settings')                         { const r=await af('/api/admin/settings'); if(r.success) setSettings(r.settings||{}); }
    } catch {}
    setLoading(false);
  };

  const login = async e => {
    e.preventDefault(); setLLoading(true); setLError('');
    try {
      const r = await fetch('/api/auth/admin-login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(lForm),credentials:'include'});
      const d = await r.json();
      if (d.success) { localStorage.setItem('admin_token',d.token); setLoggedIn(true); toast.success('Login berhasil!'); }
      else setLError(d.message||'Login gagal');
    } catch { setLError('Tidak bisa terhubung ke server'); }
    setLLoading(false);
  };

  const logout = () => { localStorage.removeItem('admin_token'); document.cookie='admin_token=;Max-Age=0;path=/'; setLoggedIn(false); toast.success('Logged out'); };

  const del = async (url, msg) => { if (!confirm(msg||'Yakin hapus?')) return; const r=await af(url,{method:'DELETE'}); if(r.success){toast.success('Berhasil dihapus');load();}else toast.error(r.message||'Gagal'); };

  // ── LOGIN ───────────────────────────────────────────────────
  if (!loggedIn) return (
    <>
      <Head><title>Admin Login — Fancy Network</title>
      </Head>
      <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',padding:16,background:'#060608',backgroundImage:'radial-gradient(circle at 50% 0%,rgba(255,107,0,0.08) 0%,transparent 50%)'}}>
        <div style={{width:'100%',maxWidth:380}}>
          <div style={{textAlign:'center',marginBottom:28}}>
            <div style={{fontSize:42,marginBottom:10}}>⚙️</div>
            <h1 style={{fontFamily:'Space Grotesk,sans-serif',fontSize:22,fontWeight:700,color:'#ff6b00',marginBottom:4}}>Admin Panel</h1>
            <p style={{color:'var(--text-muted)',fontSize:13}}>Fancy Network Store</p>
          </div>

          {/* Info box */}
          <div style={{background:'rgba(255,107,0,0.05)',border:'1px solid rgba(255,107,0,0.15)',borderRadius:12,padding:'12px 16px',marginBottom:20,fontSize:12,color:'var(--text-muted)',lineHeight:1.7}}>
            <p style={{color:'var(--primary)',fontWeight:700,fontSize:11,textTransform:'uppercase',letterSpacing:0.5,marginBottom:6}}>📌 INFO AKSES</p>
            <p>Credential diatur di <code style={{color:'var(--primary-light)',background:'rgba(255,107,0,0.08)',padding:'1px 5px',borderRadius:4}}>.env.local</code></p>
            <p style={{fontFamily:'monospace',marginTop:4}}>ADMIN_USERNAME=admin<br/>ADMIN_PASSWORD=***</p>
          </div>

          <form onSubmit={login} style={{background:'rgba(15,15,20,0.8)',border:'1px solid rgba(255,107,0,0.15)',borderRadius:16,padding:'24px 22px',display:'flex',flexDirection:'column',gap:16}}>
            {lError && (
              <div style={{background:'rgba(231,76,60,0.08)',border:'1px solid rgba(231,76,60,0.2)',borderRadius:8,padding:'10px 14px',display:'flex',gap:8,alignItems:'center'}}>
                <i className="fa-solid fa-circle-exclamation" style={{color:'#e74c3c',flexShrink:0}}/>
                <span style={{fontSize:13,color:'#e74c3c'}}>{lError}</span>
              </div>
            )}
            <div>
              <label className="admin-label">Username</label>
              <input type="text" value={lForm.username} onChange={e=>setLForm(p=>({...p,username:e.target.value}))}
                className="admin-input" autoComplete="username" required/>
            </div>
            <div>
              <label className="admin-label">Password</label>
              <div style={{position:'relative'}}>
                <input type={showPwd?'text':'password'} value={lForm.password} onChange={e=>setLForm(p=>({...p,password:e.target.value}))}
                  className="admin-input" style={{paddingRight:40}} autoComplete="current-password" required/>
                <button type="button" onClick={()=>setShowPwd(!showPwd)}
                  style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',fontSize:14}}>
                  <i className={`fa-solid ${showPwd?'fa-eye-slash':'fa-eye'}`}/>
                </button>
              </div>
            </div>
            <button type="submit" disabled={lLoading||!lForm.username||!lForm.password} className="btn-primary-fn"
              style={{width:'100%',justifyContent:'center',padding:'12px',borderRadius:10,marginTop:4,fontSize:14,opacity:lLoading||!lForm.username||!lForm.password?0.5:1}}>
              {lLoading?<><i className="fa-solid fa-spinner fa-spin"/> Memproses...</>:<><i className="fa-solid fa-lock"/> Masuk ke Admin</>}
            </button>
          </form>
        </div>
      </div>
    </>
  );

  // ── DASHBOARD ───────────────────────────────────────────────
  return (
    <>
      <Head><title>Admin Panel — Fancy Network</title>
      </Head>

      <div className="admin-wrap">
        {/* Sidebar */}
        <aside className="admin-sidebar" style={{width:sidebar?220:60}}>
          <div style={{padding:'16px 12px',borderBottom:'1px solid rgba(255,107,0,0.08)',display:'flex',alignItems:'center',gap:10,minHeight:64}}>
            {sidebar && <span style={{fontFamily:'Space Grotesk',fontWeight:700,fontSize:14,color:'#ff6b00',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>Fancy Network</span>}
            <button onClick={()=>setSidebar(!sidebar)}
              style={{marginLeft:'auto',background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',fontSize:16,flexShrink:0}}>
              <i className={`fa-solid ${sidebar?'fa-angles-left':'fa-angles-right'}`}/>
            </button>
          </div>
          <nav style={{flex:1,padding:'10px 8px',display:'flex',flexDirection:'column',gap:3}}>
            {TABS.map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)} className={`admin-nav-btn${tab===t.id?' active':''}`}
                style={{color:tab===t.id?'var(--primary)':'var(--text-muted)'}}>
                <i className={`fa-solid ${t.icon}`} style={{fontSize:14,flexShrink:0,width:20,textAlign:'center'}}/>
                {sidebar&&<span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.label}</span>}
              </button>
            ))}
          </nav>
          <div style={{padding:'10px 8px',borderTop:'1px solid rgba(255,107,0,0.08)'}}>
            <button onClick={logout} className="admin-nav-btn" style={{color:'#e74c3c'}}>
              <i className="fa-solid fa-right-from-bracket" style={{width:20,textAlign:'center'}}/>
              {sidebar&&<span>Logout</span>}
            </button>
          </div>
        </aside>

        {/* Main */}
        <main className="admin-main">
          <div className="admin-topbar">
            <h1 style={{fontFamily:'Space Grotesk',fontWeight:700,fontSize:17,color:'#fff'}}>
              {TABS.find(t=>t.id===tab)?.label}
            </h1>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              {tab==='orders' && (
                <button className="btn-ghost-fn" style={{fontSize:12}}
                  onClick={async()=>{
                    const r = await af('/api/admin/test-webhook',{method:'POST'});
                    if(r.success) toast.success(r.message||'Test webhook terkirim!');
                    else toast.error(r.message||'Gagal — cek DISCORD_WEBHOOK_TX');
                  }}>
                  <i className="fa-brands fa-discord"/> Test Webhook
                </button>
              )}
              <button onClick={load} className="btn-ghost-fn" style={{fontSize:12}}>
                <i className={`fa-solid fa-rotate${loading?' fa-spin':''}`}/> Refresh
              </button>
            </div>
          </div>

          <div style={{padding:24}}>

            {/* ═══ DASHBOARD ═══════════════════════════════ */}
            {tab==='dashboard' && (
              <div style={{display:'flex',flexDirection:'column',gap:20}}>
                {/* Stats */}
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:14}}>
                  {[
                    {label:'Total Order', value:stats.total,       icon:'fa-receipt',         color:'#3498db'},
                    {label:'Sukses',      value:stats.success,     icon:'fa-circle-check',    color:'#2ecc71'},
                    {label:'Pending',     value:stats.pending,     icon:'fa-clock',           color:'#f1c40f'},
                    {label:'Gagal',       value:stats.failed,      icon:'fa-circle-xmark',    color:'#e74c3c'},
                    {label:'Revenue',     value:idr(stats.revenue),icon:'fa-chart-line',      color:'var(--primary)'},
                  ].map((s,i)=>(
                    <div key={i} className="admin-stat-card">
                      <div style={{width:36,height:36,background:`${s.color}18`,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:12}}>
                        <i className={`fa-solid ${s.icon}`} style={{color:s.color,fontSize:14}}/>
                      </div>
                      <div style={{fontFamily:'Space Grotesk',fontSize:20,fontWeight:700,color:'#fff'}}>{s.value}</div>
                      <div style={{fontSize:11,color:'var(--text-muted)',fontWeight:600,textTransform:'uppercase',letterSpacing:0.5,marginTop:3}}>{s.label}</div>
                    </div>
                  ))}
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
                  {/* Produk */}
                  <div className="admin-card" style={{padding:'18px 20px'}}>
                    <p style={{fontWeight:700,fontSize:13,marginBottom:12,color:'#fff'}}>📦 Produk Aktif ({products.filter(p=>p.is_active).length})</p>
                    {products.slice(0,6).map(p=>(
                      <div key={p.id} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'1px solid rgba(255,255,255,0.03)'}}>
                        <span style={{fontSize:13,color:'#d1d1d6',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'70%'}}>{p.name}</span>
                        <span style={{fontSize:12,color:'var(--primary-light)',flexShrink:0}}>{idr(p.price)}</span>
                      </div>
                    ))}
                    {products.length===0&&<p style={{color:'var(--text-muted)',fontSize:12}}>Belum ada produk</p>}
                  </div>
                  {/* Orders */}
                  <div className="admin-card" style={{padding:'18px 20px'}}>
                    <p style={{fontWeight:700,fontSize:13,marginBottom:12,color:'#fff'}}>🧾 Transaksi Terbaru</p>
                    {orders.slice(0,6).map(o=>(
                      <div key={o.order_id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 0',borderBottom:'1px solid rgba(255,255,255,0.03)',gap:8}}>
                        <span style={{fontSize:13,color:'#d1d1d6',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{o.player_username}</span>
                        <div style={{display:'flex',gap:6,alignItems:'center',flexShrink:0}}>
                          <span style={{fontSize:12,color:'var(--primary-light)'}}>{idr(o.amount)}</span>
                          <span className={`admin-badge ${ORDER_STATUS_BADGE[o.payment_status]||'admin-badge-gray'}`} style={{fontSize:10}}>{o.payment_status}</span>
                        </div>
                      </div>
                    ))}
                    {orders.length===0&&<p style={{color:'var(--text-muted)',fontSize:12}}>Belum ada transaksi</p>}
                  </div>
                </div>
              </div>
            )}

            {/* ═══ PRODUCTS ════════════════════════════════ */}
            {tab==='products' && (
              <div style={{display:'flex',flexDirection:'column',gap:16}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
                  <p style={{color:'var(--text-muted)',fontSize:13}}>{products.length} produk terdaftar · <span style={{color:'rgba(255,255,255,0.3)'}}>klik ↑↓ untuk mengatur posisi</span></p>
                  <div style={{display:'flex',gap:8,alignItems:'center'}}>
                    {prodSortDirty && (
                      <button
                        className="btn-primary-fn"
                        disabled={prodSortSaving}
                        onClick={async()=>{
                          setProdSortSaving(true);
                          try {
                            const r = await af('/api/admin/products',{method:'PATCH',body:JSON.stringify({action:'reorder',ids:products.map(x=>x.id)})});
                            if(r.success){ setProdSortDirty(false); toast.success('Urutan produk disimpan!'); }
                            else toast.error('Gagal menyimpan urutan');
                          } catch { toast.error('Gagal menyimpan urutan'); }
                          finally { setProdSortSaving(false); }
                        }}
                        style={{background:'#27ae60',borderColor:'#27ae60',fontSize:12,padding:'7px 14px'}}>
                        <i className={`fa-solid ${prodSortSaving?'fa-spinner fa-spin':'fa-floppy-disk'}`}/> {prodSortSaving?'Menyimpan...':'Simpan Urutan'}
                      </button>
                    )}
                    <button className="btn-primary-fn" onClick={()=>{setEditProduct({});setShowProductModal(true);}}>
                      <i className="fa-solid fa-plus"/> Tambah Produk
                    </button>
                  </div>
                </div>
                <div className="admin-card" style={{overflow:'hidden'}}>
                  <div style={{overflowX:'auto'}}>
                    <table className="admin-table" style={{minWidth:700}}>
                      <thead><tr>
                        {['Urutan','Gambar','Nama','Harga','Reward Trigger','Status','Aksi'].map(h=><th key={h}>{h}</th>)}
                      </tr></thead>
                      <tbody>
                        {products.map((p,idx)=>(
                          <tr key={p.id}>
                            <td style={{width:80}}>
                              <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
                                <button
                                  disabled={idx===0}
                                  onClick={()=>{
                                    if(idx===0) return;
                                    const reordered=[...products];
                                    [reordered[idx-1],reordered[idx]]=[reordered[idx],reordered[idx-1]];
                                    setProducts(reordered);
                                    setProdSortDirty(true);
                                  }}
                                  style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:5,color:idx===0?'rgba(255,255,255,0.2)':'#fff',width:26,height:22,cursor:idx===0?'default':'pointer',fontSize:11,display:'flex',alignItems:'center',justifyContent:'center'}}>
                                  ↑
                                </button>
                                <span style={{fontSize:11,color:'var(--text-muted)',fontWeight:700,minWidth:20,textAlign:'center'}}>{idx+1}</span>
                                <button
                                  disabled={idx===products.length-1}
                                  onClick={()=>{
                                    if(idx===products.length-1) return;
                                    const reordered=[...products];
                                    [reordered[idx],reordered[idx+1]]=[reordered[idx+1],reordered[idx]];
                                    setProducts(reordered);
                                    setProdSortDirty(true);
                                  }}
                                  style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:5,color:idx===products.length-1?'rgba(255,255,255,0.2)':'#fff',width:26,height:22,cursor:idx===products.length-1?'default':'pointer',fontSize:11,display:'flex',alignItems:'center',justifyContent:'center'}}>
                                  ↓
                                </button>
                              </div>
                            </td>
                            <td>
                              {p.image_url
                                ?<img src={p.image_url} alt="" style={{width:40,height:40,objectFit:'cover',borderRadius:8,border:'1px solid rgba(255,107,0,0.1)'}} onError={e=>e.target.style.display='none'}/>
                                :<span style={{fontSize:28}}>{p.category_icon||'📦'}</span>
                              }
                            </td>
                            <td>
                              <p style={{fontWeight:700,color:'#fff'}}>{p.name}</p>
                              <p style={{fontSize:11,color:'var(--text-muted)'}}>{p.category_name||'—'}</p>
                            </td>
                            <td style={{color:'var(--primary-light)',fontWeight:700,fontFamily:'Space Grotesk'}}>
                              {idr(p.price)}
                              {p.original_price>p.price&&<span className="admin-badge admin-badge-red" style={{marginLeft:6,fontSize:10}}>-{Math.round((1-p.price/p.original_price)*100)}%</span>}
                            </td>
                            <td><code style={{fontSize:12,color:'var(--primary-light)',background:'rgba(255,107,0,0.08)',padding:'2px 8px',borderRadius:4}}>{p.reward_trigger||'—'}</code></td>
                            <td>
                              <label className="toggle-switch">
                                <input type="checkbox" checked={!!p.is_active} onChange={async()=>{
                                  await af('/api/admin/products',{method:'PATCH',body:JSON.stringify({id:p.id,action:'toggle'})});
                                  load();
                                }}/>
                                <span className="toggle-slider"/>
                              </label>
                            </td>
                            <td>
                              <div style={{display:'flex',gap:6}}>
                                <button onClick={()=>{setEditProduct(p);setShowProductModal(true);}}
                                  style={{background:'rgba(255,107,0,0.1)',border:'1px solid rgba(255,107,0,0.2)',color:'var(--primary)',padding:'6px 10px',borderRadius:7,cursor:'pointer',fontSize:13}}>
                                  <i className="fa-solid fa-pen"/>
                                </button>
                                <button onClick={()=>del(`/api/admin/products?id=${p.id}&permanent=1`,'Hapus produk ini permanen?')}
                                  style={{background:'rgba(231,76,60,0.1)',border:'1px solid rgba(231,76,60,0.2)',color:'#e74c3c',padding:'6px 10px',borderRadius:7,cursor:'pointer',fontSize:13}}>
                                  <i className="fa-solid fa-trash"/>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {products.length===0&&<div style={{textAlign:'center',padding:'50px 0',color:'var(--text-muted)'}}>Belum ada produk — klik Tambah Produk</div>}
                  </div>
                </div>
              </div>
            )}

            {/* ═══ CATEGORIES ══════════════════════════════ */}
            {tab==='categories' && (
              <div style={{display:'flex',flexDirection:'column',gap:16}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
                  <p style={{color:'var(--text-muted)',fontSize:13}}>{categories.length} kategori · <span style={{color:'rgba(255,255,255,0.3)'}}>klik ↑↓ untuk mengatur urutan</span></p>
                  <div style={{display:'flex',gap:8,alignItems:'center'}}>
                    {catSortDirty && (
                      <button
                        className="btn-primary-fn"
                        disabled={catSortSaving}
                        onClick={async()=>{
                          setCatSortSaving(true);
                          try {
                            const r = await af('/api/admin/categories',{method:'PATCH',body:JSON.stringify({action:'reorder',ids:categories.map(x=>x.id)})});
                            if(r.success){ setCatSortDirty(false); toast.success('Urutan kategori disimpan!'); }
                            else toast.error('Gagal menyimpan urutan');
                          } catch { toast.error('Gagal menyimpan urutan'); }
                          finally { setCatSortSaving(false); }
                        }}
                        style={{background:'#27ae60',borderColor:'#27ae60',fontSize:12,padding:'7px 14px'}}>
                        <i className={`fa-solid ${catSortSaving?'fa-spinner fa-spin':'fa-floppy-disk'}`}/> {catSortSaving?'Menyimpan...':'Simpan Urutan'}
                      </button>
                    )}
                    <button className="btn-primary-fn" onClick={()=>{setEditCategory({});setShowCategoryModal(true);}}>
                      <i className="fa-solid fa-plus"/> Tambah Kategori
                    </button>
                  </div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:14}}>
                  {categories.map((c,idx)=>(
                    <div key={c.id} className="admin-card" style={{padding:'16px 18px'}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
                        <div style={{display:'flex',alignItems:'center',gap:12}}>
                          <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
                            <button
                              disabled={idx===0}
                              onClick={()=>{
                                if(idx===0) return;
                                const reordered=[...categories];
                                [reordered[idx-1],reordered[idx]]=[reordered[idx],reordered[idx-1]];
                                setCategories(reordered);
                                setCatSortDirty(true);
                              }}
                              style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:5,color:idx===0?'rgba(255,255,255,0.2)':'#fff',width:26,height:22,cursor:idx===0?'default':'pointer',fontSize:11,display:'flex',alignItems:'center',justifyContent:'center'}}>
                              ↑
                            </button>
                            <span style={{fontSize:10,color:'rgba(255,255,255,0.4)',fontWeight:700}}>{idx+1}</span>
                            <button
                              disabled={idx===categories.length-1}
                              onClick={()=>{
                                if(idx===categories.length-1) return;
                                const reordered=[...categories];
                                [reordered[idx],reordered[idx+1]]=[reordered[idx+1],reordered[idx]];
                                setCategories(reordered);
                                setCatSortDirty(true);
                              }}
                              style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:5,color:idx===categories.length-1?'rgba(255,255,255,0.2)':'#fff',width:26,height:22,cursor:idx===categories.length-1?'default':'pointer',fontSize:11,display:'flex',alignItems:'center',justifyContent:'center'}}>
                              ↓
                            </button>
                          </div>
                          <span style={{fontSize:28}}>{c.icon}</span>
                          <div>
                            <p style={{fontWeight:700,color:'#fff',fontSize:14}}>{c.name}</p>
                            <p style={{fontSize:11,color:'var(--text-muted)'}}>{c.product_count||0} produk</p>
                          </div>
                        </div>
                        <div style={{display:'flex',gap:6}}>
                          <button onClick={()=>{setEditCategory(c);setShowCategoryModal(true);}}
                            style={{background:'rgba(255,107,0,0.1)',border:'1px solid rgba(255,107,0,0.2)',color:'var(--primary)',padding:'5px 9px',borderRadius:7,cursor:'pointer',fontSize:12}}>
                            <i className="fa-solid fa-pen"/>
                          </button>
                          <button onClick={()=>del(`/api/admin/categories?id=${c.id}`,'Hapus kategori ini?')}
                            style={{background:'rgba(231,76,60,0.1)',border:'1px solid rgba(231,76,60,0.2)',color:'#e74c3c',padding:'5px 9px',borderRadius:7,cursor:'pointer',fontSize:12}}>
                            <i className="fa-solid fa-trash"/>
                          </button>
                        </div>
                      </div>
                      {c.description&&<p style={{fontSize:12,color:'var(--text-muted)',lineHeight:1.5}}>{c.description}</p>}
                    </div>
                  ))}
                  {categories.length===0&&<p style={{color:'var(--text-muted)',fontSize:13}}>Belum ada kategori</p>}
                </div>
              </div>
            )}

            {/* ═══ REDEEM ══════════════════════════════════ */}
            {tab==='redeem' && (
              <div style={{display:'flex',flexDirection:'column',gap:16}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <p style={{color:'var(--text-muted)',fontSize:13}}>{codes.length} kode aktif</p>
                  <button className="btn-primary-fn" onClick={()=>setShowRedeemModal(true)}>
                    <i className="fa-solid fa-plus"/> Buat Kode
                  </button>
                </div>
                <div className="admin-card" style={{overflow:'hidden'}}>
                  <div style={{overflowX:'auto'}}>
                    <table className="admin-table" style={{minWidth:600}}>
                      <thead><tr>{['Kode','Diskon','Maks','Terpakai','Kadaluarsa','Aksi'].map(h=><th key={h}>{h}</th>)}</tr></thead>
                      <tbody>
                        {codes.map(c=>(
                          <tr key={c.id}>
                            <td>
                              <div style={{display:'flex',alignItems:'center',gap:6}}>
                                <code style={{fontWeight:700,color:'var(--primary-light)',background:'rgba(255,107,0,0.08)',padding:'3px 8px',borderRadius:4,fontFamily:'monospace'}}>{c.code}</code>
                                <button onClick={()=>{navigator.clipboard?.writeText(c.code);toast.success('Kode disalin!');}}
                                  style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',fontSize:12}}>
                                  <i className="fa-solid fa-copy"/>
                                </button>
                              </div>
                            </td>
                            <td style={{color:'#2ecc71',fontWeight:700}}>{c.discount_type==='percent'?`${c.discount_value}%`:idr(c.discount_value)}</td>
                            <td style={{color:'var(--text-muted)'}}>{c.max_uses}x</td>
                            <td style={{color:'var(--text-muted)'}}>{c.used_count||0}x</td>
                            <td style={{color:'var(--text-muted)',fontSize:12}}>{c.expires_at?fmt(c.expires_at):'∞ Tidak ada'}</td>
                            <td>
                              <button onClick={()=>del(`/api/admin/redeem?id=${c.id}`,'Hapus kode ini?')}
                                style={{background:'rgba(231,76,60,0.1)',border:'1px solid rgba(231,76,60,0.2)',color:'#e74c3c',padding:'5px 9px',borderRadius:7,cursor:'pointer',fontSize:12}}>
                                <i className="fa-solid fa-trash"/>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {codes.length===0&&<div style={{textAlign:'center',padding:'50px 0',color:'var(--text-muted)'}}>Belum ada kode redeem</div>}
                  </div>
                </div>
              </div>
            )}

            {/* ═══ LOG TRANSAKSI ═══════════════════════════ */}
            {tab==='orders' && (
              <div style={{display:'flex',flexDirection:'column',gap:16}}>
                {/* Stats strip */}
                <div style={{display:'flex',gap:16,flexWrap:'wrap'}}>
                  {[
                    {label:'Total',   val:stats.total,         col:'#3498db'},
                    {label:'Sukses',  val:stats.success,       col:'#2ecc71'},
                    {label:'Pending', val:stats.pending,       col:'#f1c40f'},
                    {label:'Revenue', val:idr(stats.revenue),  col:'var(--primary)'},
                  ].map((s,i)=>(
                    <div key={i} style={{background:'rgba(15,15,20,0.8)',border:'1px solid rgba(255,107,0,0.08)',borderRadius:10,padding:'10px 16px',display:'flex',gap:10,alignItems:'center'}}>
                      <span style={{color:s.col,fontWeight:700,fontFamily:'Space Grotesk',fontSize:18}}>{s.val}</span>
                      <span style={{color:'var(--text-muted)',fontSize:12,fontWeight:600}}>{s.label}</span>
                    </div>
                  ))}
                </div>
                {/* Filter + Action buttons */}
                <div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>
                  {['all','pending','success','failed','expired'].map(s=>(
                    <button key={s} onClick={()=>setOrderFilter(s)}
                      style={{padding:'7px 14px',borderRadius:8,border:'1px solid',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'Plus Jakarta Sans',
                        background:orderFilter===s?'var(--primary)':'rgba(255,255,255,0.02)',
                        color:orderFilter===s?'#fff':'var(--text-muted)',
                        borderColor:orderFilter===s?'var(--primary)':'rgba(255,255,255,0.06)'}}>
                      {s.toUpperCase()}
                    </button>
                  ))}
                  <div style={{display:'flex',gap:6,marginLeft:'auto'}}>
                    <button className="btn-ghost-fn" style={{fontSize:12,color:'#e74c3c',borderColor:'rgba(231,76,60,0.3)'}}
                      onClick={async()=>{
                        if(!confirm('Hapus SEMUA log transaksi sekarang?\n\nSemua order akan diarsipkan ke Discord lalu dihapus permanen.\n\nTidak bisa dibatalkan!')) return;
                        const r=await af('/api/admin/orders',{method:'POST',body:JSON.stringify({action:'delete_all'})});
                        if(r.success) { toast.success(`${r.deleted} order dihapus`); load(); }
                        else toast.error(r.message||'Gagal');
                      }}>
                      <i className="fa-solid fa-trash"/> Hapus Semua
                    </button>
                  </div>
                </div>
                <div className="admin-card" style={{overflow:'hidden'}}>
                  <div style={{overflowX:'auto'}}>
                    <table className="admin-table" style={{minWidth:820}}>
                      <thead><tr>{['Order ID','Player','Discord','Produk','Total','Status','Plugin','Tanggal','Aksi'].map(h=><th key={h}>{h}</th>)}</tr></thead>
                      <tbody>
                        {orders.map(o=>(
                          <tr key={o.order_id}>
                            <td><code style={{fontSize:11,color:'var(--text-muted)',fontFamily:'monospace'}}>{o.order_id}</code></td>
                            <td style={{fontWeight:700,color:'#fff'}}>{o.player_username}</td>
                            <td style={{fontSize:12,color:'#5865F2'}}>{o.discord_username||<span style={{color:'var(--text-muted)'}}>—</span>}</td>
                            <td style={{color:'var(--text-muted)',maxWidth:140,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{o.product_name}</td>
                            <td style={{color:'var(--primary-light)',fontWeight:700,fontFamily:'Space Grotesk',whiteSpace:'nowrap'}}>{idr(o.amount)}</td>
                            <td><span className={`admin-badge ${ORDER_STATUS_BADGE[o.payment_status]||'admin-badge-gray'}`}>{o.payment_status?.toUpperCase()}</span></td>
                            <td>
                              <span style={{fontSize:12,color:o.plugin_notified?'#2ecc71':o.plugin_queued?'#f1c40f':'var(--text-muted)'}}>
                                {o.plugin_notified?'✅ Terkirim':o.plugin_queued?'⏳ Antri':'—'}
                              </span>
                            </td>
                            <td style={{fontSize:12,color:'var(--text-muted)',whiteSpace:'nowrap'}}>{fmt(o.created_at)}</td>
                            <td>
                              {o.payment_status==='success'&&!o.plugin_notified&&(
                                <button className="btn-primary-fn" style={{padding:'5px 10px',fontSize:11}}
                                  onClick={async()=>{
                                    const r=await af('/api/admin/orders',{method:'POST',body:JSON.stringify({orderId:o.order_id,action:'retry_plugin'})});
                                    if(r.success)toast.success('Plugin dinotifikasi!'); else toast.error('Gagal: '+(r.result?.error||'unknown'));
                                    load();
                                  }}>
                                  <i className="fa-solid fa-paper-plane"/> Kirim
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {orders.length===0&&<div style={{textAlign:'center',padding:'50px 0',color:'var(--text-muted)'}}>Belum ada transaksi</div>}
                  </div>
                </div>
              </div>
            )}

            {/* ═══ REPORTS ═════════════════════════════════ */}
            {tab==='reports' && (
              <div style={{display:'flex',flexDirection:'column',gap:16}}>
                {/* Filter + Cleanup button */}
                <div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>
                  {['all','open','in_review','resolved','rejected'].map(s=>(
                    <button key={s} onClick={()=>setReportFilter(s)}
                      style={{padding:'7px 14px',borderRadius:8,border:'1px solid',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'Plus Jakarta Sans',
                        background:reportFilter===s?'var(--primary)':'rgba(255,255,255,0.02)',
                        color:reportFilter===s?'#fff':'var(--text-muted)',
                        borderColor:reportFilter===s?'var(--primary)':'rgba(255,255,255,0.06)'}}>
                      {s==='all'?'SEMUA':TICKET_STATUS_LABEL[s]?.toUpperCase()||s.toUpperCase()}
                    </button>
                  ))}
                  {/* Manual cleanup trigger */}
                  <button className="btn-ghost-fn" style={{marginLeft:'auto',fontSize:12}}
                    onClick={async()=>{
                      const r = await af('/api/cron/cleanup',{method:'POST'});
                      if(r.success) { toast.success(r.message||'Cleanup selesai'); load(); }
                      else toast.error(r.message||'Cleanup gagal');
                    }}>
                    <i className="fa-solid fa-broom"/> Jalankan Cleanup
                  </button>
                </div>

                {tickets.length===0 ? (
                  <div style={{textAlign:'center',padding:'60px 0',color:'var(--text-muted)'}}>
                    <i className="fa-solid fa-inbox" style={{fontSize:36,display:'block',marginBottom:12}}/>
                    <p>Belum ada tiket {reportFilter!=='all'&&`(${reportFilter})`}</p>
                  </div>
                ) : (
                  <div style={{display:'flex',flexDirection:'column',gap:12}}>
                    {tickets.map(tk=>(
                      <TicketCard key={tk.ticket_id} tk={tk} af={af} onRefresh={load}/>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── SETTINGS TAB ── */}
            {tab==='settings' && (
              <div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
                  <h2 className="font-space" style={{fontSize:17,fontWeight:700}}><i className="fa-solid fa-gear" style={{marginRight:8,color:'var(--primary)'}}/>Pengaturan Website</h2>
                </div>
                <div style={{display:'grid',gap:18}}>
                  {/* Logo Upload */}
                  <div style={{background:'rgba(255,107,0,0.04)',border:'1px solid rgba(255,107,0,0.15)',borderRadius:12,padding:'18px 20px'}}>
                    <h3 className="font-space" style={{fontSize:13,fontWeight:700,color:'var(--primary)',marginBottom:14,letterSpacing:'0.05em'}}>
                      <i className="fa-solid fa-image" style={{marginRight:7}}/>LOGO &amp; FAVICON
                    </h3>
                    <p style={{fontSize:12,color:'var(--text-muted)',marginBottom:14}}>
                      Logo ini digunakan di Navbar dan secara otomatis juga menjadi Favicon browser. Ukuran disarankan: <strong style={{color:'#fff'}}>256×256px</strong> atau <strong style={{color:'#fff'}}>512×512px</strong>, format PNG transparan.
                    </p>
                    <ImageUpload
                      value={settings.logo_url||''}
                      onChange={url => setSettings(s=>({...s, logo_url: url}))}
                      label="Upload Logo (Navbar + Favicon)"
                      hint="PNG transparan disarankan · Maks 2MB · 256×256 atau 512×512px"
                      previewSize={96}
                      adminToken={typeof window!=='undefined' ? localStorage.getItem('admin_token')||'' : ''}
                    />
                  </div>

                  {/* General settings */}
                  <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:12,padding:'18px 20px'}}>
                    <h3 className="font-space" style={{fontSize:13,fontWeight:700,color:'var(--text-muted)',marginBottom:14,letterSpacing:'0.05em'}}>
                      <i className="fa-solid fa-server" style={{marginRight:7}}/>INFORMASI SERVER
                    </h3>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                      {[
                        ['server_name','Nama Server','Fancy Network'],
                        ['server_ip','IP Server','play.example.com'],
                        ['logo_text','Teks Logo','Fancy Network'],
                        ['hero_title','Judul Hero',''],
                      ].map(([key,lbl,ph])=>(
                        <div key={key}>
                          <label style={{fontSize:12,fontWeight:600,color:'var(--text-muted)',display:'block',marginBottom:5}}>{lbl}</label>
                          <input className="admin-input" value={settings[key]||''} placeholder={ph}
                            onChange={e=>setSettings(s=>({...s,[key]:e.target.value}))}/>
                        </div>
                      ))}
                      <div style={{gridColumn:'1/-1'}}>
                        <label style={{fontSize:12,fontWeight:600,color:'var(--text-muted)',display:'block',marginBottom:5}}>Subtitle Hero</label>
                        <input className="admin-input" value={settings.hero_subtitle||''} placeholder="Deskripsi singkat server..."
                          onChange={e=>setSettings(s=>({...s,hero_subtitle:e.target.value}))}/>
                      </div>
                    </div>
                  </div>

                  {/* Save button */}
                  <button
                    className="btn-primary-fn"
                    style={{justifyContent:'center',width:'100%'}}
                    disabled={settingsSaving}
                    onClick={async()=>{
                      setSettingsSaving(true);
                      try {
                        const r = await af('/api/admin/settings', {method:'PUT', body:JSON.stringify(settings)});
                        if(r.success) toast.success('Pengaturan disimpan!');
                        else toast.error(r.message||'Gagal menyimpan');
                      } catch { toast.error('Error menyimpan pengaturan'); }
                      setSettingsSaving(false);
                    }}
                  >
                    {settingsSaving
                      ? <><i className="fa-solid fa-spinner fa-spin"/> Menyimpan...</>
                      : <><i className="fa-solid fa-floppy-disk"/> Simpan Pengaturan</>}
                  </button>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>

      {/* ── MODALS ── */}
      {showProductModal  && <ProductModal  product={editProduct}   categories={categories} af={af} onClose={()=>{setShowProductModal(false);setEditProduct(null);}}    onDone={()=>{setShowProductModal(false);load();}}/>}
      {showCategoryModal && <CategoryModal category={editCategory} af={af}                 onClose={()=>{setShowCategoryModal(false);setEditCategory(null);}}            onDone={()=>{setShowCategoryModal(false);load();}}/>}
      {showRedeemModal   && <RedeemModal   af={af}                                          onClose={()=>setShowRedeemModal(false)}                                        onDone={()=>{setShowRedeemModal(false);load();}}/>}
    </>
  );
}

// ── TicketCard ────────────────────────────────────────────────
function TicketCard({ tk, af, onRefresh }) {
  const [expanded,  setExpanded]  = useState(false);
  const [msg,       setMsg]       = useState('');
  const [sending,   setSending]   = useState(false);
  const [timeLeft,  setTimeLeft]  = useState(null);  // detik tersisa sebelum cleanup
  const msgEndRef = useRef(null);

  const tInfo = {
    banding:{icon:'fa-gavel',color:'#e67e22'}, bug:{icon:'fa-bug',color:'#3498db'},
    report_player:{icon:'fa-user-xmark',color:'#e74c3c'}, lainnya:{icon:'fa-comment-dots',color:'#9b59b6'},
  }[tk.type] || {icon:'fa-ticket',color:'var(--primary)'};

  const st = {
    open:{label:'Menunggu',color:'#f1c40f'}, in_review:{label:'Review',color:'#3498db'},
    resolved:{label:'Selesai',color:'#2ecc71'}, rejected:{label:'Ditolak',color:'#e74c3c'},
    expired:{label:'Expired',color:'#95a5a6'},
  }[tk.status] || {label:tk.status,color:'#8e8e9a'};

  // Hitung countdown 2 menit untuk closed ticket
  useEffect(() => {
    if (!tk.closed_at) { setTimeLeft(null); return; }
    const closedMs  = new Date(tk.closed_at).getTime();
    const TWO_MIN   = 2 * 60 * 1000;
    const tick = () => {
      const left = Math.max(0, TWO_MIN - (Date.now() - closedMs));
      setTimeLeft(left);
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [tk.closed_at]);

  // Scroll ke pesan terbaru saat expand
  useEffect(() => {
    if (expanded && msgEndRef.current) {
      msgEndRef.current.scrollIntoView({ behavior:'smooth' });
    }
  }, [expanded, tk.messages?.length]);

  const sendMsg = async () => {
    if (!msg.trim() || sending) return;
    setSending(true);
    await af('/api/admin/support', { method:'PATCH', body:JSON.stringify({ id:tk.ticket_id, message:msg.trim() }) });
    setSending(false);
    setMsg('');
    onRefresh();
  };

  const cancelCleanup = async () => {
    await af('/api/admin/support', { method:'PATCH', body:JSON.stringify({ id:tk.ticket_id, cancel_cleanup:true }) });
    toast.success('Auto-cleanup dibatalkan');
    onRefresh();
  };

  const fmtTime = secs => {
    if (secs === null) return '';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2,'0')}`;
  };

  const isClosed = tk.status === 'resolved' || tk.status === 'rejected';
  const msgs = tk.messages || [];

  return (
    <div className="admin-card" style={{padding:'18px 20px',borderColor:isClosed&&tk.closed_at?'rgba(231,76,60,0.3)':''}}>

      {/* Countdown cleanup banner */}
      {isClosed && tk.closed_at && timeLeft !== null && (
        <div style={{background:'rgba(231,76,60,0.08)',border:'1px solid rgba(231,76,60,0.25)',borderRadius:8,padding:'8px 14px',marginBottom:14,display:'flex',alignItems:'center',justifyContent:'space-between',gap:10}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <i className="fa-solid fa-clock" style={{color:'#e74c3c',fontSize:13}}/>
            {timeLeft > 0
              ? <span style={{fontSize:12,color:'#e74c3c',fontWeight:700}}>
                  Auto-cleanup dalam <strong>{fmtTime(Math.ceil(timeLeft/1000))}</strong> — arsip akan dikirim ke webhook
                </span>
              : <span style={{fontSize:12,color:'#95a5a6'}}>Menunggu cleanup job...</span>
            }
          </div>
          {timeLeft > 0 && (
            <button onClick={cancelCleanup} style={{background:'rgba(255,107,0,0.12)',border:'1px solid rgba(255,107,0,0.3)',color:'var(--primary)',padding:'4px 12px',borderRadius:6,cursor:'pointer',fontSize:11,fontWeight:700,flexShrink:0}}>
              ✕ Batalkan
            </button>
          )}
        </div>
      )}

      {/* Header */}
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12,marginBottom:10}}>
        <div style={{display:'flex',alignItems:'center',gap:10,flex:1,minWidth:0}}>
          <div style={{width:36,height:36,borderRadius:8,background:`${tInfo.color}18`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <i className={`fa-solid ${tInfo.icon}`} style={{color:tInfo.color,fontSize:14}}/>
          </div>
          <div style={{minWidth:0}}>
            <p style={{fontWeight:700,color:'#fff',fontSize:14,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{tk.subject}</p>
            <div style={{display:'flex',gap:6,alignItems:'center',marginTop:2,flexWrap:'wrap'}}>
              <code style={{fontSize:11,color:'var(--text-muted)',fontFamily:'monospace'}}>{tk.ticket_id}</code>
              <span style={{fontSize:11,color:'var(--text-muted)'}}>·</span>
              <span style={{fontSize:12,color:'var(--primary-light)',fontWeight:600}}>{tk.player_username}</span>
              <span style={{fontSize:11,color:'var(--text-muted)'}}>·</span>
              <span style={{fontSize:11,color:'var(--text-muted)'}}>{fmt(tk.created_at)}</span>
              {msgs.length > 0 && <span style={{fontSize:11,background:'rgba(255,107,0,0.1)',color:'var(--primary)',padding:'1px 6px',borderRadius:4}}>{msgs.length} pesan</span>}
            </div>
          </div>
        </div>
        <div style={{display:'flex',gap:6,alignItems:'center',flexShrink:0}}>
          <button onClick={()=>setExpanded(!expanded)}
            style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',color:'var(--text-muted)',padding:'5px 10px',borderRadius:7,cursor:'pointer',fontSize:12,display:'flex',alignItems:'center',gap:5}}>
            <i className={`fa-solid fa-chevron-${expanded?'up':'down'}`} style={{fontSize:10}}/>
            {expanded ? 'Tutup' : 'Buka Chat'}
          </button>
          <select defaultValue={tk.status} onChange={async e=>{
            await af('/api/admin/support',{method:'PATCH',body:JSON.stringify({id:tk.ticket_id,status:e.target.value})});
            toast.success('Status diupdate'); onRefresh();
          }} style={{background:'rgba(255,255,255,0.03)',border:`1px solid ${st.color}44`,color:st.color,padding:'6px 10px',borderRadius:8,fontFamily:'Plus Jakarta Sans',fontSize:12,fontWeight:700,cursor:'pointer'}}>
            <option value="open">Menunggu</option>
            <option value="in_review">Review</option>
            <option value="resolved">Selesai</option>
            <option value="rejected">Ditolak</option>
          </select>
        </div>
      </div>

      {tk.target_player && <p style={{fontSize:12,color:'#e74c3c',marginBottom:6}}><i className="fa-solid fa-user-xmark" style={{marginRight:6}}/>Target: <strong>{tk.target_player}</strong></p>}
      {tk.evidence_url  && <a href={tk.evidence_url} target="_blank" rel="noopener noreferrer" style={{fontSize:12,color:'#3498db',display:'inline-flex',alignItems:'center',gap:4,marginBottom:8,textDecoration:'none'}}><i className="fa-solid fa-link"/>Lihat Bukti</a>}

      {/* Chat area - expanded */}
      {expanded && (
        <div style={{marginTop:12,borderTop:'1px solid rgba(255,255,255,0.05)',paddingTop:12}}>
          {/* Messages */}
          <div style={{maxHeight:320,overflowY:'auto',display:'flex',flexDirection:'column',gap:8,marginBottom:12,paddingRight:4}}>
            {msgs.length === 0 && <p style={{textAlign:'center',color:'var(--text-muted)',fontSize:12,padding:'20px 0'}}>Belum ada percakapan</p>}
            {msgs.map((m,i) => {
              const isAdmin = m.sender_type === 'admin';
              return (
                <div key={m.id||i} style={{display:'flex',flexDirection:'column',alignItems:isAdmin?'flex-end':'flex-start'}}>
                  <div style={{
                    maxWidth:'80%',background:isAdmin?'rgba(255,107,0,0.1)':'rgba(255,255,255,0.04)',
                    border:`1px solid ${isAdmin?'rgba(255,107,0,0.2)':'rgba(255,255,255,0.07)'}`,
                    borderRadius:isAdmin?'12px 12px 2px 12px':'12px 12px 12px 2px',
                    padding:'8px 12px',
                  }}>
                    <p style={{fontSize:12,fontWeight:700,color:isAdmin?'var(--primary)':'var(--primary-light)',marginBottom:2}}>
                      {isAdmin ? '👑 Admin' : `👤 ${m.sender}`}
                    </p>
                    <p style={{fontSize:13,color:'#d1d1d6',lineHeight:1.5,wordBreak:'break-word'}}>{m.text}</p>
                  </div>
                  <span style={{fontSize:10,color:'var(--text-muted)',marginTop:2,paddingHorizontal:4}}>{fmt(m.created_at)}</span>
                </div>
              );
            })}
            <div ref={msgEndRef}/>
          </div>

          {/* Reply input */}
          {!isClosed && (
            <div style={{display:'flex',gap:8}}>
              <textarea value={msg} onChange={e=>setMsg(e.target.value)} rows={2}
                onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMsg();} }}
                placeholder="Tulis balasan... (Enter kirim, Shift+Enter baris baru)"
                className="admin-input" style={{flex:1,resize:'none',fontSize:12}}/>
              <button disabled={sending||!msg.trim()} className="btn-primary-fn"
                style={{flexShrink:0,alignSelf:'flex-end',padding:'10px 14px'}} onClick={sendMsg}>
                {sending ? <i className="fa-solid fa-spinner fa-spin"/> : <><i className="fa-solid fa-paper-plane"/> Kirim</>}
              </button>
            </div>
          )}
          {isClosed && <p style={{textAlign:'center',fontSize:12,color:'var(--text-muted)',padding:'8px 0'}}>Tiket ditutup — tidak bisa membalas</p>}
        </div>
      )}
    </div>
  );
}
// ── MODAL helpers ─────────────────────────────────────────────
function ModalWrap({ title, onClose, children }) {
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',backdropFilter:'blur(10px)',zIndex:3000,display:'flex',alignItems:'flex-start',justifyContent:'center',padding:'20px',overflowY:'auto'}}>
      <div style={{background:'#0a0a0f',border:'1px solid rgba(255,107,0,0.2)',borderRadius:18,width:'100%',maxWidth:600,marginTop:20,boxShadow:'0 0 50px rgba(255,107,0,0.1)'}}>
        <div style={{height:3,background:'linear-gradient(90deg,var(--primary),var(--primary-light),var(--primary))',borderRadius:'18px 18px 0 0'}}/>
        <div style={{padding:'22px 24px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:22}}>
            <h2 style={{fontFamily:'Space Grotesk',fontWeight:700,fontSize:18,color:'#fff'}}>{title}</h2>
            <button onClick={onClose} style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',color:'var(--text-muted)',width:32,height:32,borderRadius:8,cursor:'pointer',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <i className="fa-solid fa-xmark"/>
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return <div style={{marginBottom:14}}><label className="admin-label">{label}</label>{children}</div>;
}

// ── ProductModal ──────────────────────────────────────────────
function ProductModal({ product, categories, af, onClose, onDone }) {
  const isEdit = !!product?.id;
  const pf = v => { try { const p=typeof v==='string'?JSON.parse(v):v; return Array.isArray(p)?p.join('\n'):''; } catch { return ''; } };
  // Hitung discount_percent dari existing data (untuk mode edit)
  const existingDiscount = product?.discount_percent || (
    product?.original_price > product?.price
      ? Math.round((1 - product.price / product.original_price) * 100)
      : 0
  );
  const [f, setF] = useState({
    id:product?.id||null, name:product?.name||'', category_id:product?.category_id||'',
    description:product?.description||'', price:product?.price||'',
    discount_percent: existingDiscount || '',
    image_url:product?.image_url||'', badge:product?.badge||'', badge_color:product?.badge_color||'orange',
    reward_trigger:product?.reward_trigger||'', purchase_limit:product?.purchase_limit||0,
    limit_scope:product?.limit_scope||'per_product', sort_order:product?.sort_order||0,
    is_active:product?.is_active!==undefined?!!product.is_active:true, features:pf(product?.features),
  });
  const [saving, setSaving] = useState(false);

  // Preview: harga asli (coret) dihitung dari harga jual + diskon
  const priceNum   = parseInt(f.price) || 0;
  const discNum    = parseInt(f.discount_percent) || 0;
  const origPrice  = discNum > 0 && discNum < 100 ? Math.round(priceNum / (1 - discNum / 100)) : 0;

  const submit = async e => {
    e.preventDefault(); setSaving(true);
    const r = await af('/api/admin/products',{method:isEdit?'PUT':'POST',body:JSON.stringify({
      ...f, price:parseInt(f.price)||0,
      discount_percent: parseInt(f.discount_percent)||0,
      purchase_limit:parseInt(f.purchase_limit)||0, sort_order:parseInt(f.sort_order)||0,
      category_id:f.category_id?parseInt(f.category_id):null, is_active:f.is_active?1:0,
      features:f.features.split('\n').filter(Boolean),
    })});
    setSaving(false);
    if(r.success){toast.success(isEdit?'Produk diupdate!':'Produk ditambahkan!');onDone();}
    else toast.error(r.message||'Gagal');
  };

  return (
    <ModalWrap title={isEdit?'Edit Produk':'Tambah Produk Baru'} onClose={onClose}>
      <form onSubmit={submit} style={{maxHeight:'70vh',overflowY:'auto',paddingRight:4}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <div style={{gridColumn:'1/-1'}}><Field label="Nama Produk *"><input value={f.name} onChange={e=>setF(p=>({...p,name:e.target.value}))} className="admin-input" required/></Field></div>
          <Field label="Kategori"><select value={f.category_id} onChange={e=>setF(p=>({...p,category_id:e.target.value}))} className="admin-input">
            <option value="">— Pilih —</option>{categories.map(c=><option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select></Field>
          <Field label="Harga (Rp) *"><input type="number" value={f.price} onChange={e=>setF(p=>({...p,price:e.target.value}))} className="admin-input" required/></Field>
          <Field label="Diskon (%)">
            <div style={{position:'relative'}}>
              <input type="number" min="0" max="99" value={f.discount_percent}
                onChange={e=>setF(p=>({...p,discount_percent:e.target.value}))}
                className="admin-input" placeholder="0 = tidak ada diskon"/>
              <span style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',color:'var(--text-muted)',fontSize:13}}>%</span>
            </div>
            {discNum > 0 && priceNum > 0 && (
              <div style={{marginTop:6,fontSize:12,background:'rgba(231,76,60,0.06)',border:'1px solid rgba(231,76,60,0.2)',borderRadius:6,padding:'6px 10px',display:'flex',gap:8,alignItems:'center'}}>
                <span style={{color:'var(--text-muted)',textDecoration:'line-through'}}>{idr(origPrice)}</span>
                <span style={{color:'#e74c3c',fontWeight:700}}>→</span>
                <span style={{color:'var(--primary-light)',fontWeight:700}}>{idr(priceNum)}</span>
                <span style={{marginLeft:'auto',background:'#e74c3c',color:'#fff',fontSize:10,fontWeight:700,padding:'2px 6px',borderRadius:4}}>-{discNum}%</span>
              </div>
            )}
          </Field>
          <Field label="Reward Trigger">
            <input value={f.reward_trigger} onChange={e=>setF(p=>({...p,reward_trigger:e.target.value}))} className="admin-input" placeholder="contoh: rank_vip" style={{fontFamily:'monospace'}}/>
            <p style={{fontSize:11,color:'var(--text-muted)',marginTop:5}}>ID reward di config.yml plugin ShadowynAPI</p>
          </Field>
          <div style={{gridColumn:'1/-1'}}><Field label="Gambar Produk">
            <ImageUpload
              value={f.image_url}
              onChange={url => setF(p=>({...p, image_url: url}))}
              label=""
              hint="JPG, PNG, WEBP, GIF · Maks 2MB"
              previewSize={72}
              adminToken={typeof window!=='undefined' ? localStorage.getItem('admin_token')||'' : ''}
            />
          </Field></div>
          <div style={{gridColumn:'1/-1'}}><Field label="Deskripsi"><textarea value={f.description} onChange={e=>setF(p=>({...p,description:e.target.value}))} className="admin-input" rows={2} style={{resize:'none'}}/></Field></div>
          <div style={{gridColumn:'1/-1'}}><Field label="Fitur/Benefit (satu per baris)"><textarea value={f.features} onChange={e=>setF(p=>({...p,features:e.target.value}))} className="admin-input" rows={4} style={{resize:'none'}} placeholder={"Prefix [VIP]\nKit setiap hari\nFly di spawn"}/></Field></div>
          <Field label="Badge Text"><input value={f.badge} onChange={e=>setF(p=>({...p,badge:e.target.value}))} className="admin-input" placeholder="BEST SELLER"/></Field>
          <Field label="Badge Warna"><select value={f.badge_color} onChange={e=>setF(p=>({...p,badge_color:e.target.value}))} className="admin-input">
            {['orange','red','purple','blue','green','yellow'].map(c=><option key={c} value={c}>{c}</option>)}
          </select></Field>
          <Field label="Batas Beli"><input type="number" min="0" value={f.purchase_limit} onChange={e=>setF(p=>({...p,purchase_limit:e.target.value}))} className="admin-input"/>
            <p style={{fontSize:11,color:'var(--text-muted)',marginTop:4}}>0 = tidak terbatas</p>
          </Field>
          <Field label="Scope Batas"><select value={f.limit_scope} onChange={e=>setF(p=>({...p,limit_scope:e.target.value}))} className="admin-input">
            <option value="per_product">Per produk</option>
            <option value="per_category">Per kategori</option>
            <option value="global">Semua produk</option>
          </select></Field>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:10,margin:'12px 0 18px'}}>
          <label className="toggle-switch"><input type="checkbox" checked={f.is_active} onChange={e=>setF(p=>({...p,is_active:e.target.checked}))}/><span className="toggle-slider"/></label>
          <span style={{fontSize:13,color:f.is_active?'#2ecc71':'var(--text-muted)',fontWeight:600}}>{f.is_active?'Produk Aktif':'Nonaktif'}</span>
        </div>
        <div style={{display:'flex',gap:10}}>
          <button type="button" onClick={onClose} className="btn-ghost-fn" style={{flex:1,justifyContent:'center'}}>Batal</button>
          <button type="submit" disabled={saving} className="btn-primary-fn" style={{flex:1,justifyContent:'center'}}>
            {saving?<><i className="fa-solid fa-spinner fa-spin"/> Menyimpan...</>:<><i className="fa-solid fa-floppy-disk"/> {isEdit?'Update':'Tambah'} Produk</>}
          </button>
        </div>
      </form>
    </ModalWrap>
  );
}

// ── CategoryModal ─────────────────────────────────────────────
function CategoryModal({ category, af, onClose, onDone }) {
  const isEdit = !!category?.id;
  const [f, setF] = useState({id:category?.id||null,name:category?.name||'',icon:category?.icon||'📦',color:category?.color||'orange',description:category?.description||'',sort_order:category?.sort_order||0,is_active:category?.is_active!==undefined?!!category.is_active:true});
  const [saving, setSaving] = useState(false);

  const submit = async e => {
    e.preventDefault(); setSaving(true);
    const r = await af('/api/admin/categories',{method:isEdit?'PUT':'POST',body:JSON.stringify({...f,is_active:f.is_active?1:0})});
    setSaving(false);
    if(r.success){toast.success(isEdit?'Kategori diupdate!':'Kategori ditambahkan!');onDone();}
    else toast.error(r.message||'Gagal');
  };

  return (
    <ModalWrap title={isEdit?'Edit Kategori':'Tambah Kategori'} onClose={onClose}>
      <form onSubmit={submit} style={{display:'flex',flexDirection:'column',gap:12}}>
        <Field label="Nama *"><input value={f.name} onChange={e=>setF(p=>({...p,name:e.target.value}))} className="admin-input" required/></Field>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <Field label="Icon (emoji)"><input value={f.icon} onChange={e=>setF(p=>({...p,icon:e.target.value}))} className="admin-input" style={{fontSize:22}}/></Field>
          <Field label="Warna"><select value={f.color} onChange={e=>setF(p=>({...p,color:e.target.value}))} className="admin-input">
            {['orange','red','purple','blue','green','yellow'].map(c=><option key={c} value={c}>{c}</option>)}
          </select></Field>
        </div>
        <Field label="Deskripsi"><input value={f.description} onChange={e=>setF(p=>({...p,description:e.target.value}))} className="admin-input"/></Field>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <label className="toggle-switch"><input type="checkbox" checked={f.is_active} onChange={e=>setF(p=>({...p,is_active:e.target.checked}))}/><span className="toggle-slider"/></label>
          <span style={{fontSize:13,color:f.is_active?'#2ecc71':'var(--text-muted)',fontWeight:600}}>{f.is_active?'Aktif':'Nonaktif'}</span>
        </div>
        <div style={{display:'flex',gap:10,marginTop:6}}>
          <button type="button" onClick={onClose} className="btn-ghost-fn" style={{flex:1,justifyContent:'center'}}>Batal</button>
          <button type="submit" disabled={saving} className="btn-primary-fn" style={{flex:1,justifyContent:'center'}}>
            {saving?<i className="fa-solid fa-spinner fa-spin"/>:<><i className="fa-solid fa-floppy-disk"/> Simpan</>}
          </button>
        </div>
      </form>
    </ModalWrap>
  );
}

// ── RedeemModal ───────────────────────────────────────────────
function RedeemModal({ af, onClose, onDone }) {
  const [f, setF] = useState({code:'',discount_type:'percent',discount_value:'',max_uses:1,min_price:0,expires_at:''});
  const [saving, setSaving] = useState(false);
  const gen = () => { const c='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; setF(p=>({...p,code:Array.from({length:8},()=>c[Math.floor(Math.random()*c.length)]).join('')})); };

  const submit = async e => {
    e.preventDefault(); setSaving(true);
    const r = await af('/api/admin/redeem',{method:'POST',body:JSON.stringify(f)});
    setSaving(false);
    if(r.success){toast.success('Kode dibuat!');onDone();}
    else toast.error(r.message||'Gagal');
  };

  return (
    <ModalWrap title="Buat Kode Redeem" onClose={onClose}>
      <form onSubmit={submit} style={{display:'flex',flexDirection:'column',gap:12}}>
        <Field label="Kode *">
          <div style={{display:'flex',gap:8}}>
            <input value={f.code} onChange={e=>setF(p=>({...p,code:e.target.value.toUpperCase()}))} className="admin-input" style={{fontFamily:'monospace',fontWeight:700,flex:1}} placeholder="DISKON20" required/>
            <button type="button" onClick={gen} className="btn-ghost-fn" style={{flexShrink:0}}>Auto</button>
          </div>
        </Field>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <Field label="Tipe Diskon"><select value={f.discount_type} onChange={e=>setF(p=>({...p,discount_type:e.target.value}))} className="admin-input">
            <option value="percent">Persen (%)</option><option value="fixed">Nominal (Rp)</option>
          </select></Field>
          <Field label={`Nilai ${f.discount_type==='percent'?'(%)':'(Rp)'} *`}>
            <input type="number" value={f.discount_value} onChange={e=>setF(p=>({...p,discount_value:e.target.value}))} className="admin-input" placeholder={f.discount_type==='percent'?'20':'10000'} required/>
          </Field>
          <Field label="Maks Pakai"><input type="number" min="1" value={f.max_uses} onChange={e=>setF(p=>({...p,max_uses:parseInt(e.target.value)||1}))} className="admin-input"/></Field>
          <Field label="Kadaluarsa"><input type="datetime-local" value={f.expires_at} onChange={e=>setF(p=>({...p,expires_at:e.target.value}))} className="admin-input"/></Field>
        </div>
        <div style={{display:'flex',gap:10,marginTop:6}}>
          <button type="button" onClick={onClose} className="btn-ghost-fn" style={{flex:1,justifyContent:'center'}}>Batal</button>
          <button type="submit" disabled={saving} className="btn-primary-fn" style={{flex:1,justifyContent:'center'}}>
            {saving?<i className="fa-solid fa-spinner fa-spin"/>:<><i className="fa-solid fa-ticket"/> Buat Kode</>}
          </button>
        </div>
      </form>
    </ModalWrap>
  );
}
