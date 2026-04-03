import { useState, useEffect } from 'react';
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

export function AdminDashboard() {
  const [loading, setLoading] = useState(true);

  // Mock Data for Admin View
  const stats = [
    { label: "Total Registered Users", value: "8,245", trend: "+124 this week", icon: <Users className="w-6 h-6 text-blue-500" /> },
    { label: "Active Daily Farmers", value: "3,120", trend: "+12% vs last month", icon: <Activity className="w-6 h-6 text-green-500" /> },
    { label: "Total Shop Orders", value: "1,452", trend: "18 pending dispatch", icon: <ShoppingCart className="w-6 h-6 text-purple-500" /> },
    { label: "Platform Revenue", value: "₹4,25,000", trend: "+5.2% this week", icon: <TrendingUp className="w-6 h-6 text-amber-500" /> }
  ];

  const recentRegistrations = [
    { id: 1, name: "Farmers Collab Co.", phone: "+91 98765 43210", location: "Bengaluru, Karnataka", joined: "2 hours ago", status: "Active" },
    { id: 2, name: "Shivashankar", phone: "+91 99887 76655", location: "Hubballi, Karnataka", joined: "5 hours ago", status: "Pending Verification" },
    { id: 3, name: "Ramesh Kumar", phone: "+91 91234 56789", location: "Mysuru, Karnataka", joined: "1 day ago", status: "Active" },
    { id: 4, name: "Green Valley Farms", phone: "+91 88990 01122", location: "Belagavi, Karnataka", joined: "2 days ago", status: "Active" }
  ];

  const recentOrders = [
    { orderId: "ORD-9932", user: "Ramesh Kumar", items: "Premium Wheat Seeds x2, NPK 20-20-20", amount: "₹4,500", status: "Processing", date: "Today" },
    { orderId: "ORD-9931", user: "Shivashankar", items: "Organic Pesticide 1L", amount: "₹850", status: "Shipped", date: "Yesterday" },
    { orderId: "ORD-9930", user: "Green Valley Farms", items: "Drip Irrigation Kit (Basic)", amount: "₹12,000", status: "Delivered", date: "Oct 12" },
    { orderId: "ORD-9929", user: "Farmers Collab Co.", items: "Hybrid Corn Seeds x5", amount: "₹3,200", status: "Delivered", date: "Oct 10" }
  ];

  useEffect(() => {
    // Simulate data loading
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-prodmast-primary">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-prodmast-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20">
      {/* Admin Header */}
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
      </div>

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
            <button className="text-sm font-bold text-prodmast-primary hover:text-prodmast-dark transition-colors">View All</button>
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
                        order.status === 'Processing' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        order.status === 'Shipped' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        'bg-green-50 text-green-700 border border-green-200'
                      }`}>
                        {order.status === 'Delivered' && <CheckCircle2 className="w-3 h-3" />}
                        {order.status === 'Shipped' && <Package className="w-3 h-3" />}
                        {order.status === 'Processing' && <Clock className="w-3 h-3" />}
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
            <button className="w-full py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors">
              Manage Users
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
