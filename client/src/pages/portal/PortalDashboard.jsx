import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { portalGetDashboard } from '../../lib/api';

const statusColors = {
  Confirmed: 'bg-blue-50 text-blue-700 border-blue-200',
  Delivered: 'bg-green-50 text-green-700 border-green-200',
  Pending:   'bg-amber-50 text-amber-700 border-amber-200',
  Cancelled: 'bg-red-50 text-red-600 border-red-200',
};
const payColors = {
  Paid:    'bg-green-50 text-green-700 border-green-200',
  Partial: 'bg-amber-50 text-amber-700 border-amber-200',
  Unpaid:  'bg-red-50 text-red-600 border-red-200',
};

export default function PortalDashboard() {
  const navigate = useNavigate();
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const customer = JSON.parse(localStorage.getItem('mjt_portal_customer') || '{}');

  useEffect(() => {
    portalGetDashboard()
      .then(res => setData(res.data))
      .catch(err => { if (err.response?.status === 401) navigate('/portal/login'); })
      .finally(() => setLoading(false));
  }, [navigate]);

  const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-28 rounded-2xl shimmer" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_,i) => <div key={i} className="card p-4 h-20 shimmer" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Welcome banner */}
      <div className="rounded-2xl bg-gradient-to-r from-stone-900 to-stone-800 p-6 text-white">
        <p className="text-stone-400 text-sm">Welcome back,</p>
        <h2 className="font-display font-bold text-2xl mt-0.5">{customer.name}</h2>
        {customer.shopName && <p className="text-stone-400 text-sm mt-0.5">{customer.shopName}</p>}
        {data && parseFloat(data.balance) > 0 ? (
          <div className="mt-4 p-3 bg-amber-500/20 border border-amber-500/30 rounded-xl">
            <p className="text-amber-300 text-xs font-medium">Outstanding Balance</p>
            <p className="text-amber-200 font-bold text-xl">{fmt(data.balance)}</p>
            <p className="text-amber-400 text-xs mt-0.5">Please clear at your earliest convenience</p>
          </div>
        ) : data ? (
          <div className="mt-4 p-3 bg-green-500/20 border border-green-500/30 rounded-xl">
            <p className="text-green-300 text-xs font-medium">✅ All Clear</p>
            <p className="text-green-200 text-sm">No outstanding balance. Thank you!</p>
          </div>
        ) : null}
      </div>

      {/* Stats */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Orders', value: data.totalOrders, color: 'text-stone-800' },
            { label: 'Paid Orders', value: data.paidOrders, color: 'text-green-700' },
            { label: 'Total Spent', value: fmt(data.totalSpent), color: 'text-brand-700' },
            { label: 'Total Paid', value: fmt(data.totalPaid), color: 'text-green-700' },
          ].map((s, i) => (
            <div key={i} className="card p-4">
              <p className="text-xs text-stone-400 uppercase font-semibold tracking-wide">{s.label}</p>
              <p className={`text-lg font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Recent orders */}
      {data?.recentOrders?.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
            <h3 className="font-semibold text-stone-700 text-sm">Recent Orders</h3>
            <button onClick={() => navigate('/portal/orders')} className="text-xs text-brand-600 hover:underline">
              View All →
            </button>
          </div>
          <div className="divide-y divide-stone-50">
            {data.recentOrders.map((o) => (
              <div
                key={o.order_id}
                onClick={() => navigate(`/portal/orders/${o.order_id}`)}
                className="flex items-center gap-4 px-5 py-3 hover:bg-stone-50 cursor-pointer transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-brand-700 text-sm">{o.order_number}</p>
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium border ${statusColors[o.order_status] || ''}`}>{o.order_status}</span>
                  </div>
                  <p className="text-xs text-stone-400 mt-0.5">{new Date(o.order_date).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-stone-800 text-sm">{fmt(o.total_amount)}</p>
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium border ${payColors[o.payment_status] || ''}`}>{o.payment_status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contact card */}
      <div className="card p-5 bg-brand-50 border border-brand-200">
        <p className="font-semibold text-brand-800 text-sm">Need Help?</p>
        <p className="text-stone-500 text-xs mt-1">Contact Maa Jagdambey Trading for any queries about your orders or account.</p>
        <p className="text-brand-700 text-sm font-medium mt-2">📍 Lucknow, Uttar Pradesh</p>
      </div>
    </div>
  );
}
