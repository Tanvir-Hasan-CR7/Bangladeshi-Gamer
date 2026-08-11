import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { motion } from 'motion/react';
import { useSettings } from '../context/SettingsContext';
import { Trophy, Shield, Heart, Sparkles, ShoppingBag } from 'lucide-react';

interface Purchase {
  id: string;
  username: string;
  rank_name: string;
  amount_paid: number;
  purchase_date: string;
}

export default function PatronsPage() {
  const { settings } = useSettings();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPurchases = async () => {
      try {
        const { data, error } = await supabase
          .from('purchases')
          .select('*')
          .eq('status', 'approved')
          .order('purchase_date', { ascending: false });

        if (data) {
          // Normalize and lowercase username strictly
          const normalized = (data as any[]).map(p => ({
            ...p,
            username: (p.username || '').toLowerCase()
          }));
          setPurchases(normalized);
        }
      } catch (err) {
        console.error('Error fetching purchases:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPurchases();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  // Calculate statistics for the top supporters to highlight them
  const contributorSummary = purchases.reduce((acc, curr) => {
    acc[curr.username] = {
      username: curr.username,
      totalPaid: (acc[curr.username]?.totalPaid || 0) + curr.amount_paid,
      latestRank: curr.rank_name,
      purchaseCount: (acc[curr.username]?.purchaseCount || 0) + 1
    };
    return acc;
  }, {} as Record<string, { username: string; totalPaid: number; latestRank: string; purchaseCount: number }>);

  const topSupporters = Object.values(contributorSummary)
    .sort((a, b) => b.totalPaid - a.totalPaid)
    .slice(0, 3);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 space-y-20">
      
      {/* Visual Header */}
      <div className="text-center space-y-6 max-w-4xl mx-auto">
        <div className="inline-flex items-center space-x-2 bg-purple-500/10 border border-purple-500/30 px-4 py-1.5 rounded-full text-purple-400 text-xs font-black uppercase tracking-widest">
          <Heart className="w-3.5 h-3.5 text-purple-500 animate-pulse fill-purple-500" />
          <span>Wall of Honor</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight">
          SERVER <span className="text-transparent bg-clip-text bg-gradient-to-r from-vortex-primary to-vortex-secondary">PATRONS</span>
        </h1>
        <p className="text-slate-400 text-lg leading-relaxed">
          No signups, no logins. Just custom Minecraft players. We track our supporters strictly by their in-game Minecraft Username, updating instantly.
        </p>
      </div>

      {/* Top 3 Supporters Hall of Fame (Podium layout) */}
      {topSupporters.length > 0 && (
        <div className="space-y-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white flex items-center justify-center space-x-3">
              <Trophy className="w-6 h-6 text-yellow-500" />
              <span>Legendary Champions</span>
            </h2>
            <p className="text-slate-500 text-xs mt-1 uppercase tracking-widest">Calculated by total contribution</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto pt-6 items-end">
            
            {/* Row 2 (Second Place) */}
            {topSupporters.length >= 2 && (
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="order-2 md:order-1"
              >
                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-8 text-center space-y-5 relative group hover:border-purple-500/40 transition-all duration-300">
                  <div className="absolute -top-5 left-1/2 -custom-translate-x-1/2 bg-slate-900 border border-slate-700 px-4 py-1 rounded-full text-slate-400 text-xs font-extrabold shadow-lg">
                    #2 Supporter
                  </div>
                  <div className="flex justify-center pt-2">
                    <img 
                      src={`https://mc-heads.net/avatar/${topSupporters[1].username}`} 
                      alt={topSupporters[1].username}
                      className="w-16 h-16 rounded-2xl drop-shadow-2xl group-hover:scale-110 transition-transform duration-300 bg-slate-950 border border-white/10"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://mc-heads.net/avatar/mhf_steve';
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-2xl font-black text-white hover:text-purple-400 transition-colors uppercase">{topSupporters[1].username}</h3>
                    <div className="inline-block bg-slate-900/60 text-slate-300 text-xs px-3 py-1 rounded-full border border-slate-800">
                      Purchased <span className="text-white font-bold">{topSupporters[1].latestRank}</span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-white/5">
                    <p className="text-slate-400 text-xs">Total Support</p>
                    <p className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">{topSupporters[1].totalPaid} BDT</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Row 1 (First Place) */}
            {topSupporters.length >= 1 && (
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="order-1 md:order-2 scale-100 md:scale-105 z-10"
              >
                <div className="bg-white/5 backdrop-blur-md border-2 border-yellow-500/40 rounded-3xl p-10 text-center space-y-6 relative group hover:border-yellow-500/70 transition-all duration-300 shadow-2xl shadow-yellow-500/10">
                  <div className="absolute -top-5 left-1/2 -custom-translate-x-1/2 bg-yellow-500 text-slate-950 px-5 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow-lg">
                    ✨ Top Donor
                  </div>
                  <div className="flex justify-center pt-2">
                    <img 
                      src={`https://mc-heads.net/avatar/${topSupporters[0].username}`} 
                      alt={topSupporters[0].username}
                      className="w-20 h-20 rounded-3xl drop-shadow-2xl group-hover:scale-110 transition-transform duration-300 bg-slate-950 border-2 border-yellow-500/30"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://mc-heads.net/avatar/mhf_steve';
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-3xl font-black text-white hover:text-yellow-400 transition-colors uppercase">{topSupporters[0].username}</h3>
                    <div className="inline-block bg-yellow-500/10 text-yellow-400 text-xs px-4 py-1.5 rounded-full border border-yellow-500/20 font-black">
                      👑 {topSupporters[0].latestRank}
                    </div>
                  </div>
                  <div className="pt-2 border-t border-white/5">
                    <p className="text-slate-400 text-xs">Total Support</p>
                    <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">{topSupporters[0].totalPaid} BDT</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Row 3 (Third Place) */}
            {topSupporters.length >= 3 && (
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="order-3"
              >
                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-8 text-center space-y-5 relative group hover:border-purple-500/40 transition-all duration-300">
                  <div className="absolute -top-5 left-1/2 -custom-translate-x-1/2 bg-slate-900 border border-slate-700 px-4 py-1 rounded-full text-slate-500 text-xs font-extrabold shadow-lg">
                    #3 Supporter
                  </div>
                  <div className="flex justify-center pt-2">
                    <img 
                      src={`https://mc-heads.net/avatar/${topSupporters[2].username}`} 
                      alt={topSupporters[2].username}
                      className="w-16 h-16 rounded-2xl drop-shadow-2xl group-hover:scale-110 transition-transform duration-300 bg-slate-950 border border-white/10"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://mc-heads.net/avatar/mhf_steve';
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-2xl font-black text-white hover:text-purple-400 transition-colors uppercase">{topSupporters[2].username}</h3>
                    <div className="inline-block bg-slate-900/60 text-slate-300 text-xs px-3 py-1 rounded-full border border-slate-800">
                      Purchased <span className="text-white font-bold">{topSupporters[2].latestRank}</span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-white/5">
                    <p className="text-slate-400 text-xs">Total Support</p>
                    <p className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">{topSupporters[2].totalPaid} BDT</p>
                  </div>
                </div>
              </motion.div>
            )}

          </div>
        </div>
      )}

      {/* Grid of All Purchases / Recent Supporter Purchases */}
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <span>Recent Contributions</span>
            </h2>
            <p className="text-slate-500 text-xs uppercase tracking-widest">Real-time status updates</p>
          </div>
          <div className="text-slate-400 text-sm font-semibold">
            Showing <span className="text-white font-bold">{purchases.length}</span> active purchases
          </div>
        </div>

        {purchases.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {purchases.map((purchase, index) => (
              <motion.div
                key={purchase.id}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: Math.min(index * 0.05, 0.4) }}
                className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-2xl flex items-center justify-between group hover:border-purple-500/35 transition-all duration-300"
              >
                <div className="flex items-center space-x-4">
                  {/* Free micro Avatar service as requested strictly inside img tag next to name */}
                  <div className="relative">
                    <img 
                      src={`https://mc-heads.net/avatar/${purchase.username}`} 
                      alt={purchase.username}
                      className="w-12 h-12 rounded-xl bg-slate-950 border border-white/5 object-cover group-hover:scale-105 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://mc-heads.net/avatar/mhf_steve';
                      }}
                    />
                    <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                  </div>
                  <div>
                    <h4 className="text-white font-bold uppercase tracking-tight group-hover:text-purple-400 transition-colors">
                      {purchase.username}
                    </h4>
                    <span className="text-xs text-purple-400 font-extrabold flex items-center space-x-1">
                      <Shield className="w-3.5 h-3.5 text-purple-400 inline" />
                      <span>{purchase.rank_name}</span>
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-sm font-black text-white bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
                    {purchase.amount_paid} BDT
                  </span>
                  <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-tighter">
                    {new Date(purchase.purchase_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="bg-white/5 backdrop-blur-md border border-white/10 py-16 rounded-3xl text-center space-y-6">
            <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mx-auto border border-white/5">
              <ShoppingBag className="w-10 h-10 text-slate-700" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-white">No active purchases yet</h3>
              <p className="text-slate-500 max-w-sm mx-auto">
                All guest checkout purchases will appear on this wall instantly. Be the first to upgrade!
              </p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
