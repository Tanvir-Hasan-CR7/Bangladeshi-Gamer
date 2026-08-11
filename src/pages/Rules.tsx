import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { motion } from 'motion/react';
import { useSettings } from '../context/SettingsContext';
import { Shield, List } from 'lucide-react';
import { Rule } from '../types';

export default function RulesPage() {
  const { settings } = useSettings();
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRules = async () => {
      const { data, error } = await supabase
        .from('rules')
        .select('*')
        .order('order', { ascending: true });

      if (data) {
        setRules(data as Rule[]);
      }
      setLoading(false);
    };

    fetchRules();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  const borderColor = settings?.rules_border_color || '#9333ea';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 space-y-16">
      <div className="relative rounded-[3rem] overflow-hidden bg-slate-900 border border-slate-800/50 min-h-[400px] flex items-center justify-center text-center p-8">
        {settings?.rules_bg_url && (
          <div className="absolute inset-0 z-0">
            <img 
              src={settings.rules_bg_url} 
              alt="Rules Background" 
              className="w-full h-full object-cover opacity-30"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent"></div>
          </div>
        )}
        
        <div className="relative z-10 space-y-4 max-w-3xl">
          <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight">
            SERVER <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-500">RULES</span>
          </h1>
          <p className="text-slate-400 text-lg">
            Please follow our community guidelines to ensure a fair and enjoyable experience for everyone on {settings?.server_name || 'Eternity Hub'}.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
        {rules.map((rule, index) => (
          <motion.div
            key={rule.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            className="relative group"
          >
            {/* Gradient Border Effect */}
            <div 
              className="absolute -inset-[1px] rounded-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-500"
              style={{
                background: `linear-gradient(to bottom right, ${borderColor}, transparent, ${borderColor})`
              }}
            ></div>
            
            <div className="relative glass rounded-3xl p-8 h-full flex flex-col items-center text-center space-y-4 border-none">
              <div 
                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-2"
                style={{ backgroundColor: `${borderColor}20`, border: `1px solid ${borderColor}40` }}
              >
                <Shield className="w-6 h-6" style={{ color: borderColor }} />
              </div>
              <h3 className="text-2xl font-bold text-white tracking-tight">{rule.title}</h3>
              <p className="text-slate-400 leading-relaxed">
                {rule.description}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {rules.length === 0 && (
        <div className="glass rounded-[3rem] p-20 text-center space-y-6">
          <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mx-auto">
            <List className="w-10 h-10 text-slate-700" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-white">No Rules Defined</h3>
            <p className="text-slate-500 max-w-md mx-auto">
              The server rules haven't been set up yet. Please check back later.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
