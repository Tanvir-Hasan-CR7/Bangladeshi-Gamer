import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Staff, Rank } from '../types';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

import { useSettings } from '../context/SettingsContext';

export default function StaffPage() {
  const { settings } = useSettings();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [ranks, setRanks] = useState<Rank[]>([]);
  const [activeRank, setActiveRank] = useState<string | 'all'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data: ranksData } = await supabase
        .from('ranks')
        .select('*')
        .order('order', { ascending: true });
      
      if (ranksData) setRanks(ranksData as Rank[]);

      const { data: staffData } = await supabase
        .from('staff')
        .select('*');
      
      if (staffData) setStaff(staffData as Staff[]);
      setLoading(false);
    };

    fetchData();

    const ranksChannel = supabase.channel('ranks-staff').on('postgres_changes', { event: '*', schema: 'public', table: 'ranks' }, fetchData).subscribe();
    const staffChannel = supabase.channel('staff-staff').on('postgres_changes', { event: '*', schema: 'public', table: 'staff' }, fetchData).subscribe();

    return () => {
      supabase.removeChannel(ranksChannel);
      supabase.removeChannel(staffChannel);
    };
  }, []);

  const filteredStaff = activeRank === 'all' 
    ? staff 
    : staff.filter(s => s.rank_id === activeRank);

  // Group staff by rank for display
  const groupedStaff = ranks.map(rank => ({
    rank,
    members: filteredStaff.filter(s => s.rank_id === rank.id)
  })).filter(group => group.members.length > 0);

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
          OUR <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-blue-500">STAFF</span>
        </h1>
        <p className="text-slate-400 max-w-2xl mx-auto text-lg">
          Meet the dedicated team behind {settings?.server_name || 'Eternity Hub'}. Our staff works tirelessly to ensure the best experience for our community.
        </p>
      </div>

      {/* Rank Filter */}
      <div className="flex flex-wrap justify-center gap-3">
        <button
          onClick={() => setActiveRank('all')}
          className={cn(
            "px-6 py-2 rounded-full text-sm font-bold transition-all border",
            activeRank === 'all'
              ? "bg-purple-600 border-purple-500 text-white neon-glow-purple"
              : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
          )}
        >
          All Staff
        </button>
        {ranks.map((rank) => (
          <button
            key={rank.id}
            onClick={() => setActiveRank(rank.id)}
            className={cn(
              "px-6 py-2 rounded-full text-sm font-bold transition-all border",
              activeRank === rank.id
                ? "bg-purple-600 border-purple-500 text-white neon-glow-purple"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
            )}
          >
            {rank.name}
          </button>
        ))}
      </div>

      {/* Staff Grid */}
      <div className="space-y-20">
        {groupedStaff.length > 0 ? (
          groupedStaff.map((group) => (
            <div key={group.rank.id} className="space-y-8">
              <div className="flex items-center space-x-4">
                <h2 className="text-2xl font-bold text-white whitespace-nowrap">{group.rank.name}s</h2>
                <div className="h-px w-full bg-slate-800"></div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {group.members.map((member, i) => (
                  <motion.div
                    key={member.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="glass rounded-3xl p-6 text-center group hover:border-purple-500/50 transition-all duration-500"
                  >
                    <div className="relative mb-6 flex justify-center">
                      <div className="absolute inset-0 bg-gradient-to-b from-purple-600/20 to-transparent rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <img
                        src={(member.uuid && member.uuid.length > 10)
                          ? `https://minotar.net/body/${member.uuid}/128`
                          : `https://minotar.net/body/${member.username || member.ign}/128`}
                        alt={member.ign}
                        className="h-48 w-auto relative z-10 drop-shadow-2xl group-hover:scale-110 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://minotar.net/body/charleshot/128';
                        }}
                      />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-1">{member.ign}</h3>
                    <p className="text-purple-400 text-sm font-bold uppercase tracking-widest">{group.rank.name}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="py-20 text-center glass rounded-3xl">
            <p className="text-slate-500 italic">No staff members found for this rank.</p>
          </div>
        )}
      </div>
    </div>
  );
}
