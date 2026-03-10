import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPayments } from '../lib/api';

export default function Payments() {
  const navigate = useNavigate();
  const [payments, setPayments]     = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [totalCollected, setTotal]  = useState(0);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');

  const fetchPayments = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search.trim()) params.search = search.trim();
      const res = await getPayments(params);
      setPayments(res.data.payments);
      setPagination(res.data.pagination);
      setTotal(res.data.totalCollected);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const fmt = (n) =>
    `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const methodColors = {
    Cash:   'bg-green-50 text-green-700 border-green-200',
    UPI:    'bg-blue-50 text-blue-700 border-blue-200',
    NEFT:   'bg-purple-50 text-purple-700 border-purple-200',
    Cheque: 'bg-stone-100 text-stone-600 border-stone-200',
    Credit: 'bg-amber-50 text-amber-700 border-amber-200',
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <input
          type="text"
          placeholder="Search by customer, payment no..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field max-w-xs"
        />
        <button onClick={() => navigate('/orders/new')} className="btn-primary flex items-center gap-2 whitespace-nowrap text-sm">
          + New Order / Collect Payment
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="card p-4">
          <p className="text-xs text-stone-400 uppercase font-semibold tracking-wide">Total Collected</p>
          <p className="text-xl font-bold text-green-700 mt-1">{fmt(totalCollected)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-stone-400 uppercase font-semibold tracking-wide">Total Transactions</p>
          <p className="text-xl font-bold text-stone-800 mt-1">{pagination.total}</p>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-stone-400 uppercase">Payment No.</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-stone-400 uppercase">Customer</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-stone-400 uppercase hidden sm:table-cell">Order</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-stone-400 uppercase hidden md:table-cell">Date</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-stone-400 uppercase">Method</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-stone-400 uppercase">Amount</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-stone-50">
                    {[...Array(6)].map((_, j) => (
                      <td key={j} className="px-3 py-4"><div className="h-4 rounded shimmer" /></td>
                    ))}
                  </tr>
                ))
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-14 text-center">
                    <div className="flex flex-col items-center gap-2 text-stone-400">
                      <span className="text-4xl">💳</span>
                      <p className="text-sm">{search ? 'No payments match your search.' : 'No payments recorded yet.'}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr
                    key={p.payment_id}
                    onClick={() => p.order_id && navigate(`/orders/${p.order_id}`)}
                    className={`border-b border-stone-50 transition-colors ${p.order_id ? 'hover:bg-stone-50 cursor-pointer' : ''}`}
                  >
                    <td className="px-5 py-3">
                      <p className="font-semibold text-stone-700">{p.payment_number}</p>
                      {p.transaction_ref && (
                        <p className="text-xs text-stone-400">Ref: {p.transaction_ref}</p>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-medium text-stone-900 truncate max-w-[140px]">{p.customer_name}</p>
                      {p.shop_name && <p className="text-xs text-stone-400 truncate max-w-[140px]">{p.shop_name}</p>}
                    </td>
                    <td className="px-3 py-3 hidden sm:table-cell">
                      {p.order_number ? (
                        <span className="text-brand-600 font-medium text-xs">{p.order_number}</span>
                      ) : (
                        <span className="text-stone-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 hidden md:table-cell">
                      <span className="text-stone-500 text-xs">
                        {new Date(p.payment_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${methodColors[p.payment_method] || 'bg-stone-100 text-stone-600'}`}>
                        {p.payment_method}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <p className="font-bold text-green-700">{fmt(p.amount)}</p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {pagination.pages > 1 && (
          <div className="px-5 py-3 border-t border-stone-100 flex items-center justify-between">
            <p className="text-xs text-stone-400">
              {pagination.total} total payments
            </p>
            <div className="flex gap-2">
              <button onClick={() => fetchPayments(pagination.page - 1)} disabled={pagination.page === 1}
                className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40">Previous</button>
              <button onClick={() => fetchPayments(pagination.page + 1)} disabled={pagination.page === pagination.pages}
                className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
