import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { Product, Category, Settings } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { 
  ShoppingCart, 
  Package, 
  ArrowLeft,
  ChevronRight, 
  X, 
  Copy, 
  Server, 
  Sparkles,
  Gift,
  Key,
  Gem
} from 'lucide-react';
import Notification, { NotificationType } from '../components/Notification';

export default function CategoryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [category, setCategory] = useState<Category | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [playerCount, setPlayerCount] = useState<number | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: NotificationType } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      if (!id) {
        navigate('/store');
        return;
      }

      // 1. Fetch current category
      const { data: catData } = await supabase
        .from('categories')
        .select('*')
        .eq('id', id)
        .single();
      
      if (!catData) {
        // If not found, redirect to store
        navigate('/store');
        return;
      }
      setCategory(catData as Category);

      // 2. Fetch all categories for the category modal selector
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('*')
        .order('order', { ascending: true });
      if (categoriesData) setCategories(categoriesData as Category[]);

      // 3. Fetch products in this category
      const { data: productsData } = await supabase
        .from('products')
        .select('*')
        .eq('category_id', id);
      
      if (productsData) {
        // Sort client-side so it never fails even if "order" column is missing in remote DB
        const sorted = [...productsData].sort((a: any, b: any) => {
          const orderA = a.order ?? 0;
          const orderB = b.order ?? 0;
          return orderA - orderB;
        });
        setProducts(sorted as Product[]);
      }

      // 4. Fetch settings
      const { data: settingsData } = await supabase
        .from('settings')
        .select('*')
        .eq('id', 'global')
        .single();
      if (settingsData) setSettings(settingsData as Settings);

      setLoading(false);
    };

    fetchData();

    const categoriesChannel = supabase.channel('cat-categories').on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, fetchData).subscribe();
    const productsChannel = supabase.channel('cat-products').on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, fetchData).subscribe();
    const settingsChannel = supabase.channel('cat-settings').on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, fetchData).subscribe();

    return () => {
      supabase.removeChannel(categoriesChannel);
      supabase.removeChannel(productsChannel);
      supabase.removeChannel(settingsChannel);
    };
  }, [id, navigate]);

  useEffect(() => {
    if (settings?.server_ip) {
      fetch(`https://api.mcsrvstat.us/2/${settings.server_ip}`)
        .then(res => {
          if (!res.ok) return null;
          return res.json();
        })
        .then(data => {
          if (data && data.online && data.players) {
            setPlayerCount(data.players.online);
          }
        })
        .catch(() => {
          // Ignore network/CORS failures silently
        });
    }
  }, [settings?.server_ip]);

  const copyIp = () => {
    if (settings?.server_ip) {
      navigator.clipboard.writeText(settings.server_ip);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const addToCart = async (product: Product) => {
    if (product.stock === 0) return;
    
    const cart = JSON.parse(localStorage.getItem('vortex_cart') || '[]');
    const totalCurrentQuantity = cart.reduce((acc: number, item: any) => acc + item.quantity, 0);
    if (totalCurrentQuantity >= 5) {
      setNotification({ message: 'Cannot add more items. You can only order a maximum of 5 items at once!', type: 'error' });
      return;
    }

    const existingItem = cart.find((item: any) => item.productId === product.id);
    
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: 1
      });
    }
    
    localStorage.setItem('vortex_cart', JSON.stringify(cart));
    window.dispatchEvent(new Event('cart-updated'));
    setNotification({ message: `${product.name} added to cart!`, type: 'success' });
  };

  const getCategoryFallbackIcon = (name: string) => {
    const label = name.toLowerCase();
    if (label.includes('offer') || label.includes('limited')) return <Sparkles className="w-12 h-12 text-yellow-500 animate-pulse" />;
    if (label.includes('bundle') || label.includes('package') || label.includes('crate')) return <Gift className="w-12 h-12 text-pink-500" />;
    if (label.includes('key')) return <Key className="w-12 h-12 text-cyan-400" />;
    if (label.includes('rank')) return <Sparkles className="w-12 h-12 text-yellow-400" />;
    if (label.includes('coin') || label.includes('shards') || label.includes('money')) return <Gem className="w-12 h-12 text-green-400" />;
    return <Sparkles className="w-12 h-12 text-purple-500" />;
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-0 pb-24">
      {notification && (
        <Notification 
          message={notification.message} 
          type={notification.type} 
          onClose={() => setNotification(null)}
          duration={3000}
        />
      )}

      {/* Top Banner with Server IP Background */}
      <section className="relative h-[45vh] flex items-center justify-center overflow-hidden border-b border-slate-900">
        <div className="absolute inset-0 z-0">
          <img
            src={settings?.hero_bg_url || "https://picsum.photos/seed/minecraft/1920/1080?blur=4"}
            alt="Hero Background"
            className="w-full h-full object-cover opacity-20"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-950/50 to-slate-950"></div>
        </div>

        <div className="relative z-10 text-center space-y-6 px-4 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white mb-2">
              Welcome to the official{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-amber-500">
                {settings?.server_name || 'ETERNITY HUB'}
              </span>{' '}
              Store
            </h1>
            <p className="text-slate-400 text-sm md:text-base font-normal max-w-xl mx-auto">
              Choose one of our premium ranks or bundle packs below to begin your custom survival session with extreme authority!
            </p>
          </motion.div>

          {/* Copy Server IP Widget */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <button
              onClick={copyIp}
              className="group relative flex items-center space-x-3 bg-slate-900 border border-amber-900/40 p-1 pr-5 rounded-full hover:border-yellow-500 transition-all duration-300"
            >
              <div className="bg-gradient-to-r from-yellow-500 to-amber-500 p-2 rounded-full">
                <Server className="w-4 h-4 text-slate-950" />
              </div>
              <div className="text-left leading-none">
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Click to Copy IP</p>
                <p className="text-sm font-mono text-white font-bold">{settings?.server_ip || 'PLAY.ETERNITYHUB.FUN'}</p>
              </div>
              <div className="ml-3">
                {isCopied ? (
                  <span className="text-green-500 text-xs font-bold">Copied!</span>
                ) : (
                  <Copy className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
                )}
              </div>
            </button>

            <div className="flex items-center space-x-2 bg-slate-900/50 border border-slate-800/50 px-4 py-2 rounded-full text-xs">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-white font-bold">{playerCount !== null ? playerCount : '--'}</span>
              <span className="text-slate-400 whitespace-nowrap">Players Online</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Main Content Area Grid (Sidebar on Left, Landing and Grid on Middle/Right) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* LEFT COLUMN: SIDEBAR */}
          <aside className="space-y-6">
            
            {/* BACK TO STORE BUTTON */}
            <Link
              to="/store"
              className="w-full text-left bg-slate-900 hover:bg-slate-800 border border-slate-850 p-4 rounded-3xl flex items-center space-x-3 transition-all duration-300 shadow-lg group cursor-pointer"
            >
              <div className="bg-slate-950 p-2 rounded-xl group-hover:text-yellow-400 transition-colors">
                <ArrowLeft className="w-5 h-5 text-slate-400" />
              </div>
              <div>
                <p className="text-xs font-extrabold text-white">Back to Store</p>
                <p className="text-[10px] text-slate-500 uppercase font-semibold">View Frontpage</p>
              </div>
            </Link>

            {/* 1. SELECT CATEGORY BOX BUTTON */}
            <button
              onClick={() => setIsCategoryModalOpen(true)}
              className="w-full text-left bg-gradient-to-r from-amber-950/40 via-amber-900/10 to-yellow-950/20 hover:from-amber-900/60 hover:to-yellow-900/30 border border-amber-500/20 hover:border-amber-500/50 p-5 rounded-3xl flex items-center justify-between transition-all duration-300 shadow-xl group cursor-pointer"
            >
              <div className="flex items-center space-x-4">
                <div className="bg-yellow-500/10 border border-yellow-500/25 p-3 rounded-2xl group-hover:bg-yellow-500/20 transition-colors">
                  <ShoppingCart className="w-6 h-6 text-yellow-400" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-semibold text-slate-500 tracking-widest leading-none mb-1">Click here to</p>
                  <p className="text-base font-black text-white group-hover:text-yellow-400 transition-colors">Select a category</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-yellow-400 group-hover:translate-x-1 transition-all" />
            </button>

            {/* 3. TOP PATRONS LINK */}
            <Link
              to="/patrons"
              className="block bg-gradient-to-r from-yellow-750/30 to-slate-900/60 hover:from-yellow-750/50 border border-yellow-500/25 p-5 rounded-3xl transition-all duration-300 group cursor-pointer"
            >
              <div className="flex items-center space-x-3.5">
                <div className="w-10 h-10 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Sparkles className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white group-hover:text-yellow-400 transition-colors">Top Patrons</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">View Hall of Fame</p>
                </div>
              </div>
            </Link>

          </aside>

          {/* MIDDLE / RIGHT CONTENT BLOCK */}
          <div className="lg:col-span-3 space-y-8 animate-fade-in">
            
            {/* CATEGORY TITLE & INTRO CARDS */}
            <div className="flex items-center space-x-5 py-4 border-b border-slate-900">
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/15 rounded-3xl flex items-center justify-center">
                {category?.image_url ? (
                  <img 
                    src={category.image_url} 
                    alt={category.name} 
                    className="w-14 h-14 object-contain"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  getCategoryFallbackIcon(category?.name || '')
                )}
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-yellow-500 tracking-widest leading-none mb-1">Category Page</p>
                <h2 className="text-3xl font-black text-white capitalize">
                  {category?.name}
                </h2>
              </div>
            </div>

            {/* PRODUCT GRID ITEMS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {products.length > 0 ? (
                products.map((product, i) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05 }}
                    className="glass rounded-3xl overflow-hidden flex flex-col group hover:border-yellow-500/20 transition-all duration-300"
                  >
                    <Link to={`/product/${product.id}`} className="h-44 overflow-hidden relative bg-slate-950/60 flex items-center justify-center p-6 border-b border-slate-900/60">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className={cn(
                            "max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-500",
                            product.stock === 0 && "opacity-40 grayscale"
                          )}
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <Package className="w-12 h-12 text-slate-800" />
                      )}
                      
                      {product.stock === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="bg-red-500/90 text-white text-[10px] font-black px-3 py-1 uppercase tracking-tighter rotate-[-12deg] shadow-lg">
                            Out of Stock
                          </div>
                        </div>
                      )}

                      <div className="absolute bottom-4 right-4 bg-slate-950/90 backdrop-blur-sm border border-slate-800 text-yellow-500 text-xs font-black px-2.5 py-1 rounded-lg">
                        BDT {product.price}
                      </div>
                    </Link>
                    
                    <div className="p-5 flex-grow flex flex-col justify-between">
                      <Link to={`/product/${product.id}`} className="hover:text-yellow-500 transition-colors mb-3 block">
                        <h3 className="text-base font-bold text-white leading-snug capitalize truncate">{product.name}</h3>
                      </Link>
                      
                      <div className="flex items-center justify-between mt-auto pt-2">
                        <div className={cn(
                          "text-[10px] font-bold uppercase tracking-wider",
                          product.stock === 0 ? "text-red-500" : "text-slate-500"
                        )}>
                          {product.stock === -1 ? 'Unlimited' : product.stock === 0 ? 'Sold Out' : `${product.stock} Left`}
                        </div>
                        
                        <button
                          onClick={() => addToCart(product)}
                          disabled={product.stock === 0}
                          className={cn(
                            "p-2.5 rounded-xl transition-all cursor-pointer",
                            product.stock === 0 
                              ? "bg-slate-900 text-slate-600 cursor-not-allowed opacity-50" 
                              : "bg-yellow-500 hover:bg-yellow-600 text-slate-950"
                          )}
                          title={product.stock === 0 ? "Out of Stock" : "Quick Add"}
                        >
                          <ShoppingCart className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="col-span-full py-16 text-center glass rounded-3xl">
                  <p className="text-slate-500 italic text-sm">No items found under this category at the moment.</p>
                </div>
              )}
            </div>

          </div>

        </div>
      </section>

      {/* CATEGORY POPUP DIALOG MODAL (As shown on mockup with dark grid and illustrations) */}
      <AnimatePresence>
        {isCategoryModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            {/* Background Backdrop blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCategoryModalOpen(false)}
              className="absolute inset-0 bg-slate-950/85 backdrop-blur-md"
            />

            {/* Dialog Content Frame */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative relative-z-20 w-full max-w-2xl bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl p-6 md:p-8"
            >
              
              {/* Header inside popup */}
              <div className="flex items-center justify-between mb-8 pb-3 border-b border-slate-900">
                <h3 className="text-xl md:text-2xl font-black text-white flex items-center space-x-2">
                  <ShoppingCart className="w-5 h-5 text-yellow-500" />
                  <span>Select a category</span>
                </h3>
                
                {/* Styled Red Cancel button */}
                <button
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="bg-red-500/10 hover:bg-red-500 border border-red-500/30 text-red-500 hover:text-white p-2 md:p-2.5 rounded-xl transition-all duration-300 transform hover:scale-105"
                  title="Close Selection"
                >
                  <X className="w-4 h-4 md:w-5 h-5" />
                </button>
              </div>

              {/* CATEGORIES GRID BLOCK - Renders Dynamic Categories */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 max-h-[60vh] overflow-y-auto pr-1">
                {/* Rest of the dynamic categories */}
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setIsCategoryModalOpen(false);
                      navigate(`/category/${cat.id}`);
                    }}
                    className={cn(
                      "w-full text-center p-6 bg-slate-900/40 hover:bg-slate-900 border rounded-2xl flex flex-col items-center justify-center space-y-3 transition-all duration-300 transform hover:scale-[1.02] cursor-pointer",
                      id === cat.id ? "border-yellow-500/80 bg-yellow-900/20 shadow-xl" : "border-slate-850"
                    )}
                  >
                    <div className="p-3 bg-slate-950/80 border border-slate-900 rounded-2xl flex items-center justify-center min-h-[72px] min-w-[72px]">
                      {cat.image_url ? (
                        <img 
                          src={cat.image_url} 
                          alt={cat.name} 
                          className="w-12 h-12 object-contain"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        getCategoryFallbackIcon(cat.name)
                      )}
                    </div>
                    <span className="text-sm md:text-base font-extrabold text-white capitalize">{cat.name}</span>
                  </button>
                ))}
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
