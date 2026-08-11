import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { 
  Shield, 
  Check, 
  X, 
  Clock, 
  CheckCircle, 
  XCircle,
  Hash, 
  User, 
  DollarSign, 
  Search,
  Filter,
  ArrowRight,
  Trash2
} from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import ConfirmDialog from '../../components/ConfirmDialog';

interface Purchase {
  id: string;
  username: string;
  rank_name: string;
  amount_paid: number;
  sender_number: string;
  trx_id: string;
  status: 'pending' | 'approved' | 'rejected';
  purchase_date: string;
}

export default function PurchasesVerification() {
  const { settings } = useSettings();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusTab, setStatusTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; success: boolean } | null>(null);
  const [purchaseToDelete, setPurchaseToDelete] = useState<string | null>(null);

  const fetchPurchases = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('purchases')
        .select('*');
      
      if (data) {
        setPurchases(data as Purchase[]);
      }
    } catch (err) {
      console.error('Error fetching manual purchases:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchases();
  }, []);

  const handleAction = async (purchaseId: string, action: 'approve' | 'reject') => {
    const status = action === 'approve' ? 'approved' : 'rejected';
    
    try {
      // Find the purchase item in state
      const targetPurchase = purchases.find(p => p.id === purchaseId);
      if (!targetPurchase) return;

      // Update in local mock database via supabase query builder abstraction
      const { error } = await supabase
        .from('purchases')
        .update({ status })
        .eq('id', purchaseId);

      if (error) throw error;

      // Also find corresponding order from transactions if applicable
      // Find the order that has this transaction_id and update status to 'verified'
      if (action === 'approve') {
        const { data: matchedOrders } = await supabase
          .from('orders')
          .select('*')
          .eq('transaction_id', targetPurchase.trx_id);

        if (matchedOrders && matchedOrders.length > 0) {
          await supabase
            .from('orders')
            .update({ status: 'verified' })
            .eq('transaction_id', targetPurchase.trx_id);
            
          // Deplete inventory stocks accordingly
          for (const order of matchedOrders) {
            if (order.items) {
              for (const item of order.items) {
                const { data: product } = await supabase
                  .from('products')
                  .select('stock')
                  .eq('id', item.productId)
                  .single();

                if (product && product.stock !== -1) {
                  const newStock = Math.max(0, product.stock - item.quantity);
                  await supabase
                    .from('products')
                    .update({ stock: newStock })
                    .eq('id', item.productId);
                }
              }
            }
          }
        }
      }

      setFeedbackMessage({
        text: `Successfully ${action === 'approve' ? 'approved' : 'rejected'} purchase for "${targetPurchase.username.toUpperCase()}"!`,
        success: true
      });

      // Clear after 3 seconds
      setTimeout(() => setFeedbackMessage(null), 3000);

      // Refresh list to instantly show change in UI
      await fetchPurchases();
    } catch (err: any) {
      console.error(`Error processing manual purchase action:`, err);
      setFeedbackMessage({
        text: `Error updating purchase: ${err.message || 'Unknown error'}`,
        success: false
      });
      setTimeout(() => setFeedbackMessage(null), 4000);
    }
  };

  const handleDeletePurchase = (purchaseId: string) => {
    setPurchaseToDelete(purchaseId);
  };

  const executeDeletePurchase = async () => {
    if (!purchaseToDelete) return;
    const purchaseId = purchaseToDelete;
    setPurchaseToDelete(null);

    try {
      // Find the purchase first to get its username and transaction ID, so we can delete related records
      const targetPurchase = purchases.find(p => p.id === purchaseId);

      const { error } = await supabase
        .from('purchases')
        .delete()
        .eq('id', purchaseId);

      if (error) throw error;

      // Delete corresponding order as well if found
      if (targetPurchase) {
        if (targetPurchase.trx_id) {
          await supabase
            .from('orders')
            .delete()
            .eq('transaction_id', targetPurchase.trx_id);
        }
        if (targetPurchase.username) {
          await supabase
            .from('orders')
            .delete()
            .eq('ign', targetPurchase.username);
        }
      }

      setFeedbackMessage({
        text: "Successfully deleted purchase record and matching transaction data permanently!",
        success: true
      });
      setTimeout(() => setFeedbackMessage(null), 3000);

      // Refresh list
      await fetchPurchases();
    } catch (err: any) {
      console.error("Error deleting purchase:", err);
      setFeedbackMessage({
        text: `Error deleting purchase: ${err.message || 'Unknown error'}`,
        success: false
      });
      setTimeout(() => setFeedbackMessage(null), 4000);
    }
  };

  // Filter purchases according to selected tab and search bar query
  const filteredPurchases = purchases
    .filter(p => p.status === statusTab)
    .filter(p => {
      const query = searchQuery.toLowerCase();
      return (
        p.username.toLowerCase().includes(query) ||
        p.trx_id.toLowerCase().includes(query) ||
        p.sender_number.includes(query) ||
        p.rank_name.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime());

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight">
            MANUAL <span className="text-transparent bg-clip-text bg-gradient-to-r from-vortex-primary to-vortex-secondary">VERIFICATION HUB</span>
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Manual Bank Verification Queue for bKash, Nagad, and Rocket receipts. Checks Sender Number and Transaction ID.
          </p>
        </div>
      </div>

      {feedbackMessage && (
        <div className={`p-4 rounded-xl border flex items-center space-x-3 text-sm animate-bounce ${
          feedbackMessage.success 
            ? 'bg-green-500/10 border-green-500/30 text-green-400' 
            : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          {feedbackMessage.success ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <XCircle className="w-5 h-5 flex-shrink-0" />}
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      {/* Filter and Tab Options Container */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        
        {/* Status Tab list */}
        <div className="inline-flex p-1 bg-white/5 border border-white/5 rounded-2xl">
          {(['pending', 'approved', 'rejected'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusTab(tab)}
              className={`px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 relative ${
                statusTab === tab
                  ? 'bg-gradient-to-r from-vortex-primary to-vortex-secondary text-white shadow-lg shadow-purple-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="relative z-10 flex items-center space-x-1.5">
                {tab === 'pending' && <Clock className="w-3.5 h-3.5" />}
                {tab === 'approved' && <CheckCircle className="w-3.5 h-3.5" />}
                {tab === 'rejected' && <XCircle className="w-3.5 h-3.5" />}
                <span>{tab}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                  statusTab === tab ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-500'
                }`}>
                  {purchases.filter(p => p.status === tab).length}
                </span>
              </span>
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search IGN, TrxID, sender number..."
            className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500/80 rounded-xl pl-10 pr-4 py-2.5 text-slate-200 text-sm focus:outline-none transition-all placeholder:text-slate-600 focus:ring-1 focus:ring-purple-500/30"
          />
        </div>
      </div>

      {/* Main Glassmorphic Panel content of verification table */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-24 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mx-auto"></div>
              <p className="text-slate-500 text-xs uppercase tracking-widest mt-4">Loading purchase datasets...</p>
            </div>
          ) : filteredPurchases.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-[11px] uppercase tracking-widest text-slate-500 font-extrabold bg-white/2">
                  <th className="py-5 px-6">Minecraft Player</th>
                  <th className="py-5 px-6">Store Package</th>
                  <th className="py-5 px-6">Amount (BDT)</th>
                  <th className="py-5 px-6">Transaction Fields</th>
                  <th className="py-5 px-6">Submitted Date</th>
                  <th className="py-5 px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredPurchases.map((purchase) => (
                  <tr key={purchase.id} className="hover:bg-white/2 transition-colors duration-200">
                    
                    {/* Head + Username */}
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-3.5">
                        <img 
                          src={`https://mc-heads.net/avatar/${purchase.username}`} 
                          alt={purchase.username}
                          className="w-10 h-10 rounded-xl bg-slate-950 border border-white/5 shadow-inner"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://mc-heads.net/avatar/mhf_steve';
                          }}
                        />
                        <div>
                          <p className="font-extrabold text-white text-base tracking-tight uppercase">{purchase.username}</p>
                          <span className="text-[10px] text-slate-500 font-mono">id: {purchase.id}</span>
                        </div>
                      </div>
                    </td>

                    {/* Rank / Package */}
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center space-x-1 bg-purple-500/10 border border-purple-500/25 px-2.5 py-1 rounded-lg text-xs font-black text-purple-400">
                        <Shield className="w-3.5 h-3.5" />
                        <span>{purchase.rank_name}</span>
                      </span>
                    </td>

                    {/* Amount Paid */}
                    <td className="py-4 px-6 font-bold text-white text-sm">
                      <div className="flex items-center space-x-1">
                        <span className="text-emerald-400 font-mono">{purchase.amount_paid}</span>
                        <span className="text-slate-500 text-xs">BDT</span>
                      </div>
                    </td>

                    {/* Sender No + Transaction ID */}
                    <td className="py-4 px-6 space-y-1">
                      <div className="flex items-center space-x-1.5 text-xs text-slate-300">
                        <Hash className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-slate-500">Sender:</span>
                        <span className="font-semibold text-slate-200">{purchase.sender_number}</span>
                      </div>
                      <div className="flex items-center space-x-1.5 text-xs">
                        <CheckCircle className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-slate-500">TrxID:</span>
                        <span className="font-mono bg-slate-900/60 text-yellow-400 px-2 py-0.5 rounded border border-slate-800 text-[10px]">{purchase.trx_id}</span>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="py-4 px-6 text-xs text-slate-400">
                      <div>{new Date(purchase.purchase_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{new Date(purchase.purchase_date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>

                    {/* Resolve actions */}
                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center space-x-3.5">
                        {statusTab === 'pending' ? (
                          <>
                            {/* Approve icon button */}
                            <button
                              onClick={() => handleAction(purchase.id, 'approve')}
                              title="Approve Transaction"
                              className="w-10 h-10 rounded-xl bg-green-500/10 hover:bg-green-500 text-green-500 hover:text-white border border-green-500/25 flex items-center justify-center transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg shadow-green-500/5"
                            >
                              <Check className="w-5 h-5 font-black" />
                            </button>

                            {/* Reject icon button */}
                            <button
                              onClick={() => handleAction(purchase.id, 'reject')}
                              title="Reject Transaction"
                              className="w-10 h-10 rounded-xl bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/25 flex items-center justify-center transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg shadow-red-500/5"
                            >
                              <X className="w-5 h-5 font-black" />
                            </button>
                          </>
                        ) : (
                          /* Delete icon button */
                          <button
                            onClick={() => handleDeletePurchase(purchase.id)}
                            title="Delete Purchase Record"
                            className="w-10 h-10 rounded-xl bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-600/25 flex items-center justify-center transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg shadow-red-600/5"
                          >
                            <Trash2 className="w-5 h-5 font-black" />
                          </button>
                        )}
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-24 text-center space-y-4">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto border border-white/5 text-slate-500">
                {statusTab === 'pending' ? <Check className="w-8 h-8 text-green-500/60" /> : 
                 statusTab === 'approved' ? <CheckCircle className="w-8 h-8 text-slate-600" /> : 
                 <XCircle className="w-8 h-8 text-slate-600" />}
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-white">No registrations found</h3>
                <p className="text-slate-500 text-xs max-w-sm mx-auto">
                  {statusTab === 'pending' 
                    ? "Hooray! The queue is completely empty. There are no pending transactions waiting." 
                    : `No receipts have been matched as "${statusTab}" in this filter.`}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={!!purchaseToDelete}
        title="Delete Record?"
        message="Are you sure you want to permanently delete this purchase record? This will also remove this player's info from both the queue lists and the Patrons wall."
        confirmText="Yes, Delete"
        cancelText="Cancel"
        onConfirm={executeDeletePurchase}
        onCancel={() => setPurchaseToDelete(null)}
        isDanger={true}
      />
    </div>
  );
}
