import { useEffect, useState } from 'react';
import { portalGetPayments } from '../../lib/api';

export default function PortalPayments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [total, setTotal]       = useState(0);

  useEffect(() => {
    portalGetPayments()
      .then(res => {
        setPayments(res.data.payments);
        const t = res.data.payments.reduce((s, p) => s + parseFloat(p.amount), 0);
        setTotal(t);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const methodColors = {
    Cash:   'bg-green-50 text-green-700 border-green-200',
    UPI:    'bg-blue-50 text-blue-700 border-blue-200',
    NEFT:   'bg-purple-50 text-purple-700 border-purple-200',
    Cheque: 'bg-stone-100 text-stone-600 border-stone-200',
  };

  return (
    <div className="space-y-4">
      <h2 className="font-bold text-stone-900">Payment History</h2>

      <div className="card p-4 bg-green-50 border border-green-200">
        <p className="text-xs text-green-700 font-semibold uppercase">Total Paid</p>
        <p className="text-2xl font-bold text-green-800 mt-1">{fmt(total)}</p>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {[...Array(4)].map((_,i) => <div key={i} className="h-12 shimmer rounded-lg" />)}
          </div>
        ) : payments.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-4xl">💳</p>
            <p className="text-stone-400 text-sm mt-2">No payments recorded yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-50">
            {payments.map((p) => (
              <div key={p.payment_id} className="flex items-center gap-4 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-stone-800 text-sm">{p.payment_number}</p>
                  <p className="text-xs text-stone-400">
                    {new Date(p.payment_date).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
                    {p.order_number && ` · ${p.order_number}`}
                  </p>
                </div>
                <span className={`hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${methodColors[p.payment_method] || 'bg-stone-100 text-stone-600'}`}>
                  {p.payment_method}
                </span>
                <p className="font-bold text-green-700 flex-shrink-0">{fmt(p.amount)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
