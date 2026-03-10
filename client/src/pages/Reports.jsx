import { useEffect, useState, useCallback } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { getSalesReport, getOutstandingReport, getStockReport, getEmployeeReport } from '../lib/api';

const TABS = [
  { key: 'sales',       label: '📊 Sales' },
  { key: 'outstanding', label: '⏳ Outstanding' },
  { key: 'stock',       label: '📦 Stock' },
  { key: 'employees',   label: '👨‍💼 Employees' },
];

const COLORS = ['#ea580c','#fb923c','#fed7aa','#fef3c7','#d4d4d4'];

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const fmtShort = (n) => {
  const num = Number(n || 0);
  if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`;
  if (num >= 1000)   return `₹${(num / 1000).toFixed(1)}K`;
  return `₹${num}`;
};

function StatCard({ label, value, sub, color = 'text-stone-800' }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-stone-400 uppercase font-semibold tracking-wide truncate">{label}</p>
      <p className={`text-xl font-bold mt-1 ${color}`}>{value}</p>
      {sub && <p className="text-xs text-stone-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── SALES TAB ────────────────────────────────────────────────
function SalesReport() {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');
  const [fromDate, setFrom] = useState('');
  const [toDate, setTo]     = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { period };
      if (period === 'custom') { params.from_date = fromDate; params.to_date = toDate; }
      const res = await getSalesReport(params);
      setData(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [period, fromDate, toDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{[...Array(4)].map((_,i) => <div key={i} className="card p-4 h-24 shimmer" />)}</div>;
  if (!data) return <p className="text-stone-400 text-sm">Failed to load report.</p>;

  const s = data.summary;

  return (
    <div className="space-y-5">
      {/* Period selector */}
      <div className="flex flex-wrap gap-2 items-center">
        {[['today','Today'],['week','This Week'],['month','This Month'],['year','This Year'],['custom','Custom']].map(([v,l]) => (
          <button key={v} onClick={() => setPeriod(v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${period === v ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-stone-600 border-stone-200 hover:border-brand-300'}`}>
            {l}
          </button>
        ))}
        {period === 'custom' && (
          <div className="flex gap-2 items-center">
            <input type="date" value={fromDate} onChange={e => setFrom(e.target.value)} className="input-field text-xs py-1.5" />
            <span className="text-stone-400 text-xs">to</span>
            <input type="date" value={toDate} onChange={e => setTo(e.target.value)} className="input-field text-xs py-1.5" />
            <button onClick={fetchData} className="btn-primary text-xs px-3 py-1.5">Go</button>
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Revenue" value={fmt(s.total_revenue)} sub={`${s.total_orders} orders`} color="text-brand-700" />
        <StatCard label="Collected" value={fmt(s.total_collected)} sub="Cash + Bank" color="text-green-700" />
        <StatCard label="Outstanding" value={fmt(s.total_outstanding)} sub="To collect" color="text-amber-600" />
        <StatCard label="GST Collected" value={fmt(s.total_gst)} sub={`Discount: ${fmt(s.total_discount)}`} />
      </div>

      {/* Daily revenue chart */}
      {data.dailySales.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-stone-700 text-sm mb-4">Daily Revenue</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.dailySales} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => new Date(d).toLocaleDateString('en-IN', { day:'numeric', month:'short' })} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={fmtShort} />
              <Tooltip formatter={(v) => fmt(v)} labelFormatter={d => new Date(d).toLocaleDateString('en-IN', { day:'numeric', month:'long' })} />
              <Bar dataKey="revenue" name="Revenue" fill="#ea580c" radius={[3,3,0,0]} />
              <Bar dataKey="collected" name="Collected" fill="#86efac" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Top products */}
        {data.topProducts.length > 0 && (
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-100">
              <h3 className="font-semibold text-stone-700 text-sm">Top Products</h3>
            </div>
            <table className="w-full text-sm">
              <thead><tr className="bg-stone-50 border-b border-stone-100">
                <th className="text-left px-5 py-2 text-xs font-semibold text-stone-400">#</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-stone-400">Product</th>
                <th className="text-right px-3 py-2 text-xs font-semibold text-stone-400">Qty</th>
                <th className="text-right px-5 py-2 text-xs font-semibold text-stone-400">Revenue</th>
              </tr></thead>
              <tbody>
                {data.topProducts.map((p, i) => (
                  <tr key={i} className="border-b border-stone-50">
                    <td className="px-5 py-2.5 text-stone-400 text-xs">{i + 1}</td>
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-stone-800 truncate max-w-[150px]">{p.product_name}</p>
                      <p className="text-xs text-stone-400">{p.brand}</p>
                    </td>
                    <td className="px-3 py-2.5 text-right text-stone-600">{p.total_qty}</td>
                    <td className="px-5 py-2.5 text-right font-semibold text-brand-700">{fmt(p.total_revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Top customers */}
        {data.topCustomers.length > 0 && (
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-100">
              <h3 className="font-semibold text-stone-700 text-sm">Top Customers</h3>
            </div>
            <table className="w-full text-sm">
              <thead><tr className="bg-stone-50 border-b border-stone-100">
                <th className="text-left px-5 py-2 text-xs font-semibold text-stone-400">#</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-stone-400">Customer</th>
                <th className="text-right px-3 py-2 text-xs font-semibold text-stone-400">Orders</th>
                <th className="text-right px-5 py-2 text-xs font-semibold text-stone-400">Revenue</th>
              </tr></thead>
              <tbody>
                {data.topCustomers.map((c, i) => (
                  <tr key={i} className="border-b border-stone-50">
                    <td className="px-5 py-2.5 text-stone-400 text-xs">{i + 1}</td>
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-stone-800 truncate max-w-[150px]">{c.name}</p>
                      {c.shop_name && <p className="text-xs text-stone-400 truncate max-w-[150px]">{c.shop_name}</p>}
                    </td>
                    <td className="px-3 py-2.5 text-right text-stone-600">{c.total_orders}</td>
                    <td className="px-5 py-2.5 text-right font-semibold text-brand-700">{fmt(c.total_revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment methods */}
      {data.paymentMethods.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-stone-700 text-sm mb-4">Payment Methods Breakdown</h3>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <ResponsiveContainer width={180} height={180}>
              <PieChart>
                <Pie data={data.paymentMethods} dataKey="total" nameKey="payment_method" cx="50%" cy="50%" outerRadius={70} innerRadius={40}>
                  {data.paymentMethods.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => fmt(v)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {data.paymentMethods.map((m, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-stone-700">{m.payment_method}</span>
                    <span className="text-stone-400 text-xs">({m.count} orders)</span>
                  </div>
                  <span className="font-semibold text-stone-800">{fmt(m.total)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── OUTSTANDING TAB ──────────────────────────────────────────
function OutstandingReport() {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOutstandingReport().then(res => setData(res.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="space-y-3">{[...Array(3)].map((_,i) => <div key={i} className="card p-4 h-20 shimmer" />)}</div>;
  if (!data) return <p className="text-stone-400 text-sm">Failed to load report.</p>;
  const s = data.summary;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Customers with Dues" value={s.customers_with_dues} color="text-amber-600" />
        <StatCard label="Total Outstanding" value={fmt(s.total_outstanding)} color="text-red-600" />
        <StatCard label="Highest Balance" value={fmt(s.highest_balance)} sub="Single customer" />
        <StatCard label="Average Balance" value={fmt(parseFloat(s.avg_balance).toFixed(0))} sub="Per customer" />
      </div>

      {/* Aging */}
      {data.aging.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-stone-700 text-sm mb-4">Outstanding Aging</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {data.aging.map((a) => (
              <div key={a.bucket} className={`p-3 rounded-xl border text-center ${
                a.bucket === '0-30 days' ? 'bg-green-50 border-green-200' :
                a.bucket === '31-60 days' ? 'bg-amber-50 border-amber-200' :
                'bg-red-50 border-red-200'
              }`}>
                <p className="text-xs font-semibold text-stone-500">{a.bucket}</p>
                <p className="text-lg font-bold text-stone-800 mt-1">{a.customers}</p>
                <p className="text-xs text-stone-500">{fmt(a.amount)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Customer list */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100">
          <h3 className="font-semibold text-stone-700 text-sm">Customers with Outstanding Balance</h3>
        </div>
        {data.customers.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-4xl">🎉</p>
            <p className="text-stone-400 text-sm mt-2">All customers are clear! No outstanding dues.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-stone-50 border-b border-stone-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-stone-400 uppercase">Customer</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-stone-400 uppercase hidden sm:table-cell">Contact</th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-stone-400 uppercase hidden md:table-cell">Unpaid Orders</th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-stone-400 uppercase hidden lg:table-cell">Oldest Due</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-stone-400 uppercase">Balance</th>
              </tr></thead>
              <tbody>
                {data.customers.map((c) => (
                  <tr key={c.customer_id} className="border-b border-stone-50 hover:bg-stone-50 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-semibold text-stone-900">{c.name}</p>
                      {c.shop_name && <p className="text-xs text-stone-400">{c.shop_name}</p>}
                      {c.price_category && <span className="text-xs text-brand-600">{c.price_category}</span>}
                    </td>
                    <td className="px-3 py-3 text-stone-500 text-xs hidden sm:table-cell">{c.contact_number}</td>
                    <td className="px-3 py-3 text-right text-stone-600 hidden md:table-cell">{c.unpaid_orders}</td>
                    <td className="px-3 py-3 text-right text-xs text-stone-400 hidden lg:table-cell">
                      {c.oldest_unpaid_date ? new Date(c.oldest_unpaid_date).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) : '—'}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <p className="font-bold text-amber-600">{fmt(c.current_balance)}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-stone-50 border-t border-stone-200">
                  <td colSpan={4} className="px-5 py-3 text-sm font-semibold text-stone-600">Total Outstanding</td>
                  <td className="px-5 py-3 text-right font-bold text-red-600">{fmt(s.total_outstanding)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── STOCK TAB ────────────────────────────────────────────────
function StockReport() {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStockReport().then(res => setData(res.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="space-y-3">{[...Array(3)].map((_,i) => <div key={i} className="card p-4 h-20 shimmer" />)}</div>;
  if (!data) return <p className="text-stone-400 text-sm">Failed to load report.</p>;
  const s = data.summary;

  const stockStatusColor = { 'In Stock': 'bg-green-50 text-green-700 border-green-200', 'Low Stock': 'bg-amber-50 text-amber-700 border-amber-200', 'Out of Stock': 'bg-red-50 text-red-600 border-red-200' };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Products" value={s.total_products} />
        <StatCard label="In Stock" value={s.in_stock} color="text-green-700" />
        <StatCard label="Low Stock" value={s.low_stock} color="text-amber-600" sub="Needs reorder" />
        <StatCard label="Out of Stock" value={s.out_of_stock} color="text-red-600" />
      </div>

      <div className="card p-4 bg-gradient-to-r from-brand-50 to-amber-50 border border-brand-200">
        <p className="text-xs text-stone-500 uppercase font-semibold">Total Inventory Value</p>
        <p className="text-2xl font-bold text-brand-700 mt-1">{fmt(s.total_stock_value)}</p>
        <p className="text-xs text-stone-400 mt-0.5">Based on purchase price</p>
      </div>

      {/* Category breakdown */}
      {data.categories.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-stone-700 text-sm mb-4">Category-wise Stock Value</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.categories} layout="vertical" margin={{ left: 60, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" />
              <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={fmtShort} />
              <YAxis type="category" dataKey="category_name" tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v) => fmt(v)} />
              <Bar dataKey="value" name="Stock Value" fill="#ea580c" radius={[0,3,3,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Products table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100">
          <h3 className="font-semibold text-stone-700 text-sm">All Products — Stock Status</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-stone-50 border-b border-stone-100">
              <th className="text-left px-5 py-3 text-xs font-semibold text-stone-400 uppercase">Product</th>
              <th className="text-right px-3 py-3 text-xs font-semibold text-stone-400 uppercase">Stock</th>
              <th className="text-right px-3 py-3 text-xs font-semibold text-stone-400 uppercase hidden sm:table-cell">Min Level</th>
              <th className="text-right px-3 py-3 text-xs font-semibold text-stone-400 uppercase hidden md:table-cell">Sold (30d)</th>
              <th className="text-right px-3 py-3 text-xs font-semibold text-stone-400 uppercase hidden lg:table-cell">Value</th>
              <th className="text-center px-5 py-3 text-xs font-semibold text-stone-400 uppercase">Status</th>
            </tr></thead>
            <tbody>
              {data.products.map((p) => (
                <tr key={p.product_id} className="border-b border-stone-50 hover:bg-stone-50 transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-medium text-stone-900 truncate max-w-[180px]">{p.product_name}</p>
                    <p className="text-xs text-stone-400">{p.brand} · {p.sku} · {p.category_name}</p>
                  </td>
                  <td className="px-3 py-3 text-right font-bold text-stone-800">{p.current_stock}</td>
                  <td className="px-3 py-3 text-right text-stone-500 hidden sm:table-cell">{p.min_stock_level || 3}</td>
                  <td className="px-3 py-3 text-right text-stone-500 hidden md:table-cell">{p.sold_last_30_days || 0}</td>
                  <td className="px-3 py-3 text-right text-stone-600 hidden lg:table-cell">{fmt(p.stock_value)}</td>
                  <td className="px-5 py-3 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${stockStatusColor[p.stock_status] || ''}`}>
                      {p.stock_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── EMPLOYEE REPORT TAB ──────────────────────────────────────
function EmployeeReport() {
  const [data, setData]   = useState(null);
  const [loading, setL]   = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear]   = useState(new Date().getFullYear());

  const fetchData = useCallback(async () => {
    setL(true);
    try {
      const res = await getEmployeeReport({ month, year });
      setData(res.data);
    } catch (err) { console.error(err); }
    finally { setL(false); }
  }, [month, year]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  if (loading) return <div className="space-y-3">{[...Array(3)].map((_,i) => <div key={i} className="card p-4 h-20 shimmer" />)}</div>;
  if (!data) return <p className="text-stone-400 text-sm">Failed to load report.</p>;
  const s = data.summary;

  return (
    <div className="space-y-5">
      {/* Month/Year picker */}
      <div className="flex gap-3 items-center flex-wrap">
        <select value={month} onChange={e => setMonth(parseInt(e.target.value))} className="input-field w-32">
          {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select value={year} onChange={e => setYear(parseInt(e.target.value))} className="input-field w-28">
          {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Staff" value={s.totalEmployees} />
        <StatCard label="Salary Bill" value={fmt(s.totalSalaryBill)} sub="Earned this month" color="text-brand-700" />
        <StatCard label="Paid" value={fmt(s.totalPaid)} color="text-green-700" />
        <StatCard label="Pending" value={fmt(s.totalPending)} color="text-amber-600" sub="To be paid" />
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100">
          <h3 className="font-semibold text-stone-700 text-sm">Employee Salary Summary — {months[month-1]} {year}</h3>
        </div>
        {data.employees.length === 0 ? (
          <div className="py-10 text-center text-stone-400 text-sm">No active employees.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-stone-50 border-b border-stone-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-stone-400 uppercase">Employee</th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-stone-400 uppercase">Days</th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-stone-400 uppercase hidden sm:table-cell">Salary</th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-stone-400 uppercase hidden md:table-cell">Earned</th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-stone-400 uppercase hidden md:table-cell">Paid</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-stone-400 uppercase">Pending</th>
              </tr></thead>
              <tbody>
                {data.employees.map((e) => (
                  <tr key={e.employee_id} className="border-b border-stone-50 hover:bg-stone-50 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-semibold text-stone-900">{e.name}</p>
                      <p className="text-xs text-stone-400">{e.employee_code} · {e.designation || 'Staff'}</p>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <p className="font-medium text-stone-800">{e.presentDays}</p>
                      <p className="text-xs text-stone-400">P:{e.present_days} H:{e.half_days} A:{e.absent_days}</p>
                    </td>
                    <td className="px-3 py-3 text-right text-stone-500 hidden sm:table-cell">{fmt(e.monthly_salary)}</td>
                    <td className="px-3 py-3 text-right font-medium text-brand-700 hidden md:table-cell">{fmt(e.salaryEarned)}</td>
                    <td className="px-3 py-3 text-right text-green-700 hidden md:table-cell">{fmt(e.totalPaid)}</td>
                    <td className="px-5 py-3 text-right">
                      <p className={`font-bold ${parseFloat(e.netPayable) > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                        {parseFloat(e.netPayable) > 0 ? fmt(e.netPayable) : '✓ Clear'}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-stone-50 border-t border-stone-200">
                  <td colSpan={3} className="px-5 py-3 text-sm font-semibold text-stone-600">Totals</td>
                  <td className="px-3 py-3 text-right font-bold text-brand-700 hidden md:table-cell">{fmt(s.totalSalaryBill)}</td>
                  <td className="px-3 py-3 text-right font-bold text-green-700 hidden md:table-cell">{fmt(s.totalPaid)}</td>
                  <td className="px-5 py-3 text-right font-bold text-amber-600">{fmt(s.totalPending)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────
export default function Reports() {
  const [tab, setTab] = useState('sales');
  return (
    <div className="space-y-5">
      <div className="flex gap-1 bg-stone-100 p-1 rounded-xl w-fit flex-wrap">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === t.key ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'sales'       && <SalesReport />}
      {tab === 'outstanding' && <OutstandingReport />}
      {tab === 'stock'       && <StockReport />}
      {tab === 'employees'   && <EmployeeReport />}
    </div>
  );
}
