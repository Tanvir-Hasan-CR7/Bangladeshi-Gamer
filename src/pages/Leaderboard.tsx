import React, { useState, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';
import { Trophy, Clock, Skull, Coins, Award, Pickaxe, Flame, Vote, Search, RefreshCw, ChevronLeft, ChevronRight, Terminal, ShieldCheck, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { fetchJson } from '../lib/fetchJson';

interface LeaderboardEntry {
  rank: number;
  username: string;
  value: number;
  uuid?: string;
}

type MetricType = 'kills' | 'deaths' | 'money' | 'playtime' | 'blocks_broken' | 'mob_kills' | 'votes';

export default function Leaderboard() {
  const { settings } = useSettings();
  const [activeTab, setActiveTab] = useState<MetricType>('kills');
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // DB Inspector Modal
  const [showInspector, setShowInspector] = useState(false);
  const [inspectionReport, setInspectionReport] = useState<string>('');
  const [inspecting, setInspecting] = useState(false);

  const categories = [
    { id: 'kills' as MetricType, name: 'Kills', icon: Award, color: 'from-red-500 to-rose-600' },
    { id: 'deaths' as MetricType, name: 'Deaths', icon: Skull, color: 'from-purple-500 to-indigo-600' },
    { id: 'money' as MetricType, name: 'Money', icon: Coins, color: 'from-emerald-500 to-teal-600' },
    { id: 'playtime' as MetricType, name: 'Playtime', icon: Clock, color: 'from-amber-500 to-yellow-500' },
    { id: 'blocks_broken' as MetricType, name: 'Blocks Broken', icon: Pickaxe, color: 'from-blue-500 to-cyan-600' },
    { id: 'mob_kills' as MetricType, name: 'Mob Kills', icon: Flame, color: 'from-orange-500 to-amber-600' },
    { id: 'votes' as MetricType, name: 'Votes', icon: Vote, color: 'from-violet-500 to-fuchsia-600' },
  ];

  const fetchLeaderboard = async (metric: MetricType) => {
    setLoading(true);
    setError(null);
    try {
      const json = await fetchJson(`/api/leaderboard/${metric}?limit=200`);
      if (json && json.success && Array.isArray(json.players)) {
        const formatted: LeaderboardEntry[] = json.players.map((p: any, idx: number) => ({
          rank: p.rank || idx + 1,
          username: p.name || p.username || 'Unknown',
          value: Number(p.score ?? p.value ?? 0),
          uuid: p.uuid
        }));
        setData(formatted);
      } else {
        setError('Leaderboard temporarily unavailable.');
        setData([]);
      }
    } catch (err: any) {
      setError('Leaderboard temporarily unavailable.');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard(activeTab);
    setCurrentPage(1);
  }, [activeTab]);

  const handleTabChange = (tab: MetricType) => {
    setActiveTab(tab);
    setSearchQuery('');
  };

  const handleInspectDb = async () => {
    setInspecting(true);
    setShowInspector(true);
    try {
      const res = await fetch('/api/sync/inspect-ajlb');
      const text = await res.text();
      setInspectionReport(text);
    } catch (err: any) {
      setInspectionReport(`Error running database inspection: ${err.message}`);
    } finally {
      setInspecting(false);
    }
  };

  const formatValue = (val: number, metric: MetricType) => {
    if (metric === 'money') {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
    }
    if (metric === 'playtime') {
      const hours = Math.floor(val);
      const mins = Math.round((val - hours) * 60);
      return `${hours}h ${mins}m`;
    }
    return new Intl.NumberFormat('en-US').format(val);
  };

  // Filtered dataset
  const filteredData = data.filter(item => 
    item.username.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  // Top 3 Podium
  const top1 = data.find(d => d.rank === 1);
  const top2 = data.find(d => d.rank === 2);
  const top3 = data.find(d => d.rank === 3);

  // Pagination calculation
  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const activeCategory = categories.find(c => c.id === activeTab) || categories[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-purple-600/10 blur-[120px] pointer-events-none rounded-full" />

      <div className="max-w-6xl mx-auto relative z-10 space-y-8">
        
        {/* Header & Controls */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold tracking-widest uppercase">
            <ShieldCheck className="w-4 h-4 text-purple-400" />
            <span>ajLeaderboards Direct MySQL Engine</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white">
            SERVER <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-cyan-400 to-indigo-400">LEADERBOARDS</span>
          </h1>
          <p className="text-slate-400 text-sm md:text-base max-w-2xl mx-auto">
            Live rankings read directly from your ajLeaderboards MySQL database.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => fetchLeaderboard(activeTab)}
              disabled={loading}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-600/20 transition-all flex items-center space-x-2"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
              <span>{loading ? 'Refreshing...' : 'Refresh Leaderboard'}</span>
            </button>

            <button
              onClick={handleInspectDb}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl border border-slate-700 transition-all flex items-center space-x-2"
            >
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              <span>Inspect MySQL Schema</span>
            </button>
          </div>
        </div>

        {/* Category Tab Bar */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeTab === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => handleTabChange(cat.id)}
                className={cn(
                  "flex items-center space-x-2 px-4 py-3 rounded-2xl border text-xs font-bold transition-all shrink-0 cursor-pointer",
                  isActive
                    ? "bg-slate-900 border-purple-500 text-white shadow-lg shadow-purple-500/20 ring-1 ring-purple-500/50"
                    : "bg-slate-900/50 border-slate-800/80 text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                )}
              >
                <div className={cn("p-1.5 rounded-lg bg-gradient-to-br text-white", cat.color)}>
                  <Icon className="w-4 h-4" />
                </div>
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>

        {/* TOP 3 PODIUM DISPLAY */}
        {!loading && !error && data.length >= 3 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 items-end">
            
            {/* SILVER - 2ND PLACE */}
            {top2 && (
              <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 text-center space-y-4 shadow-xl backdrop-blur-xl relative order-2 md:order-1">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-slate-700 border border-slate-500 text-slate-200 text-[10px] font-black uppercase rounded-full tracking-wider shadow-md">
                  #2 SILVER
                </div>
                <div className="relative w-20 h-20 mx-auto rounded-2xl bg-slate-800 border-2 border-slate-400 overflow-hidden shadow-lg">
                  <img
                    src={`https://mc-heads.net/avatar/${top2.username}/80`}
                    alt={top2.username}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                  />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white truncate">{top2.username}</h3>
                  <p className="text-slate-400 text-xs font-mono font-bold mt-0.5">{formatValue(top2.value, activeTab)}</p>
                </div>
              </div>
            )}

            {/* GOLD - 1ST PLACE */}
            {top1 && (
              <div className="bg-gradient-to-b from-amber-500/10 via-slate-900/90 to-slate-900 border-2 border-amber-500/50 rounded-3xl p-8 text-center space-y-4 shadow-2xl shadow-amber-500/10 backdrop-blur-xl relative order-1 md:order-2 scale-105 z-10">
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-gradient-to-r from-yellow-400 to-amber-600 text-slate-950 text-xs font-black uppercase rounded-full tracking-wider shadow-lg flex items-center space-x-1">
                  <Trophy className="w-3.5 h-3.5 fill-current" />
                  <span>#1 CHAMPION</span>
                </div>
                <div className="relative w-24 h-24 mx-auto rounded-2xl bg-amber-950/40 border-2 border-amber-400 overflow-hidden shadow-xl ring-4 ring-amber-500/20">
                  <img
                    src={`https://mc-heads.net/avatar/${top1.username}/96`}
                    alt={top1.username}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                  />
                </div>
                <div>
                  <h3 className="text-xl font-black text-amber-300 truncate">{top1.username}</h3>
                  <p className="text-amber-400 text-sm font-mono font-bold mt-0.5">{formatValue(top1.value, activeTab)}</p>
                </div>
              </div>
            )}

            {/* BRONZE - 3RD PLACE */}
            {top3 && (
              <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 text-center space-y-4 shadow-xl backdrop-blur-xl relative order-3">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-amber-900/80 border border-amber-700 text-amber-200 text-[10px] font-black uppercase rounded-full tracking-wider shadow-md">
                  #3 BRONZE
                </div>
                <div className="relative w-20 h-20 mx-auto rounded-2xl bg-slate-800 border-2 border-amber-700 overflow-hidden shadow-lg">
                  <img
                    src={`https://mc-heads.net/avatar/${top3.username}/80`}
                    alt={top3.username}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                  />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white truncate">{top3.username}</h3>
                  <p className="text-slate-400 text-xs font-mono font-bold mt-0.5">{formatValue(top3.value, activeTab)}</p>
                </div>
              </div>
            )}

          </div>
        )}

        {/* SEARCH & LEADERBOARD TABLE */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-xl">
          
          {/* Table Header Controls */}
          <div className="p-6 border-b border-slate-800/80 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-3 w-full md:w-auto">
              <div className={cn("w-3 h-8 rounded-full bg-gradient-to-b", activeCategory.color)} />
              <div>
                <h2 className="text-lg font-bold text-white capitalize">{activeCategory.name} Rankings</h2>
                <p className="text-xs text-slate-400">
                  Direct ajLeaderboards MySQL Database Stream
                </p>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search Minecraft username..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs font-bold text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Table Content */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 text-xs uppercase tracking-wider font-mono">
                  <th className="py-4 px-6 w-20 text-center">Rank</th>
                  <th className="py-4 px-6">Player</th>
                  <th className="py-4 px-6 text-right uppercase">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-sm">
                {loading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <tr key={idx} className="animate-pulse">
                      <td className="py-4 px-6 text-center"><div className="w-8 h-8 bg-slate-800 rounded-lg mx-auto" /></td>
                      <td className="py-4 px-6"><div className="w-32 h-4 bg-slate-800 rounded" /></td>
                      <td className="py-4 px-6 text-right"><div className="w-20 h-4 bg-slate-800 rounded ml-auto" /></td>
                    </tr>
                  ))
                ) : error ? (
                  <tr>
                    <td colSpan={3} className="py-12 text-center text-red-400 text-xs font-bold">
                      {error}
                    </td>
                  </tr>
                ) : paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-12 text-center text-slate-400 text-xs font-medium">
                      {searchQuery ? `No players matching "${searchQuery}"` : "No leaderboard data found."}
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((entry) => {
                    const isTop1 = entry.rank === 1;
                    const isTop2 = entry.rank === 2;
                    const isTop3 = entry.rank === 3;

                    return (
                      <tr
                        key={entry.rank}
                        className={cn(
                          "transition-colors hover:bg-slate-800/30",
                          isTop1 && "bg-amber-500/5 font-semibold",
                          isTop2 && "bg-slate-400/5 font-semibold",
                          isTop3 && "bg-amber-700/5 font-semibold"
                        )}
                      >
                        <td className="py-4 px-6 text-center font-mono">
                          <div className="inline-flex items-center justify-center">
                            {isTop1 ? (
                              <span className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center">#1</span>
                            ) : isTop2 ? (
                              <span className="w-7 h-7 rounded-lg bg-slate-400 text-slate-950 font-black text-xs flex items-center justify-center">#2</span>
                            ) : isTop3 ? (
                              <span className="w-7 h-7 rounded-lg bg-amber-700 text-white font-black text-xs flex items-center justify-center">#3</span>
                            ) : (
                              <span className="text-slate-500 font-bold text-xs">#{entry.rank}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-xl bg-slate-800 overflow-hidden border border-slate-700/50 flex items-center justify-center shrink-0">
                              <img
                                src={`https://mc-heads.net/avatar/${entry.username}/32`}
                                alt={entry.username}
                                className="w-full h-full object-cover"
                                onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                              />
                            </div>
                            <span className="font-bold text-white tracking-wide">{entry.username}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-right font-mono font-bold text-purple-300">
                          {formatValue(entry.value, activeTab)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {!loading && !error && totalPages > 1 && (
            <div className="p-4 border-t border-slate-800 bg-slate-950/20 flex items-center justify-between text-xs text-slate-400">
              <div>
                Page <span className="font-bold text-white">{currentPage}</span> of <span className="font-bold text-white">{totalPages}</span> ({filteredData.length} total)
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-40 transition-all flex items-center space-x-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Prev</span>
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-40 transition-all flex items-center space-x-1"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* MYSQL INSPECTION REPORT MODAL */}
      {showInspector && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Terminal className="w-5 h-5 text-cyan-400" />
                <h3 className="text-lg font-bold text-white">MySQL ajLeaderboards Database Inspection</h3>
              </div>
              <button
                onClick={() => setShowInspector(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 font-mono text-xs bg-slate-950 text-cyan-300 whitespace-pre-wrap">
              {inspecting ? (
                <div className="flex items-center justify-center py-12 space-x-3 text-slate-400">
                  <RefreshCw className="w-5 h-5 animate-spin text-purple-400" />
                  <span>Inspecting MySQL tables (`SHOW TABLES LIKE 'ajlb_%'`)....</span>
                </div>
              ) : (
                inspectionReport || 'No inspection data received.'
              )}
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex justify-end">
              <button
                onClick={() => setShowInspector(false)}
                className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

