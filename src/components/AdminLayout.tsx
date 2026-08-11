import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabase';
import { Profile } from '../types';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Package, 
  Users, 
  Settings as SettingsIcon, 
  ChevronLeft,
  DollarSign,
  ArrowLeft,
  ShieldCheck,
  LogOut
} from 'lucide-react';
import { cn } from '../lib/utils';

import { useSettings } from '../context/SettingsContext';

interface Props {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: Props) {
  const { settings } = useSettings();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        let userEmail = session?.user?.email || '';
        let userId = session?.user?.id || '';
        let userDisplayName = session?.user?.user_metadata?.display_name || 'Admin';

        // Check local storage session fallback if no Supabase session
        if (!session) {
          const localSessionStr = localStorage.getItem('vortex_admin_session');
          if (localSessionStr) {
            try {
              const localSession = JSON.parse(localSessionStr);
              if (localSession?.user?.email) {
                userEmail = localSession.user.email;
                userId = localSession.user.id || 'usr_local_admin';
                userDisplayName = localSession.user.display_name || userEmail.split('@')[0];
              }
            } catch (e) {
              console.error('Error parsing local admin session:', e);
            }
          }
        }

        if (!userEmail) {
          navigate('/mcadmin');
          return;
        }

        // Check profiles
        let profileData: any = null;
        let adminCheck: any = null;

        if (session) {
          const { data: p } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();
          profileData = p;

          const { data: a } = await supabase
            .from('admin_emails')
            .select('email')
            .eq('email', userEmail)
            .maybeSingle();
          adminCheck = a;
        }

        const normalizedEmail = userEmail.toLowerCase();
        const isHardcodedAdmin = normalizedEmail === 'knightsoul14323@gmail.com' || normalizedEmail === 'tanvirhasan2210@gmail.com';
        const isDbAdmin = profileData?.role === 'admin';
        const isEmailAdmin = !!adminCheck;

        if (isHardcodedAdmin || isDbAdmin || isEmailAdmin) {
          setProfile({
            id: userId,
            email: userEmail,
            role: 'admin',
            created_at: profileData?.created_at || new Date().toISOString(),
            display_name: userDisplayName
          });
        } else {
          console.warn('Access Denied: Not authorized inside the admin panel.');
          await supabase.auth.signOut();
          localStorage.removeItem('vortex_admin_session');
          navigate('/mcadmin');
        }
      } catch (err) {
        console.error('Error during admin checking:', err);
        navigate('/mcadmin');
      } finally {
        setLoading(false);
      }
    };

    checkAdmin();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: any) => {
      if (!session) {
        navigate('/mcadmin');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const menuItems = [
    { name: 'Revenue', path: '/admin', icon: DollarSign },
    { name: 'Verify Payments', path: '/admin/verify', icon: ShieldCheck },
    { name: 'Orders', path: '/admin/orders', icon: ShoppingBag },
    { name: 'Inventory', path: '/admin/inventory', icon: Package },
    { name: 'Staff & Ranks', path: '/admin/staff', icon: Users },
    { name: 'System Settings', path: '/admin/settings', icon: SettingsIcon },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-950">
      {/* Sidebar */}
      <aside className="w-64 glass border-r border-slate-800/50 hidden md:flex flex-col fixed h-full">
        <div className="p-6">
          <Link to="/" className="flex items-center space-x-2 mb-8">
            <ArrowLeft className="w-5 h-5 text-slate-400" />
            <span className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Back to Site</span>
          </Link>
          <div className="flex items-center space-x-2 mb-10">
            <div className="w-8 h-8 rounded flex items-center justify-center overflow-hidden">
              {settings?.server_icon ? (
                <img src={settings.server_icon} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full bg-vortex-primary flex items-center justify-center">
                  <LayoutDashboard className="w-5 h-5 text-white" />
                </div>
              )}
            </div>
            <h1 className="text-lg font-bold text-white truncate">{settings?.server_name || 'Admin Center'}</h1>
          </div>

          <nav className="space-y-1">
            {menuItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className={cn(
                  "flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all",
                  location.pathname === item.path
                    ? "bg-vortex-primary/20 text-vortex-primary border border-vortex-primary/30"
                    : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.name}</span>
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-4 border-t border-slate-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5 overflow-hidden">
              <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-white font-extrabold flex-shrink-0">
                {(profile?.display_name || profile?.email || 'A')[0].toUpperCase()}
              </div>
              <div className="overflow-hidden pr-1">
                <p className="text-xs font-bold text-white truncate">{profile?.display_name || 'Admin'}</p>
                <p className="text-[10px] text-slate-500 truncate">{profile?.email || 'Loading...'}</p>
              </div>
            </div>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                navigate('/mcadmin');
              }}
              title="Sign Out"
              className="p-1.5 rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors border border-transparent hover:border-red-500/20 flex-shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar (Bottom Nav) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 glass border-t border-slate-800/50 z-50 flex justify-around items-center p-2">
        {menuItems.map((item) => (
          <Link
            key={item.name}
            to={item.path}
            className={cn(
              "p-2 rounded-lg transition-all",
              location.pathname === item.path ? "text-vortex-primary" : "text-slate-400"
            )}
          >
            <item.icon className="w-5.5 h-5.5" />
          </Link>
        ))}
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            navigate('/mcadmin');
          }}
          className="p-2 rounded-lg text-slate-400 hover:text-red-400 transition-all"
          title="Sign Out"
        >
          <LogOut className="w-5.5 h-5.5" />
        </button>
      </div>

      {/* Main Content */}
      <main className="flex-grow md:ml-64 p-4 md:p-8 pb-24 md:pb-8">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
