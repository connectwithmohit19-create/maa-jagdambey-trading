import { useEffect, useState } from 'react';
import { getDashboardStats, getLowStockProducts } from '../lib/api';

function StatCard({ label, value, icon, color, sub }) {
  return (
    <div className="card p-5 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <span className="text-xl">{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-stone-400 text-xs font-medium uppercase tracking-wide truncate">{label}</p>
        <p className="text-stone-900 text-2xl font-bold mt-0.5 leading-none">{value}</p>
        {sub && <p className="text-stone-400 text-xs mt-1">{sub}</p>}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    'Delivered':  'bg-green-50 text-green-700 border-green-200',
    'Confirmed':  'bg-blue-50 text-blue-700 border-blue-200',
    'Pending':    'bg-amber-50 text-amber-700 border-amber-200',
    'Cancelled':  'bg-red-50 text-red-600 border-red-200',
    'Paid':       'bg-green-50 text-green-700 border-green-200',
    'Partial':    'bg-amber-50 text-amber-700 border-amber-200',
    'Unpaid':     'bg-red-50 text-red-600 border-red-200',
  };
  const cls = map[status] || 'bg-stone-100 text-stone-600';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {status}
    </span>
  );
}

export default function Dashboard() {
  const [stats, setStats]       = useState(null);
  const [orders, setOrders]     = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [statsRes, lowStockRes] = await Promise.all([
          getDashboardStats(),
          getLowStockProducts(),
        ]);
        setStats(statsRes.data.stats);
        setOrders(statsRes.data.recentOrders);
        setLowStock(lowStockRes.data.products);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const fmt = (n) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card p-5 h-24 shimmer" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-8 text-center">
        <p className="text-red-500 text-sm">{error}</p>
        <button onClick={() => window.location.reload()} className="btn-secondary mt-4 text-sm">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Active Customers"
          value={stats.totalCustomers.toLocaleString('en-IN')}
          icon="👥"
          color="bg-blue-50"
          sub="Total registered"
        />
        <StatCard
          label="Products"
          value={stats.totalProducts.toLocaleString('en-IN')}
          icon="📦"
          color="bg-purple-50"
          sub="In catalogue"
        />
        <StatCard
          label="Orders This Month"
          value={stats.monthlyOrders.toLocaleString('en-IN')}
          icon="🛒"
          color="bg-brand-50"
          sub="Last 30 days"
        />
        <StatCard
          label="Monthly Revenue"
          value={fmt(stats.monthlyRevenue)}
          icon="💰"
          color="bg-green-50"
          sub="Last 30 days"
        />
        <StatCard
          label="Pending Payments"
          value={fmt(stats.pendingPayments)}
          icon="⏳"
          color="bg-amber-50"
          sub="Outstanding"
        />
        <StatCard
          label="Low Stock Alert"
          value={stats.lowStockCount}
          icon="⚠️"
          color="bg-red-50"
          sub="Need reorder"
        />
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Recent Orders */}
        <div className="lg:col-span-3 card">
          <div className="px-5 py-4 border-b border-stone-100">
            <h3 className="font-semibold text-stone-900">Recent Orders</h3>
            <p className="text-xs text-stone-400 mt-0.5">Last 5 orders</p>
          </div>
          <div className="overflow-x-auto">
            {orders.length === 0 ? (
              <div className="p-8 text-center text-stone-400 text-sm">No orders yet</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-100">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-stone-400 uppercase">Order</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-stone-400 uppercase">Customer</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-stone-400 uppercase hidden md:table-cell">Amount</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-stone-400 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.order_id} className="border-b border-stone-50 hover:bg-stone-50/50 transition-colors">
                      <td className="px-5 py-3">
                        <p className="font-medium text-stone-800">{order.order_number}</p>
                        <p className="text-xs text-stone-400">{new Date(order.order_date).toLocaleDateString('en-IN')}</p>
                      </td>
                      <td className="px-3 py-3">
                        <p className="text-stone-700 truncate max-w-[140px]">{order.customer_name}</p>
                        {order.shop_name && <p className="text-xs text-stone-400 truncate max-w-[140px]">{order.shop_name}</p>}
                      </td>
                      <td className="px-3 py-3 hidden md:table-cell">
                        <p className="font-medium text-stone-800">{fmt(order.total_amount)}</p>
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge status={order.payment_status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Low Stock Alert */}
        <div className="lg:col-span-2 card">
          <div className="px-5 py-4 border-b border-stone-100">
            <h3 className="font-semibold text-stone-900">Low Stock Alert</h3>
            <p className="text-xs text-stone-400 mt-0.5">Products needing reorder</p>
          </div>
          <div className="p-3 space-y-1.5 max-h-80 overflow-y-auto">
            {lowStock.length === 0 ? (
              <div className="p-4 text-center text-stone-400 text-sm">✅ All products are well stocked</div>
            ) : (
              lowStock.map((p) => (
                <div key={p.product_id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-stone-50 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                    <span className="text-red-500 text-xs font-bold">{p.current_stock}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-stone-800 font-medium truncate">{p.product_name}</p>
                    <p className="text-xs text-stone-400">{p.brand} · Min: {p.minimum_stock}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
