import { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import Icon from '../components/Icon';
import { useRouter } from 'next/router';
import FancyNav, { PlayerAvatar } from '../components/FancyNav';
import { useTransparentLogo } from '../components/LogoImage';
import ProductCard from '../components/ProductCard';
import toast from 'react-hot-toast';

const LoginModal = dynamic(() => import('../components/LoginModal'), { ssr: false });
const CartModal  = dynamic(() => import('../components/CartModal'),  { ssr: false });

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
  const [products,   setProducts]   = useState(initProducts || []);
  const [categories, setCategories] = useState(initCategories || []);
  const [isLoaded,   setIsLoaded]   = useState(false);

  // 1. Ambil data produk & kelola animasi page load
  useEffect(() => {
    const t = setTimeout(() => setIsLoaded(true), 50);

    fetch('/api/store/products')
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          if (Array.isArray(d.products) && d.products.length > 0) {
            setProducts([...d.products].sort((a,b)=>(a.sort_order||0)-(b.sort_order||0)));
          }
          if (Array.isArray(d.categories) && d.categories.length > 0) {
            setCategories([...d.categories].sort((a,b)=>(a.sort_order||0)-(b.sort_order||0)));
          }
        }
      })
      .catch(() => {});
    return () => clearTimeout(t);
  }, []);

  // 2. Filter Produk menggunakan useMemo agar hemat memori & performa tinggi
  const filtered = useMemo(() => {
    return products.filter(p => {
      const matchTab  = activeTab === 'all' || p.category_slug === activeTab;
      const matchSrch = !search || p.name.toLowerCase().includes(search.toLowerCase());
      return matchTab && matchSrch;
    });
  }, [products, activeTab, search]);

  // 3. Intersection Observer untuk scroll items (Mencegah Lag / Memory Leak)
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.02, rootMargin: '0px 0px -20px 0px' });

    const items = document.querySelectorAll('.scroll-animate');
    items.forEach(el => observer.observe(el));
    
    return () => observer.disconnect();
  }, [filtered]); 

  useEffect(() => {
    try {
      const r = localStorage.getItem('mc_player');
      if (r) {
        const savedPlayer = JSON.parse(r);
        const token = localStorage.getItem('mc_token');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        fetch('/api/auth/me', { credentials: 'include', headers })
          .then(res => res.ok ? res.json() : null)
          .then(data => {
            if (data && data.success) { setPlayer(savedPlayer); } 
            else { localStorage.removeItem('mc_player'); localStorage.removeItem('mc_token'); }
          })
          .catch(() => { setPlayer(savedPlayer); });
      }
    } catch {}
    
    const { order, status, order_id } = router.query;
    if (order_id) { router.replace('/invoice/' + order_id); return; }
    if (order && status) { router.replace('/invoice/' + order); }
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

  const handleBuy = (product) => {
    if (!player) { setPendingBuy(product); setShowLogin(true); }
    else         { setCartItem(product);   setShowCart(true);  }
  };

  const toggleExpand = (id) => setExpanded(p=>({...p,[id]:!p[id]}));

  const allTabs = [
    { id:'all', label:'Semua', color:'#F97316' },
    ...categories.map(c=>({ id:c.slug, label:c.name, color:'#F97316' })),
  ];

  return (
    <>
      <Head>
        <title>Store — {serverName}</title>
        <meta name="viewport" content="width=device-width,initial-scale=1"/>
        <meta name="description" content={`Item Store ${serverName}`}/>
        <link rel="icon" type="image/png" href={s.logo_url || logoSrc || '/favicon.png'}/>
      </Head>

      <div className="orange-theme-wrapper" style={{ backgroundColor: '#FFFFFF', color: '#1A0D05', minHeight: '100vh', position: 'relative', overflowX: 'hidden', display: 'flex', flexDirection: 'column' }}>
        
        {/* Soft Ambient Glow Layer */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }} className="gpu-glow-layer">
          <div style={{ position: 'absolute', top: '-5%', left: '50%', transform: 'translateX(-50%)', width: '600px', height: '500px', background: 'radial-gradient(circle, rgba(249,115,22,0.04) 0%, transparent 75%)', filter: 'blur(80px)' }} />
        </div>

        <FancyNav player={player} onLoginClick={()=>setShowLogin(true)} onLogout={handleLogout} settings={s}/>

        <div style={{padding:'140px 6% 80px', maxWidth:1200, margin:'0 auto', position:'relative', zIndex: 1, flex: 1, width: '100%'}}>

          {/* HEADER SECTION (SAFE STAGGERED LOAD) */}
          <header style={{textAlign:'center', marginBottom:48}} className={isLoaded ? 'load-animate loaded' : 'load-animate'}>
            <span style={{display:'inline-flex', alignItems:'center', gap:10, padding:'4px 14px', borderRadius:'50px', background:'rgba(249,115,22,0.08)', border:'1px solid rgba(249,115,22,0.25)', color:'#EA580C', fontWeight:700, fontSize:10.5, letterSpacing:'0.5px'}} className="load-item-1">
              OFFICIAL MARKETPLACE
            </span>
            
            <h1 className="font-space load-item-2" style={{fontSize:'clamp(42px, 8vw, 64px)', fontWeight:900, color:'#1A0D05', margin:'14px 0 8px', letterSpacing:'-1px'}}>
              STORE
            </h1>
            
            <p style={{color:'#EA580C', opacity:0.85, fontSize:14.5, maxWidth:500, margin:'0 auto 24px', fontWeight:500}} className="load-item-3">
              Setiap donasi membantu server tetap online. Item otomatis masuk secara instan!
            </p>
            
            {player && (
              <div style={{display:'inline-flex', alignItems:'center', gap:8, background:'rgba(249,115,22,0.05)', border:'1px solid rgba(249,115,22,0.2)', borderRadius:30, padding:'6px 16px'}} className="load-item-4">
                <PlayerAvatar uuid={player.uuid} username={player.username} size={20}/>
                <span style={{color:'#EA580C', fontSize:13, fontWeight:700}}>{player.displayName||player.username}</span>
                {player.rank && player.rank!=='default' && (
                  <span style={{background:'#F97316', color:'#FFFFFF', padding:'2px 8px', borderRadius:4, fontSize:10, fontWeight:800}}>
                    {player.rank.toUpperCase()}
                  </span>
                )}
              </div>
            )}
          </header>

          {/* FILTER TOOLBAR */}
          <div style={{marginBottom:32, display:'flex', flexDirection:'column', gap:16}} className={isLoaded ? 'load-animate loaded' : 'load-animate'}>
            {/* Search bar */}
            <div style={{display:'flex', justifyContent:'flex-end'} } className="load-item-4">
              <div style={{position:'relative', width: '100%', maxWidth: 260}}>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#EA580C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', opacity:0.7}}>
                  <circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/>
                </svg>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari item/package..." style={{width:'100%', padding:'10px 14px 10px 38px', borderRadius:12, border:'1px solid rgba(249,115,22,0.25)', background:'#FFFFFF', fontSize:13.5, color:'#1A0D05', outline:'none', transition:'border-color 0.15s'}} className="store-input-search"/>
              </div>
            </div>

            {/* Category tabs */}
            <div style={{display:'flex', gap:8, overflowX:'auto', paddingBottom:6, scrollbarWidth:'none'}} className="load-item-4">
              {allTabs.map(tab=>{
                const isActive = activeTab === tab.id;
                return (
                  <button key={tab.id} onClick={()=>setActiveTab(tab.id)}
                    style={isActive
                      ? {background: tab.color, color:'#fff', padding:'10px 18px', borderRadius:12, fontWeight:700, border:'none', fontSize:13, boxShadow:`0 4px 14px rgba(249,115,22,0.2)`, cursor:'pointer', whiteSpace:'nowrap'}
                      : {background:'#FFFFFF', color:'#EA580C', padding:'10px 18px', borderRadius:12, fontWeight:600, border:'1px solid rgba(249,115,22,0.25)', fontSize:13, cursor:'pointer', transition:'all 0.15s', whiteSpace:'nowrap'}
                    }
                    className={!isActive ? "store-inactive-tab" : ""}>
                    <span>{tab.label}</span>
                    <span style={{marginLeft: 6, fontSize:10, background: isActive ? 'rgba(255,255,255,0.2)' : 'rgba(249,115,22,0.08)', color: isActive ? '#fff' : '#EA580C', padding:'1px 6px', borderRadius:6, fontWeight:700}}>
                      {tab.id==='all' ? products.length : products.filter(p=>p.category_slug===tab.id).length}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* PRODUCTS CONTAINER */}
          {filtered.length === 0 ? (
            <div style={{textAlign:'center', padding:'80px 0', background:'#FFFFFF', borderRadius:20, border:'1px solid rgba(249,115,22,0.15)'}} className="scroll-animate visible">
              <p style={{color:'#EA580C', fontSize:14.5, fontWeight:600}}>{search?`Produk "${search}" tidak ditemukan`:'Belum ada produk di kategori ini'}</p>
              {search && <button onClick={()=>setSearch('')} style={{marginTop:12, background:'none', border:'none', color:'#F97316', cursor:'pointer', fontSize:13, fontWeight:700, textDecoration:'underline'}}>Reset Pencarian</button>}
            </div>
          ) : (
            <div className="store-grid" style={{display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:20}}>
              {filtered.map((product, pIdx) => (
                <div key={product.id} className="store-product-wrapper scroll-animate">
                  <ProductCard product={product} index={pIdx} isOpen={!!expanded[product.id]} onToggleExpand={toggleExpand} onBuy={handleBuy} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <footer style={{background:'#FFFFFF', borderTop:'1px solid rgba(249,115,22,0.15)', padding:'40px 24px', textAlign:'center', position:'relative', zIndex:1}}>
          <div className="store-footer-trust" style={{color:'#EA580C', fontSize:13, fontWeight:600, marginBottom:16, display:'flex', alignItems:'center', justifyContent:'center', gap:8}}>
            <Icon name="shield-halved" size={14} color="#F97316" />
            Pembayaran QRIS, ShopeePay, OVO, &amp; VA Bank Transfer terverifikasi otomatis
          </div>
          {s.discord_url ? (
            <a href={s.discord_url} target="_blank" rel="noopener noreferrer" style={{display:'inline-flex', alignItems:'center', gap:8, color:'#FFFFFF', fontSize:13, fontWeight:700, background:'#F97316', padding:'10px 20px', borderRadius:12, textDecoration:'none', transition:'background 0.15s'}} className="discord-footer-btn">
              <Icon name="discord" size={14}/> Butuh bantuan? Hubungi Kami di Discord
            </a>
          ) : (
            <Link href="/support" style={{color:'#F97316', fontWeight:700, fontSize:13, textDecoration:'none'}}>🎧 Butuh bantuan? Buka Tiket Support</Link>
          )}
          <div style={{marginTop:24, fontSize:12, color:'#EA580C', opacity:0.7}}>
            © 2026 {serverName}. Server ini tidak berafiliasi dengan Mojang Studios.
          </div>
        </footer>

        {showLogin && <LoginModal onClose={()=>{ setShowLogin(false); setPendingBuy(null); }} onSuccess={handleLoginSuccess} product={pendingBuy}/>}
        {showCart && cartItem && <CartModal product={cartItem} player={player} onClose={()=>{ setShowCart(false); setCartItem(null); }}/>}
      </div>

      {/* CORE CSS NATIVE ANIMATIONS */}
      <style jsx global>{`
        html {
          scroll-behavior: smooth;
        }

        .gpu-glow-layer {
          will-change: transform, opacity;
          transform: translateZ(0);
        }

        /* ANIMASI PAGE LOAD STAGGERED FADE-IN */
        .load-animate [class^="load-item-"] {
          opacity: 0;
          transform: translateY(12px);
          transition: opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1), transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
          will-change: opacity, transform;
        }
        .load-animate.loaded .load-item-1 { opacity: 1; transform: translateY(0); transition-delay: 40ms; }
        .load-animate.loaded .load-item-2 { opacity: 1; transform: translateY(0); transition-delay: 100ms; }
        .load-animate.loaded .load-item-3 { opacity: 1; transform: translateY(0); transition-delay: 160ms; }
        .load-animate.loaded .load-item-4 { opacity: 1; transform: translateY(0); transition-delay: 220ms; }

        /* ANIMASI SCROLL VIA OBSERVER */
        .scroll-animate {
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
          will-change: opacity, transform;
        }
        .scroll-animate.visible {
          opacity: 1;
          transform: translateY(0);
        }

        .store-input-search:focus {
          border-color: #F97316 !important;
          box-shadow: 0 0 0 3px rgba(249,115,22,0.08);
        }

        .store-inactive-tab:hover {
          border-color: #F97316 !important;
          background: rgba(249,115,22,0.01) !important;
        }

        .discord-footer-btn:hover {
          background: #EA580C !important;
        }

        .store-product-wrapper .btn-buy, 
        .store-product-wrapper button {
          border-radius: 10px !important;
        }
        
        div::-webkit-scrollbar { display: none; }
      `}</style>
    </>
  );
}
