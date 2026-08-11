import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { Order } from '../../types';
import { 
  ShoppingBag, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Search, 
  Filter, 
  MoreVertical,
  ExternalLink,
  User,
  CreditCard,
  Hash,
  Shield,
  Calendar,
  Trash2,
  RotateCcw,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';
import { useSettings } from '../../context/SettingsContext';
import Notification, { NotificationType } from '../../components/Notification';
import ConfirmDialog from '../../components/ConfirmDialog';

export default function AdminOrders() {
  const { settings } = useSettings();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | 'all'>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: NotificationType } | null>(null);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      const { data } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (data) setOrders(data as Order[]);
      setLoading(false);
    };

    fetchOrders();

    const channel = supabase
      .channel('admin-orders-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchOrders)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const updateOrderStatus = async (orderId: string, status: 'verified' | 'pending') => {
    // If we are verifying, we should decrease stock
    if (status === 'verified') {
      const order = orders.find(o => o.id === orderId);
      if (order && order.status !== 'verified') {
        for (const item of order.items) {
          // Fetch current product to get latest stock
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

    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId);
    
    if (error) {
      console.error('Error updating order status:', error);
      setNotification({ message: `Failed to update order: ${error.message}`, type: 'error' });
    } else {
      setNotification({ message: `Order status updated to ${status}.`, type: 'success' });
    }
    
    if (selectedOrder?.id === orderId) {
      setSelectedOrder(prev => prev ? { ...prev, status } : null);
    }
  };

  const deleteOrder = async (orderId: string) => {
    const targetOrder = orders.find(o => o.id === orderId);
    setOrderToDelete(null);
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId);
    
    if (error) {
      console.error('Error deleting order:', error);
      setNotification({ message: `Failed to delete order: ${error.message}`, type: 'error' });
    } else {
      if (targetOrder) {
        if (targetOrder.transaction_id) {
          await supabase
            .from('purchases')
            .delete()
            .eq('trx_id', targetOrder.transaction_id);
        }
        if (targetOrder.ign) {
          await supabase
            .from('purchases')
            .delete()
            .eq('username', targetOrder.ign);
        }
      }
      setSelectedOrder(null);
      setOrders(prev => prev.filter(o => o.id !== orderId));
      setNotification({ message: 'Order and associated purchase records deleted successfully.', type: 'success' });
    }
  };

  const clearAllOrders = async () => {
    setIsConfirmingClear(false);
    setLoading(true);
    try {
      // Delete all orders - using a filter that matches all rows
      const { error, status, statusText } = await supabase
        .from('orders')
        .delete()
        .gte('created_at', '1970-01-01');
      
      if (error) {
        console.error('Supabase delete error:', error);
        setNotification({ 
          message: `Failed to clear orders: ${error.message} (Status: ${status})`, 
          type: 'error' 
        });
        throw error;
      }
      
      setOrders([]);
      setNotification({ message: 'All orders have been cleared.', type: 'success' });
    } catch (err: any) {
      console.error('Error clearing orders:', err);
      if (!err.message?.includes('Status:')) {
        setNotification({ 
          message: `Failed to clear orders: ${err.message || 'Unknown error'}. Check console for details.`, 
          type: 'error' 
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(o => {
    const matchesSearch = o.ign.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         o.transaction_id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {notification && (
        <Notification 
          message={notification.message} 
          type={notification.type} 
          onClose={() => setNotification(null)} 
        />
      )}

      <ConfirmDialog
        isOpen={isConfirmingClear}
        title="Clear All Orders"
        message="WARNING: This will delete ALL orders. This action cannot be undone. Are you sure?"
        confirmText="Clear All"
        isDanger={true}
        onConfirm={clearAllOrders}
        onCancel={() => setIsConfirmingClear(false)}
      />

      <ConfirmDialog
        isOpen={!!orderToDelete}
        title="Delete Order"
        message="Are you sure you want to delete this order? This action cannot be undone."
        confirmText="Delete Order"
        isDanger={true}
        onConfirm={() => orderToDelete && deleteOrder(orderToDelete)}
        onCancel={() => setOrderToDelete(null)}
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-bold text-white">Order Management</h2>
          <button
            onClick={() => setIsConfirmingClear(true)}
            className="flex items-center space-x-2 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-600/20 px-4 py-2 rounded-xl text-sm font-bold transition-all"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear All</span>
          </button>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search IGN or TRX ID..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-vortex-primary transition-all"
            />
          </div>
          
          <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 rounded-xl p-1">
            {['all', 'pending', 'verified'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-widest transition-all",
                  statusFilter === status
                    ? "bg-vortex-primary text-white"
                    : "text-slate-500 hover:text-white"
                )}
              >
                {status.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Order List */}
        <div className="lg:col-span-2 space-y-4">
          {filteredOrders.length > 0 ? (
            filteredOrders.map((order) => (
              <div
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                className={cn(
                  "glass p-6 rounded-2xl border-slate-800/50 flex items-center justify-between cursor-pointer transition-all hover:border-purple-500/30",
                  selectedOrder?.id === order.id ? "border-purple-500 ring-1 ring-purple-500/50" : ""
                )}
              >
                <div className="flex items-center space-x-4">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center",
                    order.status === 'verified' ? "bg-green-500/10 text-green-500" : 
                    "bg-yellow-500/10 text-yellow-500"
                  )}>
                    {order.status === 'verified' ? <CheckCircle className="w-6 h-6" /> : 
                     <Clock className="w-6 h-6" />}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{order.ign}</h3>
                    <p className="text-xs text-slate-500 font-mono">{order.transaction_id}</p>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-lg font-bold text-white">{order.total_amount} BDT</p>
                  <p className="text-xs text-slate-500">{format(new Date(order.created_at), 'MMM dd, HH:mm')}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="py-20 text-center glass rounded-3xl">
              <p className="text-slate-500 italic">No orders found matching your criteria.</p>
            </div>
          )}
        </div>

        {/* Order Details */}
        <div className="lg:col-span-1">
          {selectedOrder ? (
            <div className="glass rounded-3xl border-slate-800/50 overflow-hidden sticky top-8">
              <div className="p-8 space-y-8">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white">Order Details</h3>
                  <div className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                    selectedOrder.status === 'verified' ? "bg-green-500/10 text-green-500" : 
                    "bg-yellow-500/10 text-yellow-500"
                  )}>
                    {selectedOrder.status.replace('_', ' ')}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-start space-x-4">
                    <User className="w-5 h-5 text-slate-500 mt-1" />
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Customer IGN</p>
                      <p className="text-white font-medium">{selectedOrder.ign}</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <CreditCard className="w-5 h-5 text-slate-500 mt-1" />
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Payment Method</p>
                      <p className="text-white font-medium uppercase">{selectedOrder.payment_method}</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <Hash className="w-5 h-5 text-slate-500 mt-1" />
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Sender Number</p>
                      <p className="text-white font-medium">{selectedOrder.sender_number}</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <Shield className="w-5 h-5 text-slate-500 mt-1" />
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Transaction ID</p>
                      <p className="text-white font-mono">{selectedOrder.transaction_id}</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <Calendar className="w-5 h-5 text-slate-500 mt-1" />
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Date & Time</p>
                      <p className="text-white font-medium">{format(new Date(selectedOrder.created_at), 'PPP p')}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-6 border-t border-slate-800/50">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Order Items</p>
                  <div className="space-y-3">
                    {selectedOrder.items.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-slate-400">{item.name} x{item.quantity}</span>
                        <span className="text-white font-medium">{item.price * item.quantity} BDT</span>
                      </div>
                    ))}
                    <div className="h-px bg-slate-800/50"></div>
                    <div className="flex justify-between font-bold text-white">
                      <span>Total</span>
                      <span className="text-vortex-primary">{selectedOrder.total_amount} BDT</span>
                    </div>
                  </div>
                </div>

                  <div className="grid grid-cols-1 gap-4 pt-6">
                    <button
                      onClick={() => updateOrderStatus(selectedOrder.id, 'verified')}
                      disabled={selectedOrder.status === 'verified'}
                      className="flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Verify Order</span>
                    </button>
                  </div>

                  <button
                    onClick={() => setOrderToDelete(selectedOrder.id)}
                    className="w-full mt-4 flex items-center justify-center space-x-2 bg-slate-800 hover:bg-red-600/20 hover:text-red-500 text-slate-400 font-bold py-3 rounded-xl transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Order</span>
                  </button>
              </div>
            </div>
          ) : (
            <div className="glass rounded-3xl border-slate-800/50 p-8 text-center space-y-4 h-full flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center">
                <ShoppingBag className="w-8 h-8 text-slate-700" />
              </div>
              <p className="text-slate-500 italic">Select an order to view details and take action.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
