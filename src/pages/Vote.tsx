import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { VoteLink } from '../types';
import { motion } from 'motion/react';
import { ThumbsUp, ExternalLink, Shield, Zap, Gift } from 'lucide-react';

export default function Vote() {
  const [voteLinks, setVoteLinks] = useState<VoteLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVoteLinks = async () => {
      const { data } = await supabase
        .from('vote_links')
        .select('*');
      
      if (data) setVoteLinks(data as VoteLink[]);
      setLoading(false);
    };

    fetchVoteLinks();

    const channel = supabase
      .channel('vote-links-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vote_links' }, fetchVoteLinks)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 space-y-16">
      <div className="text-center space-y-4">
        <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight">
          VOTE FOR <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-blue-500">US</span>
        </h1>
        <p className="text-slate-400 max-w-2xl mx-auto text-lg">
          Help us grow and get rewarded! Voting for our server helps us reach more players and gives you awesome in-game perks.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Rewards Section */}
        <div className="lg:col-span-1 space-y-8">
          <div className="glass p-8 rounded-3xl space-y-6 border-slate-800/50">
            <h2 className="text-2xl font-bold text-white flex items-center space-x-3">
              <Gift className="w-6 h-6 text-purple-500" />
              <span>Voting Rewards</span>
            </h2>
            <div className="space-y-4">
              {[
                { icon: Zap, title: "Vote Keys", desc: "Get 1x Vote Key for every 5 votes." },
                { icon: Shield, title: "In-game Cash", desc: "Earn $500 in-game currency per vote." },
                { icon: ThumbsUp, title: "Rank Points", desc: "Climb the voter leaderboard for monthly prizes." }
              ].map((reward, i) => (
                <div key={i} className="flex items-start space-x-4 p-4 bg-slate-900/50 rounded-2xl border border-slate-800/50">
                  <div className="bg-slate-800 p-2 rounded-lg mt-1">
                    <reward.icon className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-sm">{reward.title}</h3>
                    <p className="text-slate-500 text-xs leading-relaxed">{reward.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Voting Links */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {voteLinks.length > 0 ? (
              voteLinks.map((link, i) => (
                <motion.a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="glass p-8 rounded-3xl flex items-center justify-between group hover:border-purple-500/50 transition-all duration-500"
                >
                  <div className="space-y-1">
                    <h3 className="text-xl font-bold text-white group-hover:text-purple-400 transition-colors">{link.name}</h3>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Click to Vote</p>
                  </div>
                  <div className="bg-slate-900 p-4 rounded-2xl group-hover:bg-purple-600 transition-all duration-500 neon-glow-purple">
                    <ExternalLink className="w-6 h-6 text-slate-400 group-hover:text-white transition-colors" />
                  </div>
                </motion.a>
              ))
            ) : (
              <div className="col-span-full py-20 text-center glass rounded-3xl">
                <p className="text-slate-500 italic">No voting links available at the moment.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
