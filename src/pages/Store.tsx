import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Category, Settings } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { 
  ShoppingCart, 
  ChevronRight, 
  X, 
  Copy, 
  Server, 
  Sparkles, 
  Gift, 
  Key, 
  Gem
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import Notification, { NotificationType } from '../components/Notification';

export default function Store() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [playerCount, setPlayerCount] = useState<number | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: NotificationType } | null>(null);
  const [topCustomer, setTopCustomer] = useState<{ ign: string; total: number } | null>(null);
  const [recentPurchasers, setRecentPurchasers] = useState<string[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      // 1. Fetch categories
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('*')
        .order('order', { ascending: true });
      
      if (categoriesData) setCategories(categoriesData as Category[]);

      // 2. Fetch settings
      const { data: settingsData } = await supabase
        .from('settings')
        .select('*')
        .eq('id', 'global')
        .single();
      if (settingsData) setSettings(settingsData as Settings);

      // 3. Fetch real approved purchases for Top Customer & Recent Payments
      try {
        const { data: purchasesData } = await supabase
          .from('purchases')
          .select('*')
          .eq('status', 'approved')
          .order('purchase_date', { ascending: false });

        if (purchasesData && purchasesData.length > 0) {
          // Calculate top spender
          const spendingMap: Record<string, number> = {};
          purchasesData.forEach((p: any) => {
            const username = p.username || '';
            if (username) {
              spendingMap[username] = (spendingMap[username] || 0) + (p.amount_paid || 0);
            }
          });

          let maxSpender = '';
          let maxSpent = 0;
          Object.entries(spendingMap).forEach(([user, total]) => {
            if (total > maxSpent) {
              maxSpent = total;
              maxSpender = user;
            }
          });

          if (maxSpender) {
            setTopCustomer({ ign: maxSpender, total: maxSpent });
          } else {
            setTopCustomer(null);
          }

          // Calculate unique recent purchasers
          const uniquePurchasers: string[] = [];
          purchasesData.forEach((p: any) => {
            const username = p.username || '';
            if (username && !uniquePurchasers.includes(username)) {
              uniquePurchasers.push(username);
            }
          });
          setRecentPurchasers(uniquePurchasers.slice(0, 12));
        } else {
          setTopCustomer(null);
          setRecentPurchasers([]);
        }
      } catch (err) {
        console.error('Error fetching real buyers:', err);
      }

      setLoading(false);
    };

    fetchData();

    const categoriesChannel = supabase.channel('store-categories').on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, fetchData).subscribe();
    const settingsChannel = supabase.channel('store-settings').on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, fetchData).subscribe();
    const purchasesChannel = supabase.channel('store-purchases').on('postgres_changes', { event: '*', schema: 'public', table: 'purchases' }, fetchData).subscribe();

    return () => {
      supabase.removeChannel(categoriesChannel);
      supabase.removeChannel(settingsChannel);
      supabase.removeChannel(purchasesChannel);
    };
  }, []);

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

            <div className="flex items-center space-x-2 bg-slate-950/50 border border-slate-800/50 px-4 py-2 rounded-full text-xs">
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

            {/* 2. TOP CUSTOMER WIDGET */}
            {topCustomer && (
              <div className="glass p-5 rounded-3xl border-slate-800/50 space-y-4">
                <p className="text-[10px] font-bold text-yellow-500 uppercase tracking-widest border-b border-slate-800 pb-2">Top Spender</p>
                <div className="flex items-center space-x-3.5">
                  <img
                    src={`https://mc-heads.net/avatar/${topCustomer.ign}/44`}
                    alt={topCustomer.ign}
                    className="w-11 h-11 rounded-xl bg-slate-950 border border-slate-850 p-1"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://mc-heads.net/avatar/mhf_steve/44';
                    }}
                  />
                  <div>
                    <h4 className="text-white font-bold leading-none mb-1 text-sm md:text-base uppercase truncate max-w-[150px]">{topCustomer.ign}</h4>
                    <p className="text-[10px] text-slate-500 font-medium">Contributed <span className="text-yellow-500 font-bold">{topCustomer.total} BDT</span></p>
                  </div>
                </div>
              </div>
            )}

            {/* 3. RECENT PAYMENTS */}
            {recentPurchasers.length > 0 && (
              <div className="glass p-5 rounded-3xl border-slate-800/50 space-y-4">
                <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest border-b border-slate-800 pb-2">Recent Payments</p>
                <div className="grid grid-cols-6 gap-2">
                  {recentPurchasers.map((ign, index) => (
                    <div 
                      key={index} 
                      className="group relative flex items-center justify-center p-0.5"
                    >
                      <img
                        src={`https://mc-heads.net/avatar/${ign}/32`}
                        alt={ign}
                        title={ign}
                        className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-900 group-hover:border-yellow-500 group-hover:scale-105 transition-all cursor-pointer"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://mc-heads.net/avatar/mhf_steve/32';
                        }}
                      />
                      {/* Tooltip */}
                      <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 bg-slate-950 border border-slate-800 text-[10px] text-white px-2 py-1 rounded font-mono z-20 whitespace-nowrap shadow-2xl transition-all">
                        {ign}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. TOP PATRONS LINK */}
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
          <div className="lg:col-span-3 space-y-12">
            
            <div className="space-y-8">
              {/* Custom Banner Block */}
              <div className="border-[2px] border-amber-500/10 rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl">
                <img
                  src={settings?.store_banner_url || "https://picsum.photos/seed/shop/1200/400?blur=1"}
                  alt="Store Banner"
                  className="w-full object-cover max-h-80 md:max-h-96"
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Elegant Welcome Title card */}
              <div className="glass p-8 rounded-3xl border-slate-800/55 space-y-6">
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-bold text-yellow-500 tracking-wider">Welcome to the Official Store</span>
                  <h2 className="text-2xl md:text-3xl font-black text-white">
                    {settings?.store_welcome_title || `${settings?.server_name || 'ETERNITY'} SMP Store`}
                  </h2>
                </div>
                
                {settings?.store_welcome_description ? (
                  <div className="text-slate-300 text-sm md:text-base leading-relaxed prose prose-invert max-w-full">
                    <ReactMarkdown>{settings.store_welcome_description}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="text-slate-300 space-y-6 text-sm md:text-base">
                    <p>
                      Welcome to the official Store! We are incredibly thankful to have you check out our server store. Your kind support allows us to do what we love and that is making brand new, custom content for you and hosting events with prize pools. Thank you for your support!
                    </p>
                    
                    <div className="space-y-2">
                      <h4 className="text-yellow-500 font-extrabold text-xs uppercase tracking-widest">Refund Policy</h4>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        All payments are final and non-refundable. Attempting a chargeback or opening a fraud dispute will result in an immediate and permanent IP ban from the entire Minecraft Server and Discord.
                      </p>
                    </div>
                  </div>
                )}
              </div>
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
                      "border-slate-850"
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
