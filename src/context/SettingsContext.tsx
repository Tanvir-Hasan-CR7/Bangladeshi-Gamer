import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Settings } from '../types';

interface SettingsContextType {
  settings: Settings | null;
  loading: boolean;
}

const SettingsContext = createContext<SettingsContextType>({ settings: null, loading: true });

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from('settings')
        .select('*')
        .eq('id', 'global')
        .single();
      
      if (data) {
        setSettings(data as Settings);
        applyTheme(data as Settings);
      }
      setLoading(false);
    };

    fetchSettings();

    const channel = supabase
      .channel('global-settings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings', filter: 'id=eq.global' }, (payload) => {
        const newSettings = payload.new as Settings;
        setSettings(newSettings);
        applyTheme(newSettings);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const applyTheme = (s: Settings) => {
    const primary = s.primary_color || '#9333ea'; // Default purple-600
    const secondary = s.secondary_color || '#2563eb'; // Default blue-600
    const brand1 = s.brand_color_1 || '#06b6d4'; // Default cyan-500
    const brand2 = s.brand_color_2 || '#22d3ee'; // Default cyan-400
    const rulesBorder = s.rules_border_color || '#9333ea'; // Default purple-600
    
    document.documentElement.style.setProperty('--primary-color', primary);
    document.documentElement.style.setProperty('--secondary-color', secondary);
    document.documentElement.style.setProperty('--brand-color-1', brand1);
    document.documentElement.style.setProperty('--brand-color-2', brand2);
    document.documentElement.style.setProperty('--rules-border-color', rulesBorder);
    
    const first = s.brand_name_first || '';
    const second = s.brand_name_second || '';
    const combinedName = (first + ' ' + second).trim() || s.server_name || 'Eternity Hub';
    
    document.title = combinedName;
  };

  return (
    <SettingsContext.Provider value={{ settings, loading }}>
      {children}
    </SettingsContext.Provider>
  );
};
