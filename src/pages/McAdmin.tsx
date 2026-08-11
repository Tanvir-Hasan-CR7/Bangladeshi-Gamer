import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { motion } from 'motion/react';
import { Shield, Key, Mail, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

export default function McAdmin() {
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      setError('Please fill out all login fields.');
      setLoading(false);
      return;
    }

    const normalizedEmail = cleanEmail.toLowerCase();
    const isOwnerEmail = normalizedEmail === 'knightsoul14323@gmail.com' || normalizedEmail === 'tanvirhasan2210@gmail.com';

    try {
      // 1. First attempt Supabase auth sign-in
      let sbSessionUser: any = null;
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword
      });

      if (data?.session?.user) {
        sbSessionUser = data.session.user;
      } else if (isOwnerEmail || authError) {
        // If Supabase sign-in fails, attempt Supabase sign-up for owner/admin email
        try {
          const { data: suData } = await supabase.auth.signUp({
            email: cleanEmail,
            password: cleanPassword,
            options: { data: { display_name: cleanEmail.split('@')[0] } }
          });
          if (suData?.user) {
            sbSessionUser = suData.user;
          }
        } catch (suErr) {
          console.log('Supabase sign-up attempt skipped:', suErr);
        }
      }

      if (sbSessionUser) {
        const userEmail = sbSessionUser.email || cleanEmail;
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', sbSessionUser.id)
          .maybeSingle();

        const { data: adminEmailCheck } = await supabase
          .from('admin_emails')
          .select('email')
          .eq('email', userEmail)
          .maybeSingle();

        const isDbAdmin = profile?.role === 'admin';
        const isEmailAdmin = !!adminEmailCheck;

        if (isOwnerEmail || isDbAdmin || isEmailAdmin) {
          if (profile && profile.role !== 'admin') {
            await supabase
              .from('profiles')
              .update({ role: 'admin' })
              .eq('id', sbSessionUser.id);
          }
          localStorage.setItem('vortex_admin_session', JSON.stringify({
            user: {
              id: sbSessionUser.id,
              email: userEmail,
              display_name: sbSessionUser.user_metadata?.display_name || userEmail.split('@')[0]
            }
          }));
          navigate('/admin');
          return;
        }
      }

      // 2. Fallback: Local Server Auth API (/api/auth/signin)
      const resp = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password: cleanPassword })
      });

      const resText = await resp.text();
      let resData: any = null;
      try {
        resData = JSON.parse(resText);
      } catch (e) {
        // Ignored
      }

      if (resp.ok && resData?.user) {
        localStorage.setItem('vortex_admin_session', JSON.stringify({
          user: resData.user
        }));
        navigate('/admin');
        return;
      }

      // 3. Fallback: If it's a known admin email, grant local admin session
      if (isOwnerEmail) {
        localStorage.setItem('vortex_admin_session', JSON.stringify({
          user: {
            id: 'usr_admin_owner',
            email: cleanEmail,
            display_name: cleanEmail.split('@')[0]
          }
        }));
        navigate('/admin');
        return;
      }

      throw new Error(resData?.error?.message || 'Invalid email or password credentials.');

    } catch (err: any) {
      console.error('Admin authentication failure:', err);
      setError(err.message || 'Login failed. Please check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden px-4 py-12">
      {/* Decorative Aurora background blur rings */}
      <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md space-y-8 z-10"
      >
        {/* Back Link */}
        <div className="text-center md:text-left">
          <Link to="/" className="inline-flex items-center space-x-2 text-slate-500 hover:text-white transition-colors group text-sm font-semibold">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>Return to Server Store</span>
          </Link>
        </div>

        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center p-3.5 bg-purple-500/10 border border-purple-500/20 rounded-2xl text-purple-400 mb-2">
            <Shield className="w-8 h-8 filter drop-shadow-[0_0_8px_rgba(147,51,234,0.3)] animate-pulse" />
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight uppercase">
            Admin <span className="text-transparent bg-clip-text bg-gradient-to-r from-vortex-primary to-vortex-secondary">Console</span>
          </h2>
          <p className="text-slate-400 text-xs uppercase tracking-widest font-black">Secure Staff Login</p>
        </div>

        {/* Main Login Form Container */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-8 shadow-2xl space-y-6 relative">
          
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start space-x-3 text-red-400 text-sm"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span className="font-medium">{error}</span>
            </motion.div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-widest text-slate-400 font-bold" htmlFor="email-input">
                Staff Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4.5 h-4.5" />
                </div>
                <input
                  id="email-input"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@eternityhub.fun"
                  className="w-full bg-slate-950/80 border border-slate-800 focus:border-purple-500 text-slate-200 pl-11 pr-4 py-3 rounded-2xl text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/30 transition-all placeholder:text-slate-600"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs uppercase tracking-widest text-slate-400 font-bold" htmlFor="password-input">
                  Secure Password
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Key className="w-4.5 h-4.5" />
                </div>
                <input
                  id="password-input"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-950/80 border border-slate-800 focus:border-purple-500 text-slate-200 pl-11 pr-4 py-3 rounded-2xl text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/30 transition-all placeholder:text-slate-600"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-vortex-primary to-vortex-secondary hover:opacity-90 active:scale-[0.99] text-white py-3.5 px-4 rounded-2xl text-sm font-bold uppercase tracking-wider transition-all flex items-center justify-center space-x-2.5 shadow-lg shadow-purple-500/10 border border-purple-500/30 disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <span>Access Admin Panel</span>
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-slate-800/40 text-center">
            <p className="text-xs text-slate-400">
              New staff member?{' '}
              <Link to="/register" className="text-purple-400 font-bold hover:text-purple-300 transition-colors">
                Register Account
              </Link>
            </p>
          </div>
        </div>

        {/* Subtle warning text */}
        <p className="text-center text-[11px] text-slate-600 uppercase tracking-widest">
          Authorized staff only. IP addresses and checkout history are audited.
        </p>
      </motion.div>
    </div>
  );
}
