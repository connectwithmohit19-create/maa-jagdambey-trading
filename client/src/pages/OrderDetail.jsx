import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getOrder, updateOrderStatus, recordOrderPayment } from '../lib/api';
import Modal from '../components/Modal';

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
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {label}
    </span>
  );
}

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const invoiceRef = useRef(null);

  const [order, setOrder]     = useState(null);
  const [items, setItems]     = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const [payModal, setPayModal]   = useState(false);
  const [payForm, setPayForm]     = useState({ amount: '', payment_method: 'Cash', transaction_ref: '', notes: '' });
  const [payError, setPayError]   = useState('');
  const [paying, setPaying]       = useState(false);

  const fetchOrder = async () => {
    setLoading(true);
    try {
      const res = await getOrder(id);
      setOrder(res.data.order);
      setItems(res.data.items);
      setPayments(res.data.payments);
    } catch (err) {
      setError('Order not found.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrder(); }, [id]);

  const handleStatusChange = async (status) => {
    try {
      await updateOrderStatus(id, status);
      fetchOrder();
    } catch (err) {
      console.error(err);
    }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    setPayError('');
    if (!payForm.amount || parseFloat(payForm.amount) <= 0) {
      setPayError('Enter a valid amount.');
      return;
    }
    setPaying(true);
    try {
      await recordOrderPayment(id, payForm);
      setPayModal(false);
      setPayForm({ amount: '', payment_method: 'Cash', transaction_ref: '', notes: '' });
      fetchOrder();
    } catch (err) {
      setPayError(err.response?.data?.message || 'Failed to record payment.');
    } finally {
      setPaying(false);
    }
  };

  const printInvoice = () => {
    const w = window.open('', '_blank');
    w.document.write(buildInvoiceHTML(order, items));
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 500);
  };

  const fmt = (n) =>
    `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (loading) {
    return (
      <div className="space-y-4 max-w-5xl mx-auto">
        {[...Array(3)].map((_, i) => <div key={i} className="card p-6 h-32 shimmer" />)}
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="card p-8 text-center text-stone-400">
        <p>{error || 'Order not found.'}</p>
        <button onClick={() => navigate('/orders')} className="btn-secondary mt-4">Back to Orders</button>
      </div>
    );
  }

  const canPay = parseFloat(order.balance_amount) > 0;

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/orders')} className="p-2 rounded-lg text-stone-400 hover:bg-stone-100 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display font-bold text-xl text-stone-900">{order.order_number}</h2>
              <Badge label={order.order_status} colorMap={statusColors} />
              <Badge label={order.payment_status} colorMap={payColors} />
            </div>
            <p className="text-xs text-stone-400 mt-0.5">
              {new Date(order.order_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={printInvoice} className="btn-secondary flex items-center gap-2 text-sm">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Invoice
          </button>
          {canPay && (
            <button onClick={() => setPayModal(true)} className="btn-primary flex items-center gap-2 text-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Record Payment
            </button>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-5">
          {/* Customer info */}
          <div className="card p-5">
            <h3 className="font-semibold text-stone-700 text-sm mb-3">Customer</h3>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-bold text-stone-900">{order.customer_name}</p>
                {order.shop_name && <p className="text-stone-500 text-sm">{order.shop_name}</p>}
                <p className="text-stone-400 text-xs mt-1">{order.contact_number}</p>
                {order.customer_address && (
                  <p className="text-stone-400 text-xs">{order.customer_address}, {order.city} {order.pincode}</p>
                )}
                {order.customer_gst && <p className="text-stone-400 text-xs">GSTIN: {order.customer_gst}</p>}
              </div>
              {order.price_category_name && (
                <span className="px-2 py-1 bg-brand-50 text-brand-700 border border-brand-200 rounded-lg text-xs font-medium">
                  {order.price_category_name}
                </span>
              )}
            </div>
          </div>

          {/* Items */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-100">
              <h3 className="font-semibold text-stone-700 text-sm">Order Items</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-100">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-stone-400">Product</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-stone-400">Qty</th>
                    <th className="text-right px-3 py-3 text-xs font-semibold text-stone-400 hidden sm:table-cell">Rate</th>
                    <th className="text-right px-3 py-3 text-xs font-semibold text-stone-400 hidden md:table-cell">GST</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-stone-400">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.order_item_id} className="border-b border-stone-50">
                      <td className="px-5 py-3">
                        <p className="font-medium text-stone-900">{item.product_name}</p>
                        <p className="text-xs text-stone-400">{item.brand} · {item.sku} · HSN: {item.hsn_code}</p>
                        {parseFloat(item.discount_amount) > 0 && (
                          <p className="text-xs text-green-600">Disc: {item.discount_percentage}% (-{fmt(item.discount_amount)})</p>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center text-stone-700">{item.quantity} {item.unit}</td>
                      <td className="px-3 py-3 text-right text-stone-600 hidden sm:table-cell">{fmt(item.unit_price)}</td>
                      <td className="px-3 py-3 text-right text-stone-500 hidden md:table-cell text-xs">
                        {item.tax_percentage}%<br />{fmt(item.tax_amount)}
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-stone-800">{fmt(item.total_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payments history */}
          {payments.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-stone-100">
                <h3 className="font-semibold text-stone-700 text-sm">Payment History</h3>
              </div>
              <div className="divide-y divide-stone-50">
                {payments.map((p) => (
                  <div key={p.payment_id} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-stone-800">{p.payment_number}</p>
                      <p className="text-xs text-stone-400">
                        {new Date(p.payment_date).toLocaleDateString('en-IN')} · {p.payment_method}
                        {p.transaction_ref && ` · Ref: ${p.transaction_ref}`}
                      </p>
                    </div>
                    <p className="font-semibold text-green-700">{fmt(p.amount)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Summary sidebar */}
        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="font-semibold text-stone-700 text-sm mb-4">Amount Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-stone-500">
                <span>Subtotal</span><span>{fmt(order.subtotal)}</span>
              </div>
              {parseFloat(order.discount_amount) > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span><span>-{fmt(order.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between text-stone-500">
                <span>GST</span><span>{fmt(order.tax_amount)}</span>
              </div>
              <div className="flex justify-between font-bold text-stone-900 text-base border-t pt-2 mt-2">
                <span>Total</span><span>{fmt(order.total_amount)}</span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>Paid</span><span>{fmt(order.paid_amount)}</span>
              </div>
              <div className={`flex justify-between font-bold text-base ${parseFloat(order.balance_amount) > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                <span>Balance</span><span>{fmt(order.balance_amount)}</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-stone-100 text-xs text-stone-400 space-y-1">
              <div className="flex justify-between">
                <span>Method</span><span className="font-medium text-stone-600">{order.payment_method}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery</span><span className="font-medium text-stone-600">{order.delivery_type || 'Pickup'}</span>
              </div>
            </div>
          </div>

          {/* Status management */}
          <div className="card p-5">
            <h3 className="font-semibold text-stone-700 text-sm mb-3">Update Status</h3>
            <div className="grid grid-cols-2 gap-2">
              {['Confirmed', 'Delivered', 'Cancelled'].map((s) => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  disabled={order.order_status === s}
                  className={`text-xs py-2 rounded-lg border font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    order.order_status === s
                      ? 'bg-stone-100 border-stone-200 text-stone-400'
                      : 'bg-white border-stone-200 text-stone-600 hover:border-brand-300 hover:text-brand-600'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {order.notes && (
            <div className="card p-5">
              <h3 className="font-semibold text-stone-700 text-sm mb-2">Notes</h3>
              <p className="text-stone-500 text-sm">{order.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Record Payment Modal */}
      <Modal isOpen={payModal} onClose={() => setPayModal(false)} title="Record Payment" size="sm">
        <form onSubmit={handlePayment} className="space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
            Outstanding balance: <strong>{fmt(order.balance_amount)}</strong>
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Amount (₹) *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">₹</span>
              <input
                type="number" min="1" max={order.balance_amount} step="0.01"
                value={payForm.amount}
                onChange={(e) => setPayForm((p) => ({ ...p, amount: e.target.value }))}
                className="input-field pl-7" placeholder="Enter amount" autoFocus
              />
            </div>
            <button
              type="button"
              onClick={() => setPayForm((p) => ({ ...p, amount: order.balance_amount }))}
              className="text-xs text-brand-600 hover:underline mt-1"
            >
              Pay full balance ({fmt(order.balance_amount)})
            </button>
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Payment Method</label>
            <select value={payForm.payment_method} onChange={(e) => setPayForm((p) => ({ ...p, payment_method: e.target.value }))} className="input-field">
              <option value="Cash">Cash</option>
              <option value="UPI">UPI</option>
              <option value="NEFT">NEFT / Bank Transfer</option>
              <option value="Cheque">Cheque</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Transaction Ref (optional)</label>
            <input value={payForm.transaction_ref}
              onChange={(e) => setPayForm((p) => ({ ...p, transaction_ref: e.target.value }))}
              className="input-field" placeholder="UPI ID / Cheque no." />
          </div>
          {payError && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">{payError}</div>
          )}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setPayModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={paying} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {paying ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
              {paying ? 'Saving...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ─── GST Invoice HTML Generator ──────────────────────────────
function buildInvoiceHTML(order, items) {
  const fmt = (n) =>
    Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const itemRows = items.map((item, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>
        <strong>${item.product_name}</strong><br/>
        <small>${item.brand || ''} ${item.model_number || ''}</small><br/>
        <small>HSN: ${item.hsn_code || '—'}</small>
      </td>
      <td style="text-align:center">${item.quantity} ${item.unit || 'Pcs'}</td>
      <td style="text-align:right">₹${fmt(item.unit_price)}</td>
      <td style="text-align:right">${parseFloat(item.discount_percentage) > 0 ? item.discount_percentage + '%' : '—'}</td>
      <td style="text-align:center">${item.tax_percentage}%</td>
      <td style="text-align:right">₹${fmt(item.tax_amount)}</td>
      <td style="text-align:right"><strong>₹${fmt(item.total_amount)}</strong></td>
    </tr>
  `).join('');

  const dateStr = new Date(order.order_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Invoice ${order.order_number}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 11px; color: #1a1a1a; padding: 20px; }
    .invoice-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #ea580c; padding-bottom: 16px; margin-bottom: 16px; }
    .brand-name { font-size: 22px; font-weight: bold; color: #ea580c; }
    .brand-sub { color: #666; font-size: 11px; margin-top: 2px; }
    .invoice-title { text-align: right; }
    .invoice-title h2 { font-size: 20px; color: #ea580c; }
    .invoice-title p { color: #555; font-size: 11px; margin-top: 2px; }
    .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 16px; }
    .party-box { background: #fafaf9; border: 1px solid #e7e5e4; border-radius: 6px; padding: 12px; }
    .party-box h4 { font-size: 9px; font-weight: bold; text-transform: uppercase; color: #a8a29e; letter-spacing: 0.5px; margin-bottom: 6px; }
    .party-box strong { font-size: 13px; display: block; margin-bottom: 2px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    thead tr { background: #ea580c; color: white; }
    thead th { padding: 8px; text-align: left; font-size: 10px; font-weight: bold; }
    tbody tr:nth-child(even) { background: #fafaf9; }
    tbody td { padding: 8px; border-bottom: 1px solid #f0efee; font-size: 10px; vertical-align: top; }
    .totals { display: flex; justify-content: flex-end; margin-bottom: 20px; }
    .totals-box { border: 1px solid #e7e5e4; border-radius: 6px; overflow: hidden; min-width: 260px; }
    .totals-row { display: flex; justify-content: space-between; padding: 6px 12px; border-bottom: 1px solid #f0efee; font-size: 11px; }
    .totals-row:last-child { border: none; background: #ea580c; color: white; font-weight: bold; font-size: 13px; padding: 10px 12px; }
    .totals-row.paid { color: #16a34a; }
    .totals-row.balance { color: #d97706; font-weight: bold; }
    .footer { border-top: 1px solid #e7e5e4; padding-top: 12px; display: flex; justify-content: space-between; align-items: flex-end; }
    .note { font-size: 10px; color: #78716c; }
    .sig { text-align: right; font-size: 10px; }
    .sig .line { border-top: 1px solid #ccc; width: 120px; margin-top: 30px; padding-top: 4px; }
    @media print {
      body { padding: 0; }
      @page { margin: 15mm; }
    }
  </style>
</head>
<body>
  <div class="invoice-header">
    <div>
      <div class="brand-name">Maa Jagdambey Trading</div>
      <div class="brand-sub">Electronics & Appliances Wholesale</div>
      <div class="brand-sub">Lucknow, Uttar Pradesh</div>
    </div>
    <div class="invoice-title">
      <h2>TAX INVOICE</h2>
      <p><strong>${order.order_number}</strong></p>
      <p>Date: ${dateStr}</p>
    </div>
  </div>

  <div class="parties">
    <div class="party-box">
      <h4>Bill To</h4>
      <strong>${order.customer_name}</strong>
      ${order.shop_name ? `<span>${order.shop_name}</span><br/>` : ''}
      ${order.contact_number ? `<span>📞 ${order.contact_number}</span><br/>` : ''}
      ${order.customer_address ? `<span>${order.customer_address}, ${order.city || ''} ${order.pincode || ''}</span><br/>` : ''}
      ${order.customer_gst ? `<span>GSTIN: ${order.customer_gst}</span>` : ''}
    </div>
    <div class="party-box">
      <h4>Order Details</h4>
      <span><strong>Status:</strong> ${order.order_status}</span><br/>
      <span><strong>Payment:</strong> ${order.payment_status}</span><br/>
      <span><strong>Method:</strong> ${order.payment_method}</span><br/>
      <span><strong>Delivery:</strong> ${order.delivery_type || 'Pickup'}</span>
      ${order.price_category_name ? `<br/><span><strong>Category:</strong> ${order.price_category_name}</span>` : ''}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Product Details</th>
        <th style="text-align:center">Qty</th>
        <th style="text-align:right">Rate</th>
        <th style="text-align:right">Disc</th>
        <th style="text-align:center">GST%</th>
        <th style="text-align:right">GST Amt</th>
        <th style="text-align:right">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-box">
      <div class="totals-row"><span>Subtotal</span><span>₹${fmt(order.subtotal)}</span></div>
      ${parseFloat(order.discount_amount) > 0 ? `<div class="totals-row"><span>Discount</span><span>-₹${fmt(order.discount_amount)}</span></div>` : ''}
      <div class="totals-row"><span>GST</span><span>₹${fmt(order.tax_amount)}</span></div>
      <div class="totals-row"><span>TOTAL</span><span>₹${fmt(order.total_amount)}</span></div>
      <div class="totals-row paid"><span>Paid</span><span>₹${fmt(order.paid_amount)}</span></div>
      <div class="totals-row balance"><span>Balance Due</span><span>₹${fmt(order.balance_amount)}</span></div>
    </div>
  </div>

  <div class="footer">
    <div class="note">
      <p>Thank you for your business!</p>
      <p>This is a computer-generated invoice.</p>
      ${order.notes ? `<p>Note: ${order.notes}</p>` : ''}
    </div>
    <div class="sig">
      <div class="line">Authorized Signature</div>
      <div>Maa Jagdambey Trading</div>
    </div>
  </div>
</body>
</html>`;
}
