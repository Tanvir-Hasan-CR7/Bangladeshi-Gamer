import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabase';
import { Profile } from '../types';
import { Menu, X, ShoppingCart, User, LogOut, LayoutDashboard, Shield } from 'lucide-react';
import { cn } from '../lib/utils';
import { User as SupabaseUser } from '@supabase/supabase-js';

import { useSettings } from '../context/SettingsContext';

const DiscordIcon = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 127.14 96.36" 
    className={className}
    fill="currentColor"
    role="img"
    aria-label="Discord"
  >
    <path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,53.22,6.83,77.19,77.19,0,0,0,49.88,0,105.15,105.15,0,0,0,19.44,8.07C3.66,31.58-1.86,54.65,1,77.53A105.73,105.73,0,0,0,32,96.36a77.7,77.7,0,0,0,6.63-10.85,68.43,68.43,0,0,1-10.45-5c.87-.64,1.72-1.31,2.53-2a75.14,75.14,0,0,0,72.71,0c.81.71,1.66,1.38,2.53,2a68.68,68.68,0,0,1-10.45,5,77.84,77.84,0,0,0,6.63,10.85,105.73,105.73,0,0,0,31-18.83C129.87,49.27,123.63,26.47,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.83,46,53.83,53,48.72,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.24,60,73.24,53S78.41,40.36,84.69,40.36,96.07,46,96.07,53,91,65.69,84.69,65.69Z" />
  </svg>
);

interface Props {
  children: React.ReactNode;
}

export default function Layout({ children }: Props) {
  const { settings } = useSettings();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) setProfile(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      const fetchProfile = async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (data) setProfile(data as Profile);
      };

      fetchProfile();

      // Realtime profile updates
      const channel = supabase
        .channel(`profile-${user.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` }, (payload) => {
          setProfile(payload.new as Profile);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  useEffect(() => {
    const handleCartUpdate = () => {
      const cart = JSON.parse(localStorage.getItem('vortex_cart') || '[]');
      setCartCount(cart.reduce((acc: number, item: any) => acc + item.quantity, 0));
    };

    handleCartUpdate();
    window.addEventListener('cart-updated', handleCartUpdate);
    return () => window.removeEventListener('cart-updated', handleCartUpdate);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Leaderboard', path: '/leaderboard' },
    { name: 'Staff', path: '/staff' },
    { name: 'Store', path: '/store' },
    { name: 'Patrons', path: '/patrons' },
    { name: 'Rules', path: '/rules' },
    { name: 'Vote', path: '/vote' },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="sticky top-0 z-50 glass border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-2">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden">
                  {settings?.server_icon ? (
                    <img src={settings.server_icon} alt={settings.server_name || 'Logo'} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-vortex-primary to-vortex-secondary flex items-center justify-center neon-glow-purple">
                      <Shield className="w-6 h-6 text-white" />
                    </div>
                  )}
                </div>
                <span className="text-xl font-bold flex items-center">
                  {(() => {
                    const first = settings?.brand_name_first;
                    const second = settings?.brand_name_second;
                    
                    if (first || second) {
                      return (
                        <>
                          <span style={{ color: 'var(--brand-color-1)' }}>{first || ''}</span>
                          {second && <span className="ml-1" style={{ color: 'var(--brand-color-2)' }}>{second}</span>}
                        </>
                      );
                    }

                    const name = settings?.server_name || 'Eternity Hub';
                    const splitIndex = settings?.brand_name_split || 0;
                    
                    if (splitIndex > 0 && splitIndex < name.length) {
                      return (
                        <>
                          <span style={{ color: 'var(--brand-color-1)' }}>{name.substring(0, splitIndex)}</span>
                          <span style={{ color: 'var(--brand-color-2)' }}>{name.substring(splitIndex)}</span>
                        </>
                      );
                    }
                    
                    const parts = name.split(' ');
                    if (parts.length >= 2) {
                      return (
                        <>
                          <span style={{ color: 'var(--brand-color-1)' }}>{parts[0]}</span>
                          <span className="ml-1" style={{ color: 'var(--brand-color-2)' }}>{parts.slice(1).join(' ')}</span>
                        </>
                      );
                    }
                    return <span style={{ color: 'var(--brand-color-1)' }}>{name}</span>;
                  })()}
                </span>
              </Link>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                {navLinks.map((link) => (
                  <Link
                    key={link.name}
                    to={link.path}
                    className={cn(
                      "px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      location.pathname === link.path
                        ? "text-white bg-slate-800"
                        : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                    )}
                  >
                    {link.name}
                  </Link>
                ))}
              </div>
            </div>

            <div className="hidden md:flex items-center space-x-3">
              <a 
                href={settings?.discord_link || 'https://discord.gg/united'} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="p-2 text-slate-400 hover:text-[#5865F2] hover:scale-110 active:scale-95 transition-all"
                title="Join our Discord"
              >
                <DiscordIcon className="w-6 h-6" />
              </a>
              <Link to="/cart" className="relative p-2 text-slate-400 hover:text-white transition-colors">
                <ShoppingCart className="w-6 h-6" />
                {cartCount > 0 && (
                  <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-purple-600 rounded-full">
                    {cartCount}
                  </span>
                )}
              </Link>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center space-x-2">
              <a 
                href={settings?.discord_link || 'https://discord.gg/united'} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="p-2 text-slate-400 hover:text-[#5865F2] active:scale-95 transition-all"
                title="Join our Discord"
              >
                <DiscordIcon className="w-6 h-6" />
              </a>
              <Link to="/cart" className="relative p-2 text-slate-400 hover:text-white transition-colors">
                <ShoppingCart className="w-6 h-6" />
                {cartCount > 0 && (
                  <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-purple-600 rounded-full">
                    {cartCount}
                  </span>
                )}
              </Link>
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none"
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        {isMenuOpen && (
          <div className="md:hidden glass border-t border-slate-800/50">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  onClick={() => setIsMenuOpen(false)}
                  className={cn(
                    "block px-3 py-2 rounded-md text-base font-medium",
                    location.pathname === link.path
                      ? "text-white bg-slate-800"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                  )}
                >
                  {link.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>

      <main className="flex-grow">
        {children}
      </main>

      <footer className="glass border-t border-slate-800/50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                {settings?.server_icon ? (
                  <img src={settings.server_icon} alt={settings.server_name || 'Logo'} className="w-8 h-8 object-cover rounded-lg" referrerPolicy="no-referrer" />
                ) : (
                  <Shield className="w-6 h-6 text-vortex-primary" />
                )}
                <span className="text-xl font-bold flex items-center">
                  {(() => {
                    const first = settings?.brand_name_first;
                    const second = settings?.brand_name_second;
                    
                    if (first || second) {
                      return (
                        <>
                          <span style={{ color: 'var(--brand-color-1)' }}>{first || ''}</span>
                          {second && <span className="ml-1" style={{ color: 'var(--brand-color-2)' }}>{second}</span>}
                        </>
                      );
                    }

                    const name = settings?.server_name || 'Eternity Hub';
                    const splitIndex = settings?.brand_name_split || 0;
                    
                    if (splitIndex > 0 && splitIndex < name.length) {
                      return (
                        <>
                          <span style={{ color: 'var(--brand-color-1)' }}>{name.substring(0, splitIndex)}</span>
                          <span style={{ color: 'var(--brand-color-2)' }}>{name.substring(splitIndex)}</span>
                        </>
                      );
                    }
                    
                    const parts = name.split(' ');
                    if (parts.length >= 2) {
                      return (
                        <>
                          <span style={{ color: 'var(--brand-color-1)' }}>{parts[0]}</span>
                          <span className="ml-1" style={{ color: 'var(--brand-color-2)' }}>{parts.slice(1).join(' ')}</span>
                        </>
                      );
                    }
                    return <span style={{ color: 'var(--brand-color-1)' }}>{name}</span>;
                  })()}
                </span>
              </div>
              <p className="text-slate-400 text-sm">
                The ultimate Minecraft experience. Join our community and start your adventure today.
              </p>
            </div>
            <div>
              <h3 className="text-white font-bold mb-4">Quick Links</h3>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><Link to="/leaderboard" className="hover:text-white transition-colors">Server Leaderboard</Link></li>
                <li><Link to="/staff" className="hover:text-white transition-colors">Staff Directory</Link></li>
                <li><Link to="/store" className="hover:text-white transition-colors">Server Store</Link></li>
                <li><Link to="/patrons" className="hover:text-white transition-colors">Top Patrons</Link></li>
                <li><Link to="/rules" className="hover:text-white transition-colors">Server Rules</Link></li>
                <li><Link to="/vote" className="hover:text-white transition-colors">Vote for Us</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-bold mb-4">Legal</h3>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><p className="text-xs mt-4">Not an official Minecraft product. Not approved by or associated with Mojang or Microsoft.</p></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-slate-800/50 text-center text-slate-500 text-xs">
            &copy; {new Date().getFullYear()} {settings?.server_name || 'Eternity Hub'} Network. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
