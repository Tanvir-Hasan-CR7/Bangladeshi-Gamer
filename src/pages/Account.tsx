import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Profile, Order } from '../types';
import { User, Lock, ShoppingBag, CheckCircle, Clock, XCircle, LogOut, AlertCircle, Save } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';

export default function Account() {
  const { settings } = useSettings();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAccountData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/login');
        return;
      }

      setUserEmail(session.user.email || '');

      // Fetch Profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();
      
      if (profileData) {
        setProfile(profileData as Profile);
        setDisplayName(profileData.display_name || session.user.user_metadata?.display_name || '');
      } else {
        // Fallback for missing profile
        const fallbackProfile: Profile = {
          id: session.user.id,
          email: session.user.email || '',
          role: 'user',
          created_at: new Date().toISOString(),
          display_name: session.user.user_metadata?.display_name || ''
        };
        setProfile(fallbackProfile);
        setDisplayName(fallbackProfile.display_name || '');
      }

      // Fetch Orders
      const { data: ordersData } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      
      if (ordersData) setOrders(ordersData as Order[]);
      
      setLoading(false);
    };

    fetchAccountData();
  }, [navigate]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateStatus('saving');
    setErrorMessage('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .upsert({ 
          id: session.user.id, 
          email: session.user.email,
          display_name: displayName 
        });

      if (error) throw error;
      
      setUpdateStatus('saved');
      setTimeout(() => setUpdateStatus('idle'), 2000);
    } catch (err: any) {
      setUpdateStatus('error');
      setErrorMessage(err.message);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }

    setUpdateStatus('saving');
    setErrorMessage('');

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      
      setNewPassword('');
      setConfirmPassword('');
      setUpdateStatus('saved');
      setTimeout(() => setUpdateStatus('idle'), 2000);
    } catch (err: any) {
      setUpdateStatus('error');
      setErrorMessage(err.message);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 space-y-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-black text-white tracking-tight">MY <span className="text-vortex-primary">ACCOUNT</span></h1>
          <p className="text-slate-400">Manage your profile, security, and view your order history.</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center justify-center space-x-2 bg-red-600/10 hover:bg-red-600/20 text-red-500 border border-red-500/30 px-6 py-3 rounded-xl font-bold transition-all"
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Left Column: Profile & Security */}
        <div className="lg:col-span-1 space-y-8">
          {/* Profile Settings */}
          <div className="glass p-8 rounded-3xl border-slate-800/50 space-y-6">
            <h2 className="text-xl font-bold text-white flex items-center space-x-3">
              <User className="w-6 h-6 text-vortex-primary" />
              <span>Profile Settings</span>
            </h2>
            
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Email Address</label>
                <input
                  disabled
                  type="text"
                  value={profile?.email || userEmail || ''}
                  className="w-full bg-slate-950/50 border border-slate-800/50 rounded-xl px-4 py-3 text-slate-500 cursor-not-allowed"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Display Name</label>
                <input
                  required
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-vortex-primary transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={updateStatus === 'saving'}
                className="w-full flex items-center justify-center space-x-2 bg-vortex-primary hover:opacity-90 text-white font-bold py-3 rounded-xl transition-all"
              >
                {updateStatus === 'saving' ? 'Saving...' : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Update Profile</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Security Settings */}
          <div className="glass p-8 rounded-3xl border-slate-800/50 space-y-6">
            <h2 className="text-xl font-bold text-white flex items-center space-x-3">
              <Lock className="w-6 h-6 text-vortex-secondary" />
              <span>Security</span>
            </h2>
            
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">New Password</label>
                <input
                  required
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-vortex-secondary transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Confirm Password</label>
                <input
                  required
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-vortex-secondary transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={updateStatus === 'saving'}
                className="w-full bg-vortex-secondary hover:opacity-90 text-white font-bold py-3 rounded-xl transition-all"
              >
                {updateStatus === 'saving' ? 'Updating...' : 'Change Password'}
              </button>
            </form>
          </div>

          {errorMessage && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-3 rounded-xl flex items-center space-x-3 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
          
          {updateStatus === 'saved' && (
            <div className="bg-green-500/10 border border-green-500/50 text-green-500 px-4 py-3 rounded-xl flex items-center space-x-3 text-sm">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <span>Changes saved successfully!</span>
            </div>
          )}
        </div>

        {/* Right Column: Purchase History */}
        <div className="lg:col-span-2 space-y-8">
          <div className="glass p-8 rounded-3xl border-slate-800/50 space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white flex items-center space-x-3">
                <ShoppingBag className="w-7 h-7 text-vortex-primary" />
                <span>Purchase History</span>
              </h2>
              <span className="text-slate-500 text-sm font-medium">{orders.length} Orders</span>
            </div>

            <div className="space-y-4">
              {orders.length > 0 ? (
                orders.map((order) => (
                  <div key={order.id} className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center space-x-4">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center",
                          order.status === 'verified' ? "bg-green-500/10 text-green-500" : 
                          "bg-yellow-500/10 text-yellow-500"
                        )}>
                          {order.status === 'verified' ? <CheckCircle className="w-5 h-5" /> : 
                           <Clock className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="text-white font-bold">{order.ign}</p>
                          <p className="text-xs text-slate-500 font-mono">{order.transaction_id}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-white">{order.total_amount} BDT</p>
                        <p className="text-xs text-slate-500">{format(new Date(order.created_at), 'MMM dd, yyyy')}</p>
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t border-slate-800/30 flex flex-wrap items-center justify-between gap-4">
                      <div className="flex flex-wrap gap-2">
                        {order.items.map((item, i) => (
                          <span key={i} className="bg-slate-800 text-slate-400 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md">
                            {item.name} x{item.quantity}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-20 text-center">
                  <ShoppingBag className="w-12 h-12 text-slate-800 mx-auto mb-4" />
                  <p className="text-slate-500 italic">You haven't made any purchases yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
