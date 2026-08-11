import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { Order } from '../../types';
import { Link } from 'react-router-dom';
import { 
  DollarSign, 
  ShoppingBag, 
  TrendingUp, 
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { cn } from '../../lib/utils';
import Notification, { NotificationType } from '../../components/Notification';
import ConfirmDialog from '../../components/ConfirmDialog';

export default function AdminDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{ message: string; type: NotificationType } | null>(null);
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);

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
      .channel('admin-dashboard-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchOrders)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const verifiedOrders = orders.filter(o => o.status === 'verified');
  const totalRevenue = verifiedOrders.reduce((acc, o) => acc + o.total_amount, 0);
  const pendingOrders = orders.filter(o => o.status === 'pending').length;

  // Monthly stats
  const currentMonth = new Date();
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  
  const monthlyRevenue = verifiedOrders
    .filter(o => isWithinInterval(new Date(o.created_at), { start: monthStart, end: monthEnd }))
    .reduce((acc, o) => acc + o.total_amount, 0);

  // Chart data (last 7 days)
  const last7Days = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = format(d, 'MMM dd');
    const dayRevenue = verifiedOrders
      .filter(o => format(new Date(o.created_at), 'MMM dd') === dateStr)
      .reduce((acc, o) => acc + o.total_amount, 0);
    return { name: dateStr, revenue: dayRevenue };
  }).reverse();

  const stats = [
    { name: 'Total Revenue', value: `${totalRevenue} BDT`, icon: DollarSign, color: 'text-green-500', bg: 'bg-green-500/10' },
    { name: 'Monthly Revenue', value: `${monthlyRevenue} BDT`, icon: TrendingUp, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { name: 'Verified Orders', value: verifiedOrders.length, icon: ShoppingBag, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { name: 'Pending Verification', value: pendingOrders, icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  ];

  const resetRevenue = async () => {
    setIsConfirmingReset(false);
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
          message: `Failed to reset revenue: ${error.message} (Status: ${status})`, 
          type: 'error' 
        });
        throw error;
      }
      
      setOrders([]);
      setNotification({ message: 'Revenue data has been reset successfully.', type: 'success' });
    } catch (err: any) {
      console.error('Error resetting revenue:', err);
      if (!err.message?.includes('Status:')) {
        setNotification({ 
          message: `Failed to reset revenue: ${err.message || 'Unknown error'}. Check console for details.`, 
          type: 'error' 
        });
      }
    } finally {
      setLoading(false);
    }
  };

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
        isOpen={isConfirmingReset}
        title="Reset Revenue Data"
        message="WARNING: This will delete ALL orders and reset all revenue data. This action cannot be undone. Are you sure?"
        confirmText="Reset Everything"
        isDanger={true}
        onConfirm={resetRevenue}
        onCancel={() => setIsConfirmingReset(false)}
      />

      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-white">Revenue Overview</h2>
          <div className="text-sm text-slate-500">Last updated: {format(new Date(), 'HH:mm:ss')}</div>
        </div>
        <button
          onClick={() => setIsConfirmingReset(true)}
          className="px-4 py-2 bg-red-500/10 border border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white rounded-xl text-sm font-bold transition-all"
        >
          Reset Revenue
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="glass p-6 rounded-2xl border-slate-800/50 space-y-4">
            <div className="flex items-center justify-between">
              <div className={cn("p-3 rounded-xl", stat.bg)}>
                <stat.icon className={cn("w-6 h-6", stat.color)} />
              </div>
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">{stat.name}</p>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass p-8 rounded-3xl border-slate-800/50 space-y-6">
          <h3 className="text-lg font-bold text-white">Revenue Trends (Last 7 Days)</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={last7Days}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#64748b" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(value) => `${value}`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                  itemStyle={{ color: '#8b5cf6' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#8b5cf6" 
                  fillOpacity={1} 
                  fill="url(#colorRevenue)" 
                  strokeWidth={3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass p-8 rounded-3xl border-slate-800/50 space-y-6">
          <h3 className="text-lg font-bold text-white">Recent Activity</h3>
          <div className="space-y-6">
            {orders.slice(0, 5).map((order) => (
              <div key={order.id} className="flex items-center space-x-4">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center",
                  order.status === 'verified' ? "bg-green-500/10 text-green-500" : "bg-yellow-500/10 text-yellow-500"
                )}>
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div className="flex-grow overflow-hidden">
                  <p className="text-sm font-bold text-white truncate">{order.ign}</p>
                  <p className="text-xs text-slate-500">{format(new Date(order.created_at), 'MMM dd, HH:mm')}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-white">{order.total_amount} BDT</p>
                  <p className={cn(
                    "text-[10px] font-bold uppercase tracking-widest",
                    order.status === 'verified' ? "text-green-500" : "text-yellow-500"
                  )}>{order.status}</p>
                </div>
              </div>
            ))}
          </div>
          <Link 
            to="/admin/orders"
            className="w-full py-3 text-sm font-bold text-slate-400 hover:text-white transition-colors border-t border-slate-800/50 text-center block"
          >
            View All Orders
          </Link>
        </div>
      </div>
    </div>
  );
}
