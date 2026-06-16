import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
// Redis modules loaded via dynamic import in getServerSideProps
import FancyNav, { PlayerAvatar } from '../components/FancyNav';
import { useTransparentLogo } from '../components/LogoImage';
import LoginModal from '../components/LoginModal';
import CartModal  from '../components/CartModal';
import toast from 'react-hot-toast';

export async function getServerSideProps() {
  try {
    const { SettingsAsync, ProductsAsync, CategoriesAsync } = await import('../lib/redis.js');
    const [settings, allCats, allProds] = await Promise.all([
      SettingsAsync.get(),
      CategoriesAsync.active(),
      ProductsAsync.active(),
    ]);
    const categories = allCats.sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
    const catMap     = Object.fromEntries(categories.map(c=>[c.id,c]));
    const products   = allProds
      .sort((a,b)=>(a.sort_order||0)-(b.sort_order||0))
      .map(p=>({
        ...p,
        category_name: catMap[p.category_id]?.name||null,
        category_slug: catMap[p.category_id]?.slug||null,
        category_icon: catMap[p.category_id]?.icon||null,
      }));
    return { props:{settings,categories,products} };
  } catch(e) { return { props:{settings:{},categories:[],products:[]} }; }
}

const idr = v => `Rp ${Number(v||0).toLocaleString('id-ID')}`;

export default function StorePage({ settings, categories: initCategories, products: initProducts }) {
  const router = useRouter();
  const s = settings || {};
  const serverName = s.server_name || 'Fancy Network';
  const { src: logoSrc } = useTransparentLogo();

  const [player,     setPlayer]     = useState(null);
  const [showLogin,  setShowLogin]  = useState(false);
  const [showCart,   setShowCart]   = useState(false);
  const [cartItem,   setCartItem]   = useState(null);
  const [pendingBuy, setPendingBuy] = useState(null);
  const [activeTab,  setActiveTab]  = useState('all');
  const [expanded,   setExpanded]   = useState({});
  const [search,     setSearch]     = useState('');
  // State produk — bisa di-update via client-side fetch
  const [products,   setProducts]   = useState(initProducts || []);
  const [categories, setCategories] = useState(initCategories || []);

  // Client-side fetch untuk memastikan data produk selalu terbaru
  // (mengatasi kasus Vercel serverless di mana /tmp/data bisa berbeda per instance)
  // BUGFIX: hanya update state jika response benar-benar punya data,
  // supaya data SSR tidak tertimpa array kosong dari instance berbeda.
  useEffect(() => {
    // Trigger page-load animation
    const t = setTimeout(() => document.body.classList.add('page-loaded'), 80);

    fetch('/api/store/products')
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          // Hanya update produk jika ada isi, jangan timpa data SSR dengan array kosong
          // Pastikan urutan sort_order diterapkan (no 1 dari atas ke bawah)
          if (Array.isArray(d.products) && d.products.length > 0) {
            setProducts([...d.products].sort((a,b)=>(a.sort_order||0)-(b.sort_order||0)));
          }
          // Update categories dan urutkan (no 1 dari kiri ke kanan)
          if (Array.isArray(d.categories) && d.categories.length > 0) {
            setCategories([...d.categories].sort((a,b)=>(a.sort_order||0)-(b.sort_order||0)));
          }
        }
      })
      .catch(() => {});
    return () => { clearTimeout(t); document.body.classList.remove('page-loaded'); };
  }, []);

  useEffect(() => {
    // Restore player dari localStorage, tapi validasi session masih aktif
    try {
      const r = localStorage.getItem('mc_player');
      if (r) {
        const savedPlayer = JSON.parse(r);
        // Verifikasi token masih valid (cookie atau localStorage token)
        const token = localStorage.getItem('mc_token');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        fetch('/api/auth/me', { credentials: 'include', headers })
          .then(res => res.ok ? res.json() : null)
          .then(data => {
            if (data && data.success) {
              setPlayer(savedPlayer);
            } else {
              // Session sudah tidak valid, bersihkan state
              localStorage.removeItem('mc_player');
              localStorage.removeItem('mc_token');
            }
          })
          .catch(() => {
            // Kalau endpoint tidak ada, fallback ke restore biasa
            setPlayer(savedPlayer);
          });
      }
    } catch {}
    const { order, status, order_id, transaction_status } = router.query;

    // Redirect dari Midtrans deeplink (GoPay, dll) — pakai order_id dari query
    if (order_id) {
      router.replace('/invoice/' + order_id);
      return;
    }

    // Redirect lama dari snap popup callback
    if (order && status) {
      router.replace('/invoice/' + order);
    }
  }, [router.query]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout',{method:'POST',credentials:'include'});
    setPlayer(null); localStorage.removeItem('mc_player');
    toast.success('Berhasil keluar');
  };

  const handleLoginSuccess = (p) => {
    setPlayer(p); localStorage.setItem('mc_player',JSON.stringify(p));
    setShowLogin(false);
    if (pendingBuy) { setCartItem(pendingBuy); setShowCart(true); setPendingBuy(null); }
  };

  // Tombol beli — muncul popup login jika belum login
  const handleBuy = (product) => {
    if (!player) { setPendingBuy(product); setShowLogin(true); }
    else         { setCartItem(product);   setShowCart(true);  }
  };

  const toggleExpand = (id) => setExpanded(p=>({...p,[id]:!p[id]}));

  const filtered = products.filter(p => {
    const matchTab  = activeTab==='all' || p.category_slug===activeTab;
    const matchSrch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSrch;
  });

  const allTabs = [
    { id:'all', label:'Semua', icon:'fa-store', color:'var(--primary)', emoji:null },
    ...categories.map(c=>({
      id:c.slug, label:c.name, icon:null, emoji:c.icon,
      color: { orange:'var(--primary)', red:'#e74c3c', purple:'#9b59b6',
               blue:'#3498db', green:'#2ecc71', yellow:'#f1c40f' }[c.color] || 'var(--primary)',
    })),
  ];

  const badgeColor = {
    orange:'var(--primary)', red:'#e74c3c', purple:'#9b59b6',
    blue:'#3498db', green:'#2ecc71', yellow:'#f1c40f',
  };

  const categoryColor = (colorName) => {
    const map = {
      orange:'var(--primary)', red:'#e74c3c', purple:'#9b59b6',
      blue:'#3498db', green:'#2ecc71', yellow:'#f1c40f',
    };
    return map[colorName] || 'var(--primary)';
  };

  return (
    <>
      <Head>
        <title>Store — {serverName}</title>
        <meta name="viewport" content="width=device-width,initial-scale=1"/>
        <meta name="description" content={`Item Store ${serverName}`}/>
        <link rel="icon" type="image/png" href={s.logo_url || logoSrc || '/favicon.png'}/>
        {/* Font Awesome dimuat async di _document.js */}
      </Head>



      <FancyNav player={player} onLoginClick={()=>setShowLogin(true)} onLogout={handleLogout} settings={s}/>

      <div style={{padding:'130px 6% 80px',maxWidth:1200,margin:'0 auto'}}>

        {/* Header */}
        <div data-anim="fade-up" data-delay="1" style={{textAlign:'center',marginBottom:40}}>
          <span style={{color:'var(--primary)',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:1.5,display:'block',marginBottom:8}}>ITEM STORE</span>
          <h1 className="font-space" style={{fontSize:'clamp(24px,5vw,36px)',fontWeight:700,marginBottom:10}}>
            {serverName} <span style={{color:'var(--primary)'}}>Store</span>
          </h1>
          <p style={{color:'var(--text-muted)',fontSize:14}}>Semua pembelian dikirim otomatis ke Minecraft kamu</p>
          {player && (
            <div style={{display:'inline-flex',alignItems:'center',gap:8,marginTop:12,background:'rgba(46,204,113,0.08)',border:'1px solid rgba(46,204,113,0.2)',borderRadius:30,padding:'6px 16px'}}>
              <PlayerAvatar uuid={player.uuid} username={player.username} size={20}/>
              <span style={{color:'#2ecc71',fontSize:13,fontWeight:600}}>{player.displayName||player.username}</span>
              {player.rank && player.rank!=='default' && (
                <span style={{background:'rgba(255,107,0,0.2)',color:'var(--primary-light)',padding:'2px 8px',borderRadius:4,fontSize:10,fontWeight:700}}>
                  {player.rank.toUpperCase()}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Tabs + search */}
        <div style={{marginBottom:32}}>
          {/* Search bar */}
          <div style={{display:'flex',justifyContent:'flex-end',marginBottom:14}}>
            <div style={{position:'relative'}}>
              <i className="fa-solid fa-search" style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text-muted)',fontSize:13}}/>
              <input value={search} onChange={e=>setSearch(e.target.value)}
                placeholder="Cari produk..." className="fn-input"
                style={{paddingLeft:36,width:220,borderRadius:10}}/>
            </div>
          </div>
          {/* Category tabs */}
          <div className="tabs-container" style={{overflowX:'auto',flexWrap:'wrap',gap:6}}>
            {allTabs.map(tab=>{
              const isActive = activeTab === tab.id;
              const col = tab.color;
              return (
                <button key={tab.id}
                  className={`tab-btn${isActive?' active':''}`}
                  onClick={()=>setActiveTab(tab.id)}
                  style={isActive
                    ? {background:col, color:'#fff', boxShadow:`0 4px 15px ${col}55`, border:'none', flex:'0 0 auto'}
                    : {flex:'0 0 auto', border:'1px solid rgba(255,255,255,0.06)'}
                  }
                  onMouseEnter={e=>{ if(!isActive){ e.currentTarget.style.color='#fff'; e.currentTarget.style.borderColor=col+'88'; }}}
                  onMouseLeave={e=>{ if(!isActive){ e.currentTarget.style.color=''; e.currentTarget.style.borderColor='rgba(255,255,255,0.06)'; }}}>
                  {tab.emoji && (
                    <span style={{
                      display:'inline-flex',alignItems:'center',justifyContent:'center',
                      width:22,height:22,background: isActive ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.07)',
                      borderRadius:6,fontSize:13,lineHeight:1,flexShrink:0,
                    }}>{tab.emoji}</span>
                  )}
                  {tab.icon && (
                    <span style={{
                      display:'inline-flex',alignItems:'center',justifyContent:'center',
                      width:22,height:22,background: isActive ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.07)',
                      borderRadius:6,flexShrink:0,
                    }}>
                      <i className={`fa-solid ${tab.icon}`} style={{fontSize:11}}/>
                    </span>
                  )}
                  <span>{tab.label}</span>
                  {isActive && (
                    <span style={{
                      display:'inline-flex',alignItems:'center',justifyContent:'center',
                      background:'rgba(255,255,255,0.25)',borderRadius:20,
                      fontSize:9,fontWeight:800,padding:'1px 6px',minWidth:16,
                    }}>
                      {activeTab==='all' ? products.length : products.filter(p=>p.category_slug===tab.id).length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Products grid */}
        {filtered.length === 0 ? (
          <div style={{textAlign:'center',padding:'80px 0'}}>
            <i className="fa-solid fa-box-open" style={{fontSize:48,color:'var(--text-muted)',marginBottom:16,display:'block'}}/>
            <p style={{color:'var(--text-muted)',fontSize:15}}>{search?`Produk "${search}" tidak ditemukan`:'Belum ada produk di kategori ini'}</p>
            {search && <button onClick={()=>setSearch('')} style={{marginTop:12,background:'none',border:'none',color:'var(--primary)',cursor:'pointer',fontSize:13}}>Hapus pencarian</button>}
          </div>
        ) : (
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:16}}>
            {filtered.map((product, pIdx) => {
              const isOpen = !!expanded[product.id];
              const discount = product.original_price && product.original_price>product.price
                ? Math.round((1-product.price/product.original_price)*100) : 0;
              const features = (() => { try { return typeof product.features==='string' ? JSON.parse(product.features) : product.features||[]; } catch{ return []; } })();

  // Warna orb & glow otomatis berdasarkan kategori
  const CATEGORY_COLORS = {
    rank:       { a:'rgba(255,215,0,0.22)',  b:'rgba(10,8,0,0.95)',   c:'rgba(255,180,0,0.1)',  glow:'rgba(255,200,0,0.55)',  orb:'#ffd700' },
    weapon:     { a:'rgba(231,76,60,0.22)',  b:'rgba(12,5,5,0.95)',   c:'rgba(200,50,30,0.1)',  glow:'rgba(220,60,40,0.55)',  orb:'#e74c3c' },
    sellwand:   { a:'rgba(46,204,113,0.2)',  b:'rgba(5,12,8,0.95)',   c:'rgba(30,180,90,0.1)',  glow:'rgba(46,200,100,0.5)',  orb:'#2ecc71' },
    auraskills: { a:'rgba(155,89,182,0.22)', b:'rgba(8,5,12,0.95)',   c:'rgba(130,60,180,0.1)', glow:'rgba(150,80,200,0.55)', orb:'#9b59b6' },
    'crate-key':{ a:'rgba(52,152,219,0.22)', b:'rgba(5,8,15,0.95)',   c:'rgba(30,120,200,0.1)', glow:'rgba(52,150,220,0.55)', orb:'#3498db' },
    kit:        { a:'rgba(26,188,156,0.2)',  b:'rgba(5,12,10,0.95)',  c:'rgba(20,170,140,0.1)', glow:'rgba(26,188,156,0.5)',  orb:'#1abc9c' },
  };
  const defaultColor = { a:'rgba(255,107,0,0.18)', b:'rgba(10,10,20,0.95)', c:'rgba(255,107,0,0.08)', glow:'rgba(255,107,0,0.5)', orb:'#ff6b00' };

              const col = CATEGORY_COLORS[product.category_slug] || defaultColor;
              const cardStyle = {
                '--card-color-a': col.a, '--card-color-b': col.b,
                '--card-color-c': col.c, '--card-glow': col.glow,
              };

              return (
                <div key={product.id} className="fn-card product-card-enter" style={{padding:0,overflow:'hidden',display:'flex',flexDirection:'column'}} data-anim="fade-up" data-delay={String(Math.min(pIdx % 8 + 1, 8))}>
                  {/* Product image area */}
                  <div className="product-img-bg" style={cardStyle}>
                    {/* Orbs */}
                    <div className="product-orb product-orb-1" style={{background:col.orb}}/>
                    <div className="product-orb product-orb-2" style={{background:col.orb}}/>
                    <div className="product-orb product-orb-3" style={{background:col.orb}}/>
                    {/* Shimmer */}
                    <div className="product-shimmer"/>
                    {/* Image or icon */}
                    {product.image_url
                      ? <>
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="product-img"
                            width={200}
                            height={200}
                            loading="lazy"
                            decoding="async"
                            referrerPolicy="no-referrer"
                            onError={e=>{ e.target.onerror=null; e.target.style.opacity='0'; }}
                          />
                          <div className="product-img-glint"/>
                        </>
                      : null
                    }
                    {/* Badges */}
                    {discount>0 && (
                      <span style={{position:'absolute',top:10,left:10,background:'#e74c3c',color:'#fff',fontSize:10,fontWeight:700,padding:'3px 8px',borderRadius:5,zIndex:4}}>-{discount}%</span>
                    )}
                    {product.badge && (
                      <span style={{position:'absolute',top:10,right:10,background:badgeColor[product.badge_color||'orange']||'var(--primary)',color:'#fff',fontSize:10,fontWeight:700,padding:'3px 8px',borderRadius:5,textTransform:'uppercase',zIndex:4}}>
                        {product.badge}
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div style={{padding:'18px 20px',flex:1,display:'flex',flexDirection:'column'}}>
                    <div style={{fontSize:10,color:'var(--text-muted)',textTransform:'uppercase',fontWeight:700,letterSpacing:0.5,marginBottom:4}}>
                      {product.category_name||'Item'}
                    </div>
                    <h3 style={{fontSize:16,fontWeight:700,marginBottom:6}}>{product.name}</h3>
                    {product.description && (
                      <p style={{fontSize:12.5,color:'var(--text-muted)',lineHeight:1.5,marginBottom:12}}>{product.description}</p>
                    )}

                    {/* Toggle benefits */}
                    {features.length>0 && (
                      <>
                        <button onClick={()=>toggleExpand(product.id)}
                          style={{background:'none',border:'none',color:'var(--text-muted)',fontSize:12,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:6,padding:'8px 0',transition:'color 0.2s'}}
                          onMouseEnter={e=>e.currentTarget.style.color='var(--primary)'}
                          onMouseLeave={e=>e.currentTarget.style.color='var(--text-muted)'}>
                          <i className={`fa-solid ${isOpen?'fa-chevron-up':'fa-chevron-down'}`} style={{fontSize:10}}/>
                          {isOpen ? 'Sembunyikan benefit' : `Lihat ${features.length} benefit`}
                        </button>
                        <div className={`benefit-panel${isOpen?' open':''}`}>
                          <p className="benefit-title">Benefit yang kamu dapat:</p>
                          <ul className="reward-list">
                            {features.map((f,fi)=>(
                              <li key={fi}><i className="fa-solid fa-check-circle"/>{f}</li>
                            ))}
                          </ul>
                        </div>
                      </>
                    )}

                    {/* Price + buy */}
                    <div style={{marginTop:'auto',paddingTop:16,borderTop:'1px solid rgba(255,255,255,0.05)',display:'flex',alignItems:'center',justifyContent:'space-between',gap:10}}>
                      <div>
                        {product.original_price && product.original_price>product.price && (
                          <div style={{fontSize:11,color:'var(--text-muted)',textDecoration:'line-through'}}>{idr(product.original_price)}</div>
                        )}
                        <div className="font-space" style={{fontSize:18,fontWeight:700,color:'var(--primary-light)'}}>{idr(product.price)}</div>
                      </div>
                      <button className="btn-primary-fn" onClick={()=>handleBuy(product)}>
                        <i className="fa-solid fa-cart-shopping"/>
                        Beli
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="fn-footer" data-anim="fade-up">
        <p style={{fontSize:11,color:'#44444a'}}>© 2026 {serverName}. Store</p>
      </footer>

      {/* Login popup — muncul otomatis saat klik beli tanpa login */}
      {showLogin && (
        <LoginModal
          onClose={()=>{ setShowLogin(false); setPendingBuy(null); }}
          onSuccess={handleLoginSuccess}
          product={pendingBuy}/>
      )}

      {/* Cart / checkout */}
      {showCart && cartItem && (
        <CartModal product={cartItem} player={player}
          onClose={()=>{ setShowCart(false); setCartItem(null); }}/>
      )}
    </>
  );
}
