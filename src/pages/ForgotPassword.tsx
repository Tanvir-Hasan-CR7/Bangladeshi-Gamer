import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Mail, Lock, User, ArrowRight, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';
import { getBaseApiUrl } from '../supabase';

export default function ForgotPassword() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();

  // Handle Step 1: Request code
  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');
    setLoading(true);

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim();

    if (!cleanUsername || !cleanEmail) {
      setError('Please fill in both fields.');
      setLoading(false);
      return;
    }

    try {
      // 1. Try to call the actual backend API endpoint
      const response = await fetch(`${getBaseApiUrl()}/api/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: cleanUsername, email: cleanEmail }),
      });

      const result = await response.json().catch(() => ({}));
      
      if (response.ok) {
        setInfoMessage(result.message || `A verification code was sent to ${cleanEmail}`);
        setStep(2);
      } else {
        // --- Fallback client-only simulation (for full preview fidelity) ---
        // Let's check our local storage database to see if this user exists
        const localUsers = JSON.parse(localStorage.getItem('local_users') || '[]');
        const userExists = localUsers.some((u: any) => u.email.toLowerCase() === cleanUsername || u.display_name.toLowerCase() === cleanUsername);
        
        if (userExists) {
          // Generate simulated token
          const simulatedCode = Math.floor(100000 + Math.random() * 900000).toString();
          localStorage.setItem(`reset_${cleanUsername}`, JSON.stringify({
            token: simulatedCode,
            expires: Date.now() + 15 * 60 * 1000,
            email: cleanEmail
          }));
          
          console.log(`[SIMULATED EMAIL SENT to ${cleanEmail}] Your reset token for ${cleanUsername} is: ${simulatedCode}`);
          setInfoMessage(`[DEMO] A simulated 6-digit code was sent to ${cleanEmail}. Check your browser developer console!`);
          setStep(2);
        } else {
          throw new Error(result.error || `Minecraft Username "${cleanUsername}" is not registered on this server.`);
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to send verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Step 2: Reset password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const cleanUsername = username.trim().toLowerCase();
    const cleanToken = token.trim();

    if (!cleanToken || cleanToken.length !== 6) {
      setError('Please enter a valid 6-digit code.');
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    try {
      // 1. Try to call the actual backend API endpoint
      const response = await fetch(`${getBaseApiUrl()}/api/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: cleanUsername, token: cleanToken, newPassword }),
      });

      const result = await response.json().catch(() => ({}));

      if (response.ok) {
        setStep(3);
      } else {
        // --- Fallback client-only simulation (for full preview fidelity) ---
        const storedResetDataString = localStorage.getItem(`reset_${cleanUsername}`);
        if (!storedResetDataString) {
          throw new Error(result.error || 'Invalid or expired code.');
        }

        const resetData = JSON.parse(storedResetDataString);
        if (resetData.token !== cleanToken || Date.now() > resetData.expires) {
          throw new Error(result.error || 'The code is incorrect or has expired.');
        }

        // Apply state change in local storage mock database as fallback
        const localUsers = JSON.parse(localStorage.getItem('local_users') || '[]');
        const idx = localUsers.findIndex((u: any) => u.email.toLowerCase() === cleanUsername || u.display_name.toLowerCase() === cleanUsername);
        
        if (idx !== -1) {
          localUsers[idx].password = newPassword;
          localStorage.setItem('local_users', JSON.stringify(localUsers));
          
          // Clear token
          localStorage.removeItem(`reset_${cleanUsername}`);
          setStep(3);
        } else {
          throw new Error('User not found in local records.');
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-gradient-to-br from-vortex-primary to-vortex-secondary rounded-2xl flex items-center justify-center neon-glow-purple mb-6">
            <Shield className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">
            Reset Password
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Recover access to your Minecraft server account.
          </p>
        </div>

        <div className="glass p-8 rounded-3xl border-slate-800/50 shadow-2xl relative">
          {/* Main error display */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-3 rounded-xl flex items-center space-x-3 text-sm mb-6 animate-fade-in">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Info messages */}
          {infoMessage && step === 2 && (
            <div className="bg-purple-500/10 border border-purple-500/30 text-purple-300 px-4 py-3 rounded-xl flex items-start space-x-3 text-sm mb-6">
              <RefreshCw className="w-5 h-5 flex-shrink-0 mt-0.5 animate-spin" />
              <span>{infoMessage}</span>
            </div>
          )}

          {/* STEP 1: Enter Username & Email */}
          {step === 1 && (
            <form onSubmit={handleRequestCode} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">
                  Minecraft Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-slate-500" />
                  </div>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    placeholder="Steve"
                  />
                </div>
                <p className="text-xxs text-slate-500 ml-1">
                  * Must match your in-game lowercase nickname strictly.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">
                  Registered Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-500" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    placeholder="steve@minecraft.net"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-all neon-glow-purple disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>Send Verification Code</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* STEP 2: Verify Token & New Password */}
          {step === 2 && (
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">
                  6-Digit Verification Code
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={token}
                  onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
                  className="block w-full text-center tracking-[1em] text-xl font-bold font-mono py-3 bg-slate-950 border border-slate-800 rounded-xl text-vortex-secondary focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="000000"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-500" />
                  </div>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-500" />
                  </div>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-1/3 border border-slate-800 hover:bg-slate-900 text-slate-400 font-bold py-3 px-4 rounded-xl transition-all text-sm"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-2/3 flex items-center justify-center space-x-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-all neon-glow-purple disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span>Reset Password</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: Success Screen */}
          {step === 3 && (
            <div className="space-y-6 text-center animate-fade-in-up py-4">
              <div className="mx-auto h-16 w-16 bg-green-500/10 border border-green-500/30 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="h-10 w-10 text-green-400" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white">Password Updated!</h3>
                <p className="text-sm text-slate-400">
                  Your account password has been successfully reset. You can now use your new password to log in or join the launcher.
                </p>
              </div>
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-gradient-to-r from-vortex-primary to-vortex-secondary text-white font-bold py-3 px-4 rounded-xl transition-all neon-glow-purple hover:opacity-90"
              >
                Sign In Now
              </button>
            </div>
          )}

          <div className="mt-8 pt-8 border-t border-slate-800/50 text-center">
            <p className="text-sm text-slate-400">
              Go back to{' '}
              <Link
                to="/login"
                className="text-purple-400 font-bold hover:text-purple-300 transition-colors"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
