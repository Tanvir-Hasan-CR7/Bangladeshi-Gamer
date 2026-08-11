import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { News, Settings } from '../types';
import { Copy, Users, Server, ChevronRight, MessageSquare, Shield, Zap } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';

export default function Home() {
  const [news, setNews] = useState<News[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [playerCount, setPlayerCount] = useState<number | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    const fetchInitialData = async () => {
      const { data: newsData } = await supabase
        .from('news')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (newsData) setNews(newsData as News[]);

      const { data: settingsData } = await supabase
        .from('settings')
        .select('*')
        .eq('id', 'global')
        .single();
      
      if (settingsData) setSettings(settingsData as Settings);
    };

    fetchInitialData();

    // Realtime updates
    const newsChannel = supabase
      .channel('news-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'news' }, (payload) => {
        fetchInitialData(); // Refetch for simplicity
      })
      .subscribe();

    const settingsChannel = supabase
      .channel('settings-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings', filter: 'id=eq.global' }, (payload) => {
        setSettings(payload.new as Settings);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(newsChannel);
      supabase.removeChannel(settingsChannel);
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

  return (
    <div className="space-y-20 pb-20">
      {/* Hero Section */}
      <section className="relative h-[80vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src={settings?.hero_bg_url || "https://picsum.photos/seed/minecraft/1920/1080?blur=4"}
            alt="Hero Background"
            className="w-full h-full object-cover opacity-30"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-950/40 to-slate-950"></div>
        </div>

        <div className="relative z-10 text-center space-y-8 px-4 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-white mb-4">
              {settings?.server_name?.split(' ')[0] || 'ETERNITY'} <span className="text-transparent bg-clip-text bg-gradient-to-r from-vortex-primary to-vortex-secondary">{settings?.server_name?.split(' ').slice(1).join(' ') || 'HUB'}</span>
            </h1>
            <p className="text-xl md:text-2xl text-slate-400 font-medium max-w-2xl mx-auto">
              Experience the next generation of Minecraft survival. Competitive, community-driven, and purely addictive.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="flex flex-col md:flex-row items-center justify-center gap-4"
          >
            <button
              onClick={copyIp}
              className="group relative flex items-center space-x-4 bg-slate-900 border border-slate-800 p-1 pr-6 rounded-full hover:border-vortex-primary transition-all duration-300 neon-glow-purple"
            >
              <div className="bg-gradient-to-r from-vortex-primary to-vortex-secondary p-3 rounded-full">
                <Server className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Connect Now</p>
                <p className="text-lg font-mono text-white">{settings?.server_ip || 'PLAY.ETERNITYHUB.FUN'}</p>
              </div>
              <div className="ml-4">
                {isCopied ? (
                  <span className="text-green-400 text-sm font-bold">Copied!</span>
                ) : (
                  <Copy className="w-5 h-5 text-slate-500 group-hover:text-white transition-colors" />
                )}
              </div>
            </button>

            <div className="flex items-center space-x-3 bg-slate-900/50 border border-slate-800/50 px-6 py-4 rounded-full">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-white font-bold">{playerCount !== null ? playerCount : '--'}</span>
              <span className="text-slate-400 text-sm">Players Online</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: Zap, title: "Zero Lag", desc: "Our high-performance dedicated servers ensure a smooth experience for everyone." },
            { icon: Shield, title: "Fair Play", desc: "Advanced anti-cheat and active staff members keep the realm safe and competitive." },
            { icon: MessageSquare, title: "Community", desc: "Join thousands of players in our active Discord and in-game community." }
          ].map((feature, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -10 }}
              className="glass p-8 rounded-2xl space-y-4 border-slate-800/50"
            >
              <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center">
                <feature.icon className="w-6 h-6 text-purple-500" />
              </div>
              <h3 className="text-xl font-bold text-white">{feature.title}</h3>
              <p className="text-slate-400 leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* News Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">Latest News</h2>
            <p className="text-slate-400">Stay updated with the latest realm developments.</p>
          </div>
          <div className="h-px flex-grow mx-8 bg-slate-800 hidden md:block"></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {news.length > 0 ? (
            news.map((item, i) => (
              <Link key={item.id} to={`/news/${item.id}`} className="block h-full group hover:no-underline">
                <motion.article
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="glass rounded-2xl overflow-hidden flex flex-col h-full bg-slate-905 border-slate-800/40 hover:border-vortex-primary/40 transition-all duration-300"
                >
                  <div className="h-48 overflow-hidden relative">
                    <img
                      src={item.image_url || `https://picsum.photos/seed/${item.id}/600/400`}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-4 left-4 bg-vortex-primary text-white text-xs font-bold px-3 py-1 rounded-full">
                      Update
                    </div>
                  </div>
                  <div className="p-6 flex-grow flex flex-col">
                    <div className="flex items-center text-xs text-slate-500 mb-3 space-x-3">
                      <span>{format(new Date(item.created_at), 'MMM dd, yyyy')}</span>
                      <span>•</span>
                      <span>By {item.author}</span>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-4 group-hover:text-purple-400 transition-colors">
                      {item.title}
                    </h3>
                    <div className="text-slate-400 text-sm line-clamp-3 prose prose-invert prose-sm">
                      <ReactMarkdown>{item.content}</ReactMarkdown>
                    </div>
                  </div>
                </motion.article>
              </Link>
            ))
          ) : (
            <div className="col-span-full py-20 text-center glass rounded-2xl">
              <p className="text-slate-500 italic">No news articles published yet.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
