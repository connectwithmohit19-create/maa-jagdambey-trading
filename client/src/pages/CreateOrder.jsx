import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCustomers, getProducts, createOrder } from '../lib/api';

const PRICE_MAP = {
  LKO: 'lko_local_price',
  OUT: 'outer_market_price',
  SPL: 'special_rate_price',
  RTL: 'retail_price',
};

export default function CreateOrder() {
  const navigate = useNavigate();

  // Customer
  const [customers, setCustomers]       = useState([]);
  const [custSearch, setCustSearch]     = useState('');
  const [selectedCust, setSelectedCust] = useState(null);
  const [showCustDrop, setShowCustDrop] = useState(false);

  // Products
  const [products, setProducts]         = useState([]);
  const [prodSearch, setProdSearch]     = useState('');
  const [showProdDrop, setShowProdDrop] = useState(false);

  // Order items
  const [items, setItems]   = useState([]);

  // Order meta
  const [paymentMethod, setPaymentMethod]   = useState('Credit');
  const [paidAmount, setPaidAmount]         = useState('');
  const [notes, setNotes]                   = useState('');
  const [deliveryType, setDeliveryType]     = useState('Pickup');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [orderDate, setOrderDate]           = useState(new Date().toISOString().split('T')[0]);

  // UI
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  // Load customers on search
  useEffect(() => {
    if (custSearch.length < 1) { setCustomers([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await getCustomers({ search: custSearch, limit: 8, status: 'Active' });
        setCustomers(res.data.customers);
      } catch {}
    }, 300);
    return () => clearTimeout(t);
  }, [custSearch]);

  // Load products on search
  useEffect(() => {
    if (prodSearch.length < 1) { setProducts([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await getProducts({ search: prodSearch, limit: 8, status: 'active' });
        setProducts(res.data.products);
      } catch {}
    }, 300);
    return () => clearTimeout(t);
  }, [prodSearch]);

  const selectCustomer = (c) => {
    setSelectedCust(c);
    setCustSearch('');
    setShowCustDrop(false);
    // Re-price existing items based on new customer category
    if (items.length > 0) {
      setItems((prev) =>
        prev.map((item) => {
          const priceKey = PRICE_MAP[c.category_code] || 'retail_price';
          const price = parseFloat(item._product[priceKey]) || parseFloat(item._product.retail_price);
          return { ...item, unit_price: price };
        })
      );
    }
  };

  const addProduct = (prod) => {
    setProdSearch('');
    setShowProdDrop(false);
    // If already in list, increase qty
    const existing = items.findIndex((i) => i.product_id === prod.product_id);
    if (existing >= 0) {
      setItems((prev) =>
        prev.map((item, idx) =>
          idx === existing ? { ...item, quantity: item.quantity + 1 } : item
        )
      );
      return;
    }
    const priceKey = selectedCust?.category_code
      ? PRICE_MAP[selectedCust.category_code] || 'retail_price'
      : 'retail_price';
    const price = parseFloat(prod[priceKey]) || parseFloat(prod.retail_price) || 0;
    setItems((prev) => [
      ...prev,
      {
        product_id: prod.product_id,
        _product: prod,
        quantity: 1,
        unit_price: price,
        discount_percentage: 0,
      },
    ]);
  };

  const updateItem = (idx, field, val) => {
    setItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: val } : item))
    );
  };

  const removeItem = (idx) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  // Calculations
  const calcLine = (item) => {
    const qty      = parseInt(item.quantity) || 0;
    const price    = parseFloat(item.unit_price) || 0;
    const discPct  = parseFloat(item.discount_percentage) || 0;
    const gross    = price * qty;
    const discAmt  = (gross * discPct) / 100;
    const afterDisc = gross - discAmt;
    const gstPct   = parseFloat(item._product?.gst_percentage) || 18;
    const taxAmt   = (afterDisc * gstPct) / 100;
    return { gross, discAmt, afterDisc, taxAmt, total: afterDisc + taxAmt, gstPct };
  };

  const subtotal = items.reduce((s, i) => s + calcLine(i).gross, 0);
  const totalDisc = items.reduce((s, i) => s + calcLine(i).discAmt, 0);
  const totalTax  = items.reduce((s, i) => s + calcLine(i).taxAmt, 0);
  const totalAmt  = subtotal - totalDisc + totalTax;
  const paid      = parseFloat(paidAmount) || 0;
  const balance   = Math.max(0, totalAmt - paid);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!selectedCust) { setError('Please select a customer.'); return; }
    if (items.length === 0) { setError('Please add at least one product.'); return; }
    if (paid > totalAmt) { setError('Paid amount cannot exceed total amount.'); return; }

    setSaving(true);
    try {
      const res = await createOrder({
        customer_id: selectedCust.customer_id,
        order_date: orderDate,
        payment_method: paymentMethod,
        paid_amount: paid,
        delivery_type: deliveryType,
        delivery_address: deliveryType === 'Delivery' ? deliveryAddress : '',
        notes,
        items: items.map((item) => ({
          product_id: item.product_id,
          quantity: parseInt(item.quantity),
          unit_price: parseFloat(item.unit_price),
          discount_percentage: parseFloat(item.discount_percentage) || 0,
        })),
      });
      navigate(`/orders/${res.data.order.order_id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create order.');
    } finally {
      setSaving(false);
    }
  };

  const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Page title */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/orders')} className="p-2 rounded-lg text-stone-400 hover:bg-stone-100 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h2 className="font-display font-bold text-xl text-stone-900">New Order</h2>
          <p className="text-stone-400 text-xs">Prices auto-apply based on customer category</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid lg:grid-cols-3 gap-5">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-5">

            {/* Customer selector */}
            <div className="card p-5">
              <h3 className="font-semibold text-stone-800 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center">1</span>
                Select Customer
              </h3>
              {selectedCust ? (
                <div className="flex items-center justify-between p-3 bg-brand-50 border border-brand-200 rounded-xl">
                  <div>
                    <p className="font-semibold text-stone-900">{selectedCust.name}</p>
                    <p className="text-xs text-stone-500">
                      {selectedCust.shop_name && `${selectedCust.shop_name} · `}
                      {selectedCust.contact_number}
                      {selectedCust.price_category_name && (
                        <span className="ml-1 px-1.5 py-0.5 bg-brand-100 text-brand-700 rounded text-xs font-medium">
                          {selectedCust.price_category_name}
                        </span>
                      )}
                    </p>
                    {parseFloat(selectedCust.current_balance) > 0 && (
                      <p className="text-xs text-amber-600 mt-0.5">
                        Outstanding: ₹{Number(selectedCust.current_balance).toLocaleString('en-IN')}
                      </p>
                    )}
                  </div>
                  <button type="button" onClick={() => setSelectedCust(null)}
                    className="text-xs text-stone-400 hover:text-red-500 transition-colors">Change</button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="text"
                    value={custSearch}
                    onChange={(e) => { setCustSearch(e.target.value); setShowCustDrop(true); }}
                    onFocus={() => setShowCustDrop(true)}
                    placeholder="Type customer name or mobile..."
                    className="input-field"
                    autoComplete="off"
                  />
                  {showCustDrop && customers.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white border border-stone-200 rounded-xl shadow-lg overflow-hidden">
                      {customers.map((c) => (
                        <button
                          type="button"
                          key={c.customer_id}
                          onClick={() => selectCustomer(c)}
                          className="w-full text-left px-4 py-3 hover:bg-stone-50 border-b border-stone-50 last:border-0 transition-colors"
                        >
                          <p className="font-medium text-stone-900 text-sm">{c.name}</p>
                          <p className="text-xs text-stone-400">
                            {c.shop_name && `${c.shop_name} · `}{c.contact_number}
                            {c.price_category_name && (
                              <span className="ml-1 text-brand-600 font-medium">{c.price_category_name}</span>
                            )}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Product selector */}
            <div className="card p-5">
              <h3 className="font-semibold text-stone-800 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center">2</span>
                Add Products
                {selectedCust?.price_category_name && (
                  <span className="ml-auto text-xs text-brand-600 font-medium bg-brand-50 px-2 py-0.5 rounded-full border border-brand-200">
                    Pricing: {selectedCust.price_category_name}
                  </span>
                )}
              </h3>

              {/* Product search */}
              <div className="relative mb-4">
                <input
                  type="text"
                  value={prodSearch}
                  onChange={(e) => { setProdSearch(e.target.value); setShowProdDrop(true); }}
                  onFocus={() => setShowProdDrop(true)}
                  placeholder="Search product by name, brand, SKU..."
                  className="input-field"
                  autoComplete="off"
                />
                {showProdDrop && products.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white border border-stone-200 rounded-xl shadow-lg overflow-hidden max-h-60 overflow-y-auto">
                    {products.map((p) => {
                      const priceKey = selectedCust?.category_code ? PRICE_MAP[selectedCust.category_code] || 'retail_price' : 'retail_price';
                      const price = parseFloat(p[priceKey]) || parseFloat(p.retail_price);
                      return (
                        <button
                          type="button"
                          key={p.product_id}
                          onClick={() => addProduct(p)}
                          className="w-full text-left px-4 py-3 hover:bg-stone-50 border-b border-stone-50 last:border-0 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-stone-900 text-sm">{p.product_name}</p>
                              <p className="text-xs text-stone-400">{p.brand} · {p.sku} · Stock: {p.current_stock}</p>
                            </div>
                            <p className="font-semibold text-brand-700 text-sm ml-3">₹{Number(price).toLocaleString('en-IN')}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Items table */}
              {items.length === 0 ? (
                <div className="py-8 text-center text-stone-400 text-sm border-2 border-dashed border-stone-200 rounded-xl">
                  Search and add products above
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-stone-100">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-stone-50 border-b border-stone-100">
                        <th className="text-left px-4 py-2 text-xs font-semibold text-stone-400">Product</th>
                        <th className="text-center px-2 py-2 text-xs font-semibold text-stone-400">Qty</th>
                        <th className="text-right px-2 py-2 text-xs font-semibold text-stone-400">Rate (₹)</th>
                        <th className="text-right px-2 py-2 text-xs font-semibold text-stone-400">Disc %</th>
                        <th className="text-right px-2 py-2 text-xs font-semibold text-stone-400">Total</th>
                        <th className="px-2 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => {
                        const { total, gstPct } = calcLine(item);
                        return (
                          <tr key={idx} className="border-b border-stone-50">
                            <td className="px-4 py-2">
                              <p className="font-medium text-stone-900 truncate max-w-[180px]">{item._product.product_name}</p>
                              <p className="text-xs text-stone-400">GST {gstPct}% · Stock: {item._product.current_stock}</p>
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="number"
                                min="1"
                                max={item._product.current_stock}
                                value={item.quantity}
                                onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                                className="input-field text-center w-16 px-2"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.unit_price}
                                onChange={(e) => updateItem(idx, 'unit_price', e.target.value)}
                                className="input-field text-right w-24 px-2"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={item.discount_percentage}
                                onChange={(e) => updateItem(idx, 'discount_percentage', e.target.value)}
                                className="input-field text-right w-16 px-2"
                              />
                            </td>
                            <td className="px-2 py-2 text-right font-semibold text-stone-800 whitespace-nowrap">
                              {fmt(total)}
                            </td>
                            <td className="px-2 py-2">
                              <button
                                type="button"
                                onClick={() => removeItem(idx)}
                                className="p-1 text-stone-300 hover:text-red-500 transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Order details */}
            <div className="card p-5">
              <h3 className="font-semibold text-stone-800 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center">3</span>
                Order Details
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">Order Date</label>
                  <input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} className="input-field" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">Payment Method</label>
                  <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="input-field">
                    <option value="Credit">Credit (Udhaar)</option>
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="NEFT">NEFT / Bank</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">Delivery</label>
                  <select value={deliveryType} onChange={(e) => setDeliveryType(e.target.value)} className="input-field">
                    <option value="Pickup">Pickup</option>
                    <option value="Delivery">Home Delivery</option>
                  </select>
                </div>
                {deliveryType === 'Delivery' && (
                  <div className="col-span-2 sm:col-span-3">
                    <label className="block text-xs font-medium text-stone-600 mb-1">Delivery Address</label>
                    <textarea value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)}
                      className="input-field resize-none" rows={2} placeholder="Full delivery address" />
                  </div>
                )}
                <div className="col-span-2 sm:col-span-3">
                  <label className="block text-xs font-medium text-stone-600 mb-1">Notes (optional)</label>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                    className="input-field resize-none" rows={2} placeholder="Any special instructions" />
                </div>
              </div>
            </div>
          </div>

          {/* Right column — Summary */}
          <div className="space-y-4">
            <div className="card p-5 sticky top-20">
              <h3 className="font-semibold text-stone-800 mb-4">Order Summary</h3>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-stone-500">
                  <span>Subtotal</span><span>{fmt(subtotal)}</span>
                </div>
                {totalDisc > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span><span>-{fmt(totalDisc)}</span>
                  </div>
                )}
                <div className="flex justify-between text-stone-500">
                  <span>GST</span><span>{fmt(totalTax)}</span>
                </div>
                <div className="flex justify-between font-bold text-stone-900 text-base border-t border-stone-100 pt-2 mt-2">
                  <span>Total</span><span>{fmt(totalAmt)}</span>
                </div>
              </div>

              {/* Paid amount */}
              <div className="mt-4 pt-4 border-t border-stone-100">
                <label className="block text-xs font-medium text-stone-600 mb-1">Paid Now (₹)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">₹</span>
                  <input
                    type="number"
                    min="0"
                    max={totalAmt}
                    step="0.01"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    className="input-field pl-7"
                    placeholder="0 for full credit"
                  />
                </div>
                <div className="flex justify-between text-sm mt-2 font-semibold">
                  <span className={balance > 0 ? 'text-amber-600' : 'text-green-600'}>
                    {balance > 0 ? 'Balance Pending' : 'Fully Paid'}
                  </span>
                  <span className={balance > 0 ? 'text-amber-600' : 'text-green-600'}>{fmt(balance)}</span>
                </div>
              </div>

              {/* Items count */}
              <div className="mt-3 text-xs text-stone-400 text-center">
                {items.length} item{items.length !== 1 ? 's' : ''} · {items.reduce((s, i) => s + parseInt(i.quantity || 0), 0)} units
              </div>

              {error && (
                <div className="mt-3 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={saving || items.length === 0 || !selectedCust}
                className="btn-primary w-full mt-4 py-3 flex items-center justify-center gap-2 disabled:opacity-40"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating...
                  </>
                ) : 'Confirm Order'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/orders')}
                className="btn-secondary w-full mt-2 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
