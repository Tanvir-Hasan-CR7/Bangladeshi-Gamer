import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { News, Settings } from '../types';
import { motion } from 'motion/react';
import { ArrowLeft, Calendar, User, Server, Copy } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';

export default function NewsDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [newsItem, setNewsItem] = useState<News | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [playerCount, setPlayerCount] = useState<number | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!id) {
      navigate('/');
      return;
    }

    // 1. Fetch the news item
    const { data: newsData, error } = await supabase
      .from('news')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !newsData) {
      console.error('Error fetching news:', error);
      navigate('/');
      return;
    }
    setNewsItem(newsData as News);

    // 2. Fetch global settings
    const { data: settingsData } = await supabase
      .from('settings')
      .select('*')
      .eq('id', 'global')
      .single();
    if (settingsData) setSettings(settingsData as Settings);

    setLoading(false);
  };

  useEffect(() => {
    fetchData();

    const newsChannel = supabase
      .channel(`news-detail-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'news', filter: `id=eq.${id}` }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(newsChannel);
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

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  if (!newsItem) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-4">
        <p className="text-slate-400 font-medium">Article not found.</p>
        <Link to="/" className="text-vortex-primary hover:underline flex items-center space-x-2">
          <ArrowLeft className="w-4 h-4" />
          <span>Go Back Home</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 space-y-0">
      
      {/* Top Banner with Server IP Background */}
      <section className="relative h-[35vh] flex items-center justify-center overflow-hidden border-b border-slate-900">
        <div className="absolute inset-0 z-0">
          <img
            src={newsItem.image_url || `https://picsum.photos/seed/${newsItem.id}/1920/1080?blur=4`}
            alt={newsItem.title}
            className="w-full h-full object-cover opacity-20"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-950/50 to-slate-950"></div>
        </div>

        <div className="relative z-10 text-center space-y-4 px-4 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-2xl md:text-4xl font-black tracking-tight text-white mb-2">
              Realm News Update
            </h1>
            <p className="text-slate-400 text-xs md:text-sm font-normal max-w-xl mx-auto">
              Stay in the loop with official server logs and patch updates!
            </p>
          </motion.div>

          {/* Copy Server IP Widget */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 scale-90"
          >
            <button
              onClick={copyIp}
              className="group relative flex items-center space-x-3 bg-slate-900 border border-slate-800/60 p-1 pr-5 rounded-full hover:border-vortex-primary transition-all duration-300"
            >
              <div className="bg-gradient-to-r from-vortex-primary to-vortex-secondary p-2 rounded-full">
                <Server className="w-4 h-4 text-white" />
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

            <div className="flex items-center space-x-2 bg-slate-950/50 border border-slate-850 px-4 py-2 rounded-full text-xs">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-white font-bold">{playerCount !== null ? playerCount : '--'}</span>
              <span className="text-slate-400 whitespace-nowrap">Players Online</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Main content grid */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
        
        {/* Navigation Link Back */}
        <div>
          <Link
            to="/"
            className="inline-flex items-center space-x-2 text-sm text-slate-400 hover:text-white transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="font-extrabold uppercase tracking-wider text-xs">Back to Main Dashboard</span>
          </Link>
        </div>

        {/* Featured Image Frame */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative h-[300px] md:h-[450px] rounded-3xl overflow-hidden border border-slate-800/80 shadow-2xl"
        >
          <img
            src={newsItem.image_url || `https://picsum.photos/seed/${newsItem.id}/1200/800`}
            alt={newsItem.title}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent"></div>
          
          {/* Metadata badges overlay at bottom left */}
          <div className="absolute bottom-6 left-6 md:left-8 flex flex-wrap gap-4 items-center">
            <div className="flex items-center space-x-2 bg-slate-950/80 border border-slate-800 px-3.5 py-1.5 rounded-xl text-xs text-white">
              <Calendar className="w-3.5 h-3.5 text-vortex-primary" />
              <span>{format(new Date(newsItem.created_at), 'MMM dd, yyyy')}</span>
            </div>
            <div className="flex items-center space-x-2 bg-slate-950/80 border border-slate-800 px-3.5 py-1.5 rounded-xl text-xs text-white">
              <User className="w-3.5 h-3.5 text-vortex-secondary" />
              <span>By {newsItem.author}</span>
            </div>
          </div>
        </motion.div>

        {/* Title & Content Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass p-8 md:p-12 rounded-3xl border-slate-800/60 shadow-2xl space-y-6"
        >
          <h2 className="text-3xl md:text-4xl font-black text-white leading-tight">
            {newsItem.title}
          </h2>

          <div className="h-px bg-slate-850"></div>

          {/* Description container displaying react markdown parser rendering */}
          <div className="text-slate-200 leading-relaxed max-w-none prose prose-invert prose-purple md:prose-lg select-text">
            <ReactMarkdown>{newsItem.content}</ReactMarkdown>
          </div>
        </motion.div>

      </section>

    </div>
  );
}
