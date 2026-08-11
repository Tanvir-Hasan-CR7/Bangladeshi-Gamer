import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, HelpCircle, ArrowLeft, Home, Sparkles } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

export default function NotFound() {
  const { settings } = useSettings();
  const serverName = settings?.server_name || 'Eternity Hub';
  const serverIp = settings?.server_ip || 'play.eternityhub.fun';
  const first = settings?.brand_name_first || '';
  const second = settings?.brand_name_second || '';
  const combinedName = (first + ' ' + second).trim() || serverName;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden select-none px-4">
      {/* Immersive Space/Vortex Background styling */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,rgba(147,51,234,0.15)_0%,transparent_70%)]" />
      
      {/* Decorative floating particles representing vortex stars */}
      <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-purple-500 rounded-full opacity-30 animate-pulse" />
      <div className="absolute bottom-1/3 right-1/4 w-3 h-3 bg-blue-500 rounded-full opacity-20 animate-bounce duration-1000" />
      <div className="absolute top-1/2 right-1/3 w-1 h-1 bg-white rounded-full opacity-60 animate-ping" />
      
      <div className="relative z-10 text-center max-w-lg mx-auto space-y-8 px-6 py-12 rounded-3xl border border-slate-900 bg-slate-900/60 backdrop-blur-xl shadow-2xl">
        <div className="relative inline-flex items-center justify-center">
          {/* Neon spinning effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-cyan-500 rounded-full blur-xl opacity-40 animate-spin duration-3000" />
          <div className="relative p-6 bg-slate-950 border border-slate-800 rounded-2xl shadow-inner">
            <Compass className="w-16 h-16 text-purple-400 animate-pulse" />
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 tracking-tighter">
            404
          </h1>
          <h2 className="text-2xl font-bold text-white tracking-wide uppercase">
            LOST IN {combinedName}
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed max-w-sm mx-auto">
            The coordinates you were attempting to warp to do not exist or have been swallowed by the gravitational pull of the Void.
          </p>
        </div>

        {/* Suggestion / Route list */}
        <div className="pt-4 border-t border-slate-800/60 flex flex-col sm:flex-row gap-3 justify-center items-center">
          <Link
            to="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold px-6 py-3 rounded-xl transition-all cursor-pointer text-sm shadow-md shadow-purple-900/20"
          >
            <Home className="w-4 h-4" />
            {serverName} Spawn
          </Link>
          <Link
            to="/store"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 px-6 py-3 rounded-xl transition-all text-sm"
          >
            <Sparkles className="w-4 h-4 text-purple-400" />
            Visit Store
          </Link>
        </div>

        <div className="text-slate-600 text-xs font-mono uppercase">
          SECTOR_VOID // {serverIp}
        </div>
      </div>
    </div>
  );
}
