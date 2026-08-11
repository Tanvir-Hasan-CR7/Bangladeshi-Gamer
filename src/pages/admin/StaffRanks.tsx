import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { Staff, Rank } from '../../types';
import { 
  Users, 
  Plus, 
  Trash2, 
  Edit2, 
  X,
  User,
  Hash,
  Shield,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { cn } from '../../lib/utils';
import Notification, { NotificationType } from '../../components/Notification';
import ConfirmDialog from '../../components/ConfirmDialog';

export default function AdminStaffRanks() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [ranks, setRanks] = useState<Rank[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const [isAddingRank, setIsAddingRank] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [editingRank, setEditingRank] = useState<Rank | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: NotificationType } | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; type: 'staff' | 'rank' } | null>(null);

  // Form states
  const [staffForm, setStaffForm] = useState({
    ign: '',
    uuid: '',
    username: '',
    rank_id: ''
  });
  const [rankForm, setRankForm] = useState({
    name: '',
    order: 0
  });

  useEffect(() => {
    fetchData();

    const ranksChannel = supabase.channel('admin-staff-ranks').on('postgres_changes', { event: '*', schema: 'public', table: 'ranks' }, fetchData).subscribe();
    const staffChannel = supabase.channel('admin-staff-staff').on('postgres_changes', { event: '*', schema: 'public', table: 'staff' }, fetchData).subscribe();

    return () => {
      supabase.removeChannel(ranksChannel);
      supabase.removeChannel(staffChannel);
    };
  }, []);

  const fetchData = async () => {
    const { data: ranksData } = await supabase
      .from('ranks')
      .select('*')
      .order('order', { ascending: true });
    
    if (ranksData) {
      setRanks(ranksData as Rank[]);
      if (ranksData.length > 0 && !staffForm.rank_id) {
        setStaffForm(prev => ({ ...prev, rank_id: ranksData[0].id }));
      }
    }

    const { data: staffData } = await supabase
      .from('staff')
      .select('*');
    
    if (staffData) setStaff(staffData as Staff[]);
    setLoading(false);
  };

  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!staffForm.uuid && !staffForm.username) {
        throw new Error("Either UUID or Username is required for the skin!");
      }

      if (editingStaff) {
        const { error } = await supabase
          .from('staff')
          .update(staffForm)
          .eq('id', editingStaff.id);
        if (error) throw error;
        setNotification({ message: 'Staff member updated successfully!', type: 'success' });
      } else {
        const { error } = await supabase
          .from('staff')
          .insert(staffForm);
        if (error) throw error;
        setNotification({ message: 'Staff member added successfully!', type: 'success' });
      }
      await fetchData();
      setIsAddingStaff(false);
      setEditingStaff(null);
      setStaffForm({ ign: '', uuid: '', username: '', rank_id: ranks[0]?.id || '' });
    } catch (err: any) {
      console.error('Staff Save Error:', err);
      alert(`ERROR: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRankSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingRank) {
        const { error } = await supabase
          .from('ranks')
          .update(rankForm)
          .eq('id', editingRank.id);
        if (error) throw error;
        setNotification({ message: 'Rank updated successfully!', type: 'success' });
      } else {
        const { error } = await supabase
          .from('ranks')
          .insert(rankForm);
        if (error) throw error;
        setNotification({ message: 'Rank created successfully!', type: 'success' });
      }
      await fetchData();
      setIsAddingRank(false);
      setEditingRank(null);
      setRankForm({ name: '', order: 0 });
    } catch (err: any) {
      console.error('Rank Save Error:', err);
      alert(`ERROR: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const deleteStaff = async (id: string) => {
    const { error } = await supabase.from('staff').delete().eq('id', id);
    if (error) {
      setNotification({ message: `Error removing staff: ${error.message}`, type: 'error' });
    } else {
      setNotification({ message: 'Staff member removed successfully!', type: 'success' });
      fetchData();
    }
    setItemToDelete(null);
  };

  const deleteRank = async (id: string) => {
    const { error } = await supabase.from('ranks').delete().eq('id', id);
    if (error) {
      setNotification({ message: `Error deleting rank: ${error.message}`, type: 'error' });
    } else {
      setNotification({ message: 'Rank deleted successfully!', type: 'success' });
      fetchData();
    }
    setItemToDelete(null);
  };

  if (loading && staff.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {notification && (
        <Notification 
          message={notification.message} 
          type={notification.type} 
          onClose={() => setNotification(null)} 
        />
      )}

      <ConfirmDialog
        isOpen={!!itemToDelete}
        title={`Delete ${itemToDelete?.type === 'staff' ? 'Staff Member' : 'Rank'}`}
        message={`Are you sure you want to delete this ${itemToDelete?.type === 'staff' ? 'staff member' : 'rank'}? This action cannot be undone.`}
        confirmText="Delete"
        isDanger={true}
        onConfirm={() => {
          if (itemToDelete?.type === 'staff') deleteStaff(itemToDelete.id);
          else if (itemToDelete?.type === 'rank') deleteRank(itemToDelete.id);
        }}
        onCancel={() => setItemToDelete(null)}
      />

      {/* Ranks Management */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Staff Ranks</h2>
          <button
            onClick={() => setIsAddingRank(true)}
            className="flex items-center space-x-2 bg-vortex-primary hover:opacity-90 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Rank</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {ranks.map((rank) => (
            <div key={rank.id} className="glass p-4 rounded-2xl border-slate-800/50 flex items-center justify-between group">
              <div>
                <p className="text-white font-bold">{rank.name}</p>
                <p className="text-xs text-slate-500">Priority: {rank.order}</p>
              </div>
              <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => {
                    setEditingRank(rank);
                    setRankForm({ name: rank.name, order: rank.order });
                    setIsAddingRank(true);
                  }}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setItemToDelete({ id: rank.id, type: 'rank' })}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Staff Management */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Staff Members</h2>
          <button
            onClick={() => {
              setEditingStaff(null);
              setStaffForm({ ign: '', uuid: '', username: '', rank_id: ranks[0]?.id || '' });
              setIsAddingStaff(true);
            }}
            className="flex items-center space-x-2 bg-vortex-primary hover:opacity-90 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Staff</span>
          </button>
        </div>

        <div className="glass rounded-3xl border-slate-800/50 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/50 border-b border-slate-800/50">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Staff Member</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Rank</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">UUID / Username</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {staff.map((member) => (
                <tr key={member.id} className="hover:bg-slate-800/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-4">
                      <img
                        src={(member.uuid && member.uuid.length > 10)
                          ? `https://minotar.net/avatar/${member.uuid}/32`
                          : `https://minotar.net/avatar/${member.username || member.ign}/32`}
                        alt={member.ign}
                        className="w-8 h-8 rounded bg-slate-900"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://minotar.net/avatar/charleshot/32';
                        }}
                      />
                      <p className="text-sm font-bold text-white">{member.ign}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-medium text-slate-400 bg-slate-800 px-2 py-1 rounded-full">
                      {ranks.find(r => r.id === member.rank_id)?.name || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500 font-mono">
                    {member.uuid || member.username}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => {
                          setEditingStaff(member);
                          setStaffForm({
                            ign: member.ign,
                            uuid: member.uuid || '',
                            username: member.username || '',
                            rank_id: member.rank_id
                          });
                          setIsAddingStaff(true);
                        }}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setItemToDelete({ id: member.id, type: 'staff' })}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Staff Modal */}
      {isAddingStaff && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass w-full max-w-md rounded-3xl border-slate-800/50 overflow-hidden">
            <div className="p-6 border-b border-slate-800/50 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">{editingStaff ? 'Edit Staff Member' : 'Add Staff Member'}</h3>
              <button onClick={() => { setIsAddingStaff(false); setEditingStaff(null); }} className="text-slate-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleStaffSubmit} className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">In-Game Name</label>
                <input
                  required
                  type="text"
                  value={staffForm.ign}
                  onChange={(e) => setStaffForm({ ...staffForm, ign: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-vortex-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Minecraft UUID</label>
                <input
                  type="text"
                  value={staffForm.uuid}
                  onChange={(e) => setStaffForm({ ...staffForm, uuid: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-vortex-primary"
                  placeholder="069a79f4-44e9-4726-a5be-fca90e38aaf5"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Minecraft Username</label>
                <input
                  type="text"
                  value={staffForm.username}
                  onChange={(e) => setStaffForm({ ...staffForm, username: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-vortex-primary"
                  placeholder="Steve"
                />
                <p className="text-[10px] text-slate-500 italic">Provide at least one (UUID preferred for accuracy)</p>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Rank</label>
                <select
                  required
                  value={staffForm.rank_id}
                  onChange={(e) => setStaffForm({ ...staffForm, rank_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-vortex-primary"
                >
                  {ranks.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-vortex-primary hover:opacity-90 text-white font-bold py-3 rounded-xl transition-all neon-glow-purple"
              >
                {editingStaff ? 'Update Staff' : 'Add Staff'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Rank Modal */}
      {isAddingRank && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass w-full max-w-md rounded-3xl border-slate-800/50 overflow-hidden">
            <div className="p-6 border-b border-slate-800/50 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">{editingRank ? 'Edit Rank' : 'Add Rank'}</h3>
              <button onClick={() => { setIsAddingRank(false); setEditingRank(null); }} className="text-slate-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleRankSubmit} className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Rank Name</label>
                <input
                  required
                  type="text"
                  value={rankForm.name}
                  onChange={(e) => setRankForm({ ...rankForm, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-vortex-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Priority Order (Lower = Higher Rank)</label>
                <input
                  required
                  type="number"
                  value={rankForm.order}
                  onChange={(e) => setRankForm({ ...rankForm, order: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-vortex-primary"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-vortex-primary hover:opacity-90 text-white font-bold py-3 rounded-xl transition-all neon-glow-purple"
              >
                {editingRank ? 'Update Rank' : 'Create Rank'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
