import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Users, 
  ShoppingCart, 
  Activity, 
  TrendingUp, 
  MapPin, 
  CheckCircle2,
  Clock,
  Package
} from 'lucide-react';

export function AdminDashboard({ initialView = 'dashboard' }: { initialView?: 'dashboard' | 'users' | 'orders' }) {
  const [loading, setLoading] = useState(true);
  const [viewState, setViewState] = useState<'dashboard' | 'users' | 'orders'>(initialView);

  const [stats, setStats] = useState([
    { label: "Total Registered Users", value: "...", trend: "Loading...", icon: <Users className="w-6 h-6 text-blue-500" /> },
    { label: "Active Daily Farmers", value: "...", trend: "Loading...", icon: <Activity className="w-6 h-6 text-green-500" /> },
    { label: "Total Shop Orders", value: "...", trend: "Loading...", icon: <ShoppingCart className="w-6 h-6 text-purple-500" /> },
    { label: "Platform Revenue", value: "...", trend: "Loading...", icon: <TrendingUp className="w-6 h-6 text-amber-500" /> }
  ]);

  const [recentRegistrations, setRecentRegistrations] = useState<any[]>([]);
  const [allRegistrations, setAllRegistrations] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [allOrders, setAllOrders] = useState<any[]>([]);

  useEffect(() => {
    fetchAdminData();
  }, []);

  useEffect(() => {
    setViewState(initialView);
  }, [initialView]);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Stats
      const [
        { count: userCount },
        { data: farmUsers },
        { count: orderCount },
        { data: ordersData }
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('farms').select('user_id'),
        supabase.from('orders').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('total_amount')
      ]);

      const uniqueFarmers = new Set(farmUsers?.map((f: any) => f.user_id)).size;
      const totalRevenue = ordersData?.reduce((sum: number, order: any) => sum + Number(order.total_amount), 0) || 0;

      setStats([
        { label: "Total Registered Users", value: (userCount || 0).toLocaleString(), trend: "Real-time", icon: <Users className="w-6 h-6 text-blue-500" /> },
        { label: "Active Daily Farmers", value: uniqueFarmers.toLocaleString(), trend: "Live", icon: <Activity className="w-6 h-6 text-green-500" /> },
        { label: "Total Shop Orders", value: (orderCount || 0).toLocaleString(), trend: "Updated", icon: <ShoppingCart className="w-6 h-6 text-purple-500" /> },
        { label: "Platform Revenue", value: `₹${totalRevenue.toLocaleString()}`, trend: "Live earnings", icon: <TrendingUp className="w-6 h-6 text-amber-500" /> }
      ]);

      // 2. Fetch All Registrations
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (profiles) {
        const mappedProfiles = profiles.map((p: any) => ({
          id: p.id,
          name: p.full_name || 'Farmer',
          phone: p.phone,
          location: 'Registered',
          joined: new Date(p.created_at).toLocaleDateString(),
          status: 'Active'
        }));
        setAllRegistrations(mappedProfiles);
        setRecentRegistrations(mappedProfiles.slice(0, 4));
      }

      // 3. Fetch All Orders
      const { data: allOrdersData } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (allOrdersData) {
        const mappedOrders = allOrdersData.map((o: any) => ({
          orderId: o.id.slice(0, 8).toUpperCase(),
          user: o.customer_name,
          items: 'View Details',
          amount: `₹${Number(o.total_amount).toLocaleString()}`,
          status: o.status.charAt(0).toUpperCase() + o.status.slice(1),
          date: new Date(o.created_at).toLocaleDateString()
        }));
        setAllOrders(mappedOrders);
        setRecentOrders(mappedOrders.slice(0, 4));
      }

    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-prodmast-primary">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-prodmast-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 p-10 rounded-[32px] shadow-lg relative overflow-hidden bg-gradient-to-r from-blue-900 to-indigo-900">
        <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full blur-[80px] -translate-y-10 translate-x-10 pointer-events-none"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <span className="bg-blue-500/20 text-blue-200 border border-blue-500/30 px-3 py-1 text-xs font-bold uppercase tracking-widest rounded-lg flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
              Owner Access Verified
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-sans font-extrabold text-white mb-2 tracking-tight">Admin <span className="text-blue-300">Dashboard</span></h1>
          <p className="text-blue-100/80 font-medium">Welcome back. Here's what's happening on your platform today.</p>
        </div>
        {viewState !== 'dashboard' && (
          <button 
            onClick={() => setViewState('dashboard')}
            className="relative z-10 px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white font-bold transition-all flex items-center gap-2"
          >
            ← Back to Overview
          </button>
        )}
      </div>

      {viewState === 'dashboard' ? (
        <>
          {/* Top Level Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, idx) => (
              <div key={idx} className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow group">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                    {stat.icon}
                  </div>
                  <span className="text-xs font-bold text-gray-500 bg-gray-50 px-2 py-1 rounded-md">{stat.trend}</span>
                </div>
                <h4 className="text-3xl font-extrabold text-gray-900 mb-1">{stat.value}</h4>
                <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Recent Orders - Takes up 2 columns */}
            <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <h3 className="text-lg font-extrabold text-gray-900 flex items-center gap-2 tracking-tight">
                  <ShoppingCart className="w-5 h-5 text-prodmast-primary" />
                  Recent Shop Orders
                </h3>
                <button 
                  onClick={() => setViewState('orders')}
                  className="text-sm font-bold text-prodmast-primary hover:text-prodmast-dark transition-colors">View All</button>
              </div>
              
              <div className="p-0 overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Order ID</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Customer</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Amount & Items</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {recentOrders.map((order, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="text-sm font-bold text-gray-900">{order.orderId}</span>
                          <span className="block text-xs text-gray-500 mt-0.5">{order.date}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-bold text-gray-800">{order.user}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-bold text-green-600 block">{order.amount}</span>
                          <span className="text-xs text-gray-500 truncate max-w-[200px] block" title={order.items}>{order.items}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-widest ${
                            order.status === 'Processing' || order.status === 'Pending' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            order.status === 'Shipped' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                            'bg-green-50 text-green-700 border border-green-200'
                          }`}>
                            {order.status === 'Delivered' && <CheckCircle2 className="w-3 h-3" />}
                            {order.status === 'Shipped' && <Package className="w-3 h-3" />}
                            {(order.status === 'Processing' || order.status === 'Pending') && <Clock className="w-3 h-3" />}
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Registrations - Takes 1 column */}
            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <h3 className="text-lg font-extrabold text-gray-900 flex items-center gap-2 tracking-tight">
                  <Users className="w-5 h-5 text-blue-500" />
                  New Registrations
                </h3>
              </div>
              <div className="p-6 space-y-6">
                {recentRegistrations.map((user) => (
                  <div key={user.id} className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-700 shrink-0">
                      {user.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="text-sm font-bold text-gray-900 truncate">{user.name}</p>
                        <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap ml-2">{user.joined}</span>
                      </div>
                      <p className="text-xs text-gray-500 font-medium mb-1">{user.phone}</p>
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] text-gray-400 flex items-center gap-1 font-medium truncate">
                          <MapPin className="w-3 h-3" /> {user.location}
                        </p>
                        {user.status === 'Active' ? (
                          <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-gray-100 bg-gray-50 mt-auto">
                <button 
                  onClick={() => setViewState('users')}
                  className="w-full py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                >
                  Manage Users
                </button>
              </div>
            </div>

          </div>
        </>
      ) : viewState === 'orders' ? (
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <h3 className="text-xl font-extrabold text-gray-900">All Shop Orders</h3>
            <span className="px-3 py-1 bg-prodmast-primary/10 text-prodmast-primary rounded-lg text-xs font-bold uppercase tracking-wider">
              {allOrders.length} Total
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Order ID</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {allOrders.map((order, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-900">{order.orderId}</td>
                    <td className="px-6 py-4 font-bold text-gray-800">{order.user}</td>
                    <td className="px-6 py-4 font-bold text-green-600">{order.amount}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-widest ${
                        order.status === 'Processing' || order.status === 'Pending' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        order.status === 'Shipped' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        'bg-green-50 text-green-700 border border-green-200'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{order.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <h3 className="text-xl font-extrabold text-gray-900">User Management</h3>
            <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg text-xs font-bold uppercase tracking-wider">
              {allRegistrations.length} Farmers
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-8">
            {allRegistrations.map((user) => (
              <div key={user.id} className="bg-gray-50 border border-gray-100 rounded-[24px] p-6 hover:border-blue-300 transition-all group">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-xl shadow-lg">
                    {user.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors">{user.name}</h4>
                    <p className="text-xs text-gray-500 font-medium">{user.phone}</p>
                  </div>
                </div>
                <div className="space-y-2 border-t border-gray-200/50 pt-4 mt-4">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400 font-bold uppercase tracking-wider">Joined</span>
                    <span className="text-gray-700 font-bold">{user.joined}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400 font-bold uppercase tracking-wider">Location</span>
                    <span className="text-gray-700 font-bold">{user.location}</span>
                  </div>
                  <div className="flex justify-between text-xs items-center">
                    <span className="text-gray-400 font-bold uppercase tracking-wider">Status</span>
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
