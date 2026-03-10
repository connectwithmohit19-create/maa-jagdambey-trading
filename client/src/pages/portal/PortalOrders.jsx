import { useEffect, useState } from 'react';
import { useNavigate, useParams, Routes, Route } from 'react-router-dom';
import { portalGetOrders, portalGetOrder } from '../../lib/api';

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

function Badge({ label, colorMap }) {
  const cls = colorMap[label] || 'bg-stone-100 text-stone-600';
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>{label}</span>;
}

// ─── Order Detail ─────────────────────────────────────────────
function PortalOrderDetail() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    portalGetOrder(id)
      .then(res => setData(res.data))
      .catch(err => { if (err.response?.status === 404) navigate('/portal/orders'); })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const printInvoice = () => {
    if (!data) return;
    const { order, items } = data;
    const itemRows = items.map((item, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${item.product_name}</strong><br/><small>${item.brand || ''} · HSN: ${item.hsn_code || '—'}</small></td>
        <td style="text-align:center">${item.quantity} ${item.unit || 'Pcs'}</td>
        <td style="text-align:right">₹${Number(item.unit_price).toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
        <td style="text-align:center">${item.tax_percentage}%</td>
        <td style="text-align:right">₹${Number(item.tax_amount).toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
        <td style="text-align:right"><strong>₹${Number(item.total_amount).toLocaleString('en-IN', {minimumFractionDigits:2})}</strong></td>
      </tr>
    `).join('');

    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Invoice ${order.order_number}</title>
    <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:11px;padding:20px}.header{display:flex;justify-content:space-between;border-bottom:3px solid #ea580c;padding-bottom:14px;margin-bottom:14px}.brand{font-size:20px;font-weight:bold;color:#ea580c}.inv-title{text-align:right}h2{color:#ea580c;font-size:18px}.parties{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:14px}.party{background:#fafaf9;border:1px solid #e7e5e4;border-radius:6px;padding:10px}h4{font-size:9px;text-transform:uppercase;color:#a8a29e;margin-bottom:5px}table{width:100%;border-collapse:collapse;margin-bottom:14px}thead tr{background:#ea580c;color:white}th{padding:7px;font-size:10px;text-align:left}tbody td{padding:7px;border-bottom:1px solid #f0efee;font-size:10px}tbody tr:nth-child(even){background:#fafaf9}.totals{float:right;border:1px solid #e7e5e4;border-radius:6px;overflow:hidden;min-width:240px}.tr{display:flex;justify-content:space-between;padding:5px 10px;border-bottom:1px solid #f0efee;font-size:11px}.tr.grand{background:#ea580c;color:white;font-weight:bold;font-size:13px;border:none}.footer{clear:both;border-top:1px solid #e7e5e4;padding-top:10px;margin-top:14px;display:flex;justify-content:space-between}.sig{text-align:right;font-size:10px}.sig .line{border-top:1px solid #ccc;width:120px;margin-top:25px;padding-top:3px}@media print{@page{margin:12mm}}</style></head><body>
    <div class="header"><div><div class="brand">Maa Jagdambey Trading</div><div style="color:#666;font-size:11px">Electronics & Appliances Wholesale, Lucknow</div></div><div class="inv-title"><h2>TAX INVOICE</h2><p><strong>${order.order_number}</strong></p><p>${new Date(order.order_date).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}</p></div></div>
    <div class="parties"><div class="party"><h4>Bill To</h4><strong>${order.customer_name}</strong>${order.shop_name?`<br/>${order.shop_name}`:''}${order.contact_number?`<br/>📞 ${order.contact_number}`:''}${order.customer_address?`<br/>${order.customer_address}`:''}${order.customer_gst?`<br/>GSTIN: ${order.customer_gst}`:''}</div><div class="party"><h4>Order Info</h4><span>Status: ${order.order_status}</span><br/><span>Payment: ${order.payment_status}</span><br/><span>Method: ${order.payment_method}</span></div></div>
    <table><thead><tr><th>#</th><th>Product</th><th style="text-align:center">Qty</th><th style="text-align:right">Rate</th><th style="text-align:center">GST%</th><th style="text-align:right">GST Amt</th><th style="text-align:right">Total</th></tr></thead><tbody>${itemRows}</tbody></table>
    <div class="totals"><div class="tr"><span>Subtotal</span><span>₹${Number(order.subtotal).toLocaleString('en-IN',{minimumFractionDigits:2})}</span></div>${parseFloat(order.discount_amount)>0?`<div class="tr"><span>Discount</span><span>-₹${Number(order.discount_amount).toLocaleString('en-IN',{minimumFractionDigits:2})}</span></div>`:''}<div class="tr"><span>GST</span><span>₹${Number(order.tax_amount).toLocaleString('en-IN',{minimumFractionDigits:2})}</span></div><div class="tr grand"><span>TOTAL</span><span>₹${Number(order.total_amount).toLocaleString('en-IN',{minimumFractionDigits:2})}</span></div><div class="tr" style="color:#16a34a"><span>Paid</span><span>₹${Number(order.paid_amount).toLocaleString('en-IN',{minimumFractionDigits:2})}</span></div><div class="tr" style="color:#d97706;font-weight:bold"><span>Balance</span><span>₹${Number(order.balance_amount).toLocaleString('en-IN',{minimumFractionDigits:2})}</span></div></div>
    <div class="footer"><div style="font-size:10px;color:#78716c"><p>Thank you for your business!</p><p>This is a computer-generated invoice.</p></div><div class="sig"><div class="line">Authorized Signature</div><div>Maa Jagdambey Trading</div></div></div>
    </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 500);
  };

  if (loading) return <div className="space-y-3">{[...Array(2)].map((_,i) => <div key={i} className="card p-4 h-28 shimmer" />)}</div>;
  if (!data) return null;
  const { order, items, payments } = data;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 justify-between flex-wrap">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/portal/orders')} className="p-2 rounded-lg text-stone-400 hover:bg-stone-100 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-stone-900">{order.order_number}</h2>
              <Badge label={order.order_status} colorMap={statusColors} />
              <Badge label={order.payment_status} colorMap={payColors} />
            </div>
            <p className="text-xs text-stone-400">{new Date(order.order_date).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })}</p>
          </div>
        </div>
        <button onClick={printInvoice} className="btn-secondary flex items-center gap-2 text-sm">
          🖨️ Print Invoice
        </button>
      </div>

      {/* Items */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100"><h3 className="font-semibold text-stone-700 text-sm">Order Items</h3></div>
        <div className="divide-y divide-stone-50">
          {items.map((item) => (
            <div key={item.order_item_id} className="px-5 py-3 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-stone-900 text-sm">{item.product_name}</p>
                <p className="text-xs text-stone-400">{item.brand} · HSN: {item.hsn_code || '—'}</p>
                <p className="text-xs text-stone-500 mt-0.5">
                  {item.quantity} {item.unit || 'pcs'} × {fmt(item.unit_price)} + GST {item.tax_percentage}%
                </p>
              </div>
              <p className="font-semibold text-stone-800 text-sm flex-shrink-0">{fmt(item.total_amount)}</p>
            </div>
          ))}
        </div>
        {/* Totals */}
        <div className="px-5 py-4 border-t border-stone-100 space-y-1.5 text-sm">
          <div className="flex justify-between text-stone-500"><span>Subtotal</span><span>{fmt(order.subtotal)}</span></div>
          {parseFloat(order.discount_amount) > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-{fmt(order.discount_amount)}</span></div>}
          <div className="flex justify-between text-stone-500"><span>GST</span><span>{fmt(order.tax_amount)}</span></div>
          <div className="flex justify-between font-bold text-stone-900 text-base border-t pt-2 mt-2"><span>Total</span><span>{fmt(order.total_amount)}</span></div>
          <div className="flex justify-between text-green-600"><span>Paid</span><span>{fmt(order.paid_amount)}</span></div>
          <div className={`flex justify-between font-bold ${parseFloat(order.balance_amount) > 0 ? 'text-amber-600' : 'text-green-600'}`}>
            <span>Balance</span><span>{fmt(order.balance_amount)}</span>
          </div>
        </div>
      </div>

      {/* Payment history */}
      {payments.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-100"><h3 className="font-semibold text-stone-700 text-sm">Payment History</h3></div>
          <div className="divide-y divide-stone-50">
            {payments.map((p) => (
              <div key={p.payment_id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-stone-800">{p.payment_number}</p>
                  <p className="text-xs text-stone-400">{new Date(p.payment_date).toLocaleDateString('en-IN')} · {p.payment_method}</p>
                </div>
                <p className="font-semibold text-green-700">{fmt(p.amount)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Orders List ──────────────────────────────────────────────
function PortalOrdersList() {
  const navigate = useNavigate();
  const [orders, setOrders]     = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('');

  const fetchOrders = async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (filter) params.status = filter;
      const res = await portalGetOrders(params);
      setOrders(res.data.orders);
      setPagination(res.data.pagination);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchOrders(); }, [filter]);

  const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="font-bold text-stone-900">My Orders</h2>
        <div className="flex gap-1 bg-stone-100 p-1 rounded-xl">
          {[['','All'],['Paid','Paid'],['Partial','Partial'],['Unpaid','Unpaid']].map(([v,l]) => (
            <button key={v} onClick={() => setFilter(v)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${filter === v ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="divide-y divide-stone-50">
            {[...Array(4)].map((_,i) => <div key={i} className="p-4 h-16 shimmer m-4 rounded-lg" />)}
          </div>
        ) : orders.length === 0 ? (
          <div className="py-14 text-center">
            <p className="text-4xl">📦</p>
            <p className="text-stone-400 text-sm mt-2">No orders found.</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-50">
            {orders.map((o) => (
              <div
                key={o.order_id}
                onClick={() => navigate(`/portal/orders/${o.order_id}`)}
                className="flex items-center gap-4 px-5 py-4 hover:bg-stone-50 cursor-pointer transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-brand-700">{o.order_number}</p>
                    <Badge label={o.order_status} colorMap={statusColors} />
                    <Badge label={o.payment_status} colorMap={payColors} />
                  </div>
                  <p className="text-xs text-stone-400 mt-0.5">
                    {new Date(o.order_date).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-stone-800">{fmt(o.total_amount)}</p>
                  {parseFloat(o.balance_amount) > 0 && (
                    <p className="text-xs text-amber-600">Due: {fmt(o.balance_amount)}</p>
                  )}
                </div>
                <svg className="w-4 h-4 text-stone-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </div>
            ))}
          </div>
        )}
        {pagination.pages > 1 && (
          <div className="px-5 py-3 border-t border-stone-100 flex items-center justify-between">
            <p className="text-xs text-stone-400">{pagination.total} total orders</p>
            <div className="flex gap-2">
              <button onClick={() => fetchOrders(pagination.page - 1)} disabled={pagination.page === 1}
                className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40">← Prev</button>
              <button onClick={() => fetchOrders(pagination.page + 1)} disabled={pagination.page === pagination.pages}
                className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40">Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Export routing wrapper ───────────────────────────────────
export { PortalOrdersList, PortalOrderDetail };
export default PortalOrdersList;
