import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getOrders, updateOrderStatus } from '../lib/api';

const statusColors = {
  Confirmed:  'bg-blue-50 text-blue-700 border-blue-200',
  Delivered:  'bg-green-50 text-green-700 border-green-200',
  Pending:    'bg-amber-50 text-amber-700 border-amber-200',
  Cancelled:  'bg-red-50 text-red-600 border-red-200',
};
const paymentColors = {
  Paid:    'bg-green-50 text-green-700 border-green-200',
  Partial: 'bg-amber-50 text-amber-700 border-amber-200',
  Unpaid:  'bg-red-50 text-red-600 border-red-200',
};

function Badge({ label, colorMap }) {
  const cls = colorMap[label] || 'bg-stone-100 text-stone-600';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {label}
    </span>
  );
}

export default function Orders() {
  const navigate = useNavigate();
  const [orders, setOrders]         = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatus]   = useState('');
  const [payFilter, setPayFilter]   = useState('');

  const fetchOrders = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search.trim()) params.search = search.trim();
      if (statusFilter)  params.status = statusFilter;
      if (payFilter)     params.payment_status = payFilter;
      const res = await getOrders(params);
      setOrders(res.data.orders);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, payFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const handleMarkDelivered = async (e, id) => {
    e.stopPropagation();
    try {
      await updateOrderStatus(id, 'Delivered');
      fetchOrders(pagination.page);
    } catch (err) { console.error(err); }
  };

  const fmt = (n) =>
    `₹${Number(n || 0).toLocaleString('en-IN')}`;

  const totalPending = orders.reduce((s, o) => s + parseFloat(o.balance_amount || 0), 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-2 flex-1">
          <input
            type="text"
            placeholder="Search order, customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field w-52"
          />
          <select value={statusFilter} onChange={(e) => setStatus(e.target.value)} className="input-field w-36">
            <option value="">All Status</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Delivered">Delivered</option>
            <option value="Pending">Pending</option>
            <option value="Cancelled">Cancelled</option>
          </select>
          <select value={payFilter} onChange={(e) => setPayFilter(e.target.value)} className="input-field w-36">
            <option value="">All Payment</option>
            <option value="Paid">Paid</option>
            <option value="Partial">Partial</option>
            <option value="Unpaid">Unpaid</option>
          </select>
        </div>
        <button
          onClick={() => navigate('/orders/new')}
          className="btn-primary flex items-center gap-2 whitespace-nowrap"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New Order
        </button>
      </div>

      {/* Summary strip */}
      <div className="flex gap-3 flex-wrap">
        <div className="px-3 py-2 bg-white border border-stone-100 rounded-lg text-xs text-stone-500 shadow-sm">
          Total Orders: <span className="font-semibold text-stone-800">{pagination.total}</span>
        </div>
        <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
          Pending Balance: <span className="font-semibold">{fmt(totalPending)}</span>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-stone-400 uppercase">Order</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-stone-400 uppercase">Customer</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-stone-400 uppercase hidden md:table-cell">Amount</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-stone-400 uppercase hidden lg:table-cell">Balance</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-stone-400 uppercase">Order</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-stone-400 uppercase">Payment</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-stone-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i} className="border-b border-stone-50">
                    {[...Array(7)].map((_, j) => (
                      <td key={j} className="px-3 py-4"><div className="h-4 rounded shimmer" /></td>
                    ))}
                  </tr>
                ))
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-14 text-center">
                    <div className="flex flex-col items-center gap-2 text-stone-400">
                      <span className="text-4xl">📦</span>
                      <p className="text-sm">{search ? 'No orders match your search.' : 'No orders yet.'}</p>
                      {!search && (
                        <button onClick={() => navigate('/orders/new')} className="btn-primary text-xs mt-2 px-4 py-2">
                          Create First Order
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr
                    key={o.order_id}
                    onClick={() => navigate(`/orders/${o.order_id}`)}
                    className="border-b border-stone-50 hover:bg-brand-50/30 cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-3">
                      <p className="font-semibold text-brand-700">{o.order_number}</p>
                      <p className="text-xs text-stone-400">
                        {new Date(o.order_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-medium text-stone-900 truncate max-w-[150px]">{o.customer_name}</p>
                      {o.shop_name && <p className="text-xs text-stone-400 truncate max-w-[150px]">{o.shop_name}</p>}
                    </td>
                    <td className="px-3 py-3 hidden md:table-cell">
                      <p className="font-semibold text-stone-800">{fmt(o.total_amount)}</p>
                      <p className="text-xs text-stone-400">incl. GST</p>
                    </td>
                    <td className="px-3 py-3 hidden lg:table-cell">
                      <p className={`font-medium ${parseFloat(o.balance_amount) > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                        {fmt(o.balance_amount)}
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      <Badge label={o.order_status} colorMap={statusColors} />
                    </td>
                    <td className="px-3 py-3">
                      <Badge label={o.payment_status} colorMap={paymentColors} />
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        {o.order_status !== 'Delivered' && o.order_status !== 'Cancelled' && (
                          <button
                            onClick={(e) => handleMarkDelivered(e, o.order_id)}
                            className="text-xs px-2.5 py-1 bg-green-50 border border-green-200 text-green-700 rounded-lg hover:bg-green-100 transition-colors whitespace-nowrap"
                            title="Mark Delivered"
                          >
                            ✓ Deliver
                          </button>
                        )}
                        <button
                          onClick={() => navigate(`/orders/${o.order_id}`)}
                          className="p-1.5 text-stone-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="px-5 py-3 border-t border-stone-100 flex items-center justify-between">
            <p className="text-xs text-stone-400">
              Showing {((pagination.page - 1) * 20) + 1}–{Math.min(pagination.page * 20, pagination.total)} of {pagination.total}
            </p>
            <div className="flex gap-2">
              <button onClick={() => fetchOrders(pagination.page - 1)} disabled={pagination.page === 1}
                className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40">Previous</button>
              <button onClick={() => fetchOrders(pagination.page + 1)} disabled={pagination.page === pagination.pages}
                className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
