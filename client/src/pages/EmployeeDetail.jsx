import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getEmployee, markAttendance, getEmployeeAttendance,
  recordEmployeePayment, recordEmployeePurchase, getProducts,
} from '../lib/api';
import Modal from '../components/Modal';

const attColors = {
  Present:   'bg-green-500',
  Absent:    'bg-red-400',
  'Half-day':'bg-amber-400',
  Leave:     'bg-blue-400',
};
const attBadge = {
  Present:   'bg-green-50 text-green-700 border-green-200',
  Absent:    'bg-red-50 text-red-600 border-red-200',
  'Half-day':'bg-amber-50 text-amber-700 border-amber-200',
  Leave:     'bg-blue-50 text-blue-700 border-blue-200',
};

export default function EmployeeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setTab] = useState('overview');

  // Attendance
  const [attMonth, setAttMonth]   = useState(new Date().getMonth() + 1);
  const [attYear, setAttYear]     = useState(new Date().getFullYear());
  const [monthAtt, setMonthAtt]   = useState([]);
  const [attLoadingCal, setAttLoadingCal] = useState(false);

  // Modals
  const [payModal, setPayModal]       = useState(false);
  const [purchModal, setPurchModal]   = useState(false);
  const [attModal, setAttModal]       = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedAttStatus, setSelectedAttStatus] = useState('Present');

  // Forms
  const [payForm, setPayForm]   = useState({ amount: '', payment_type: 'Salary', payment_method: 'Cash', month_year: '', notes: '' });
  const [purchForm, setPurchForm] = useState({ product_id: '', quantity: 1, unit_price: '', payment_status: 'Deduct from Salary', notes: '' });
  const [products, setProducts] = useState([]);
  const [prodSearch, setProdSearch] = useState('');

  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getEmployee(id);
      setData(res.data);
    } catch { navigate('/employees'); }
    finally { setLoading(false); }
  }, [id]);

  const fetchMonthAtt = useCallback(async () => {
    setAttLoadingCal(true);
    try {
      const res = await getEmployeeAttendance(id, { month: attMonth, year: attYear });
      setMonthAtt(res.data.attendance);
    } catch { setMonthAtt([]); }
    finally { setAttLoadingCal(false); }
  }, [id, attMonth, attYear]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { if (activeTab === 'attendance') fetchMonthAtt(); }, [activeTab, fetchMonthAtt]);

  // Product search for purchase modal
  useEffect(() => {
    if (prodSearch.length < 1) { setProducts([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await getProducts({ search: prodSearch, limit: 6, status: 'active' });
        setProducts(res.data.products);
      } catch {}
    }, 300);
    return () => clearTimeout(t);
  }, [prodSearch]);

  const handlePayment = async (e) => {
    e.preventDefault();
    setModalError('');
    if (!payForm.amount || parseFloat(payForm.amount) <= 0) { setModalError('Enter a valid amount.'); return; }
    setSaving(true);
    try {
      await recordEmployeePayment(id, payForm);
      setPayModal(false);
      setPayForm({ amount: '', payment_type: 'Salary', payment_method: 'Cash', month_year: '', notes: '' });
      fetchData();
    } catch (err) { setModalError(err.response?.data?.message || 'Failed.'); }
    finally { setSaving(false); }
  };

  const handlePurchase = async (e) => {
    e.preventDefault();
    setModalError('');
    if (!purchForm.unit_price || parseFloat(purchForm.unit_price) <= 0) { setModalError('Enter unit price.'); return; }
    setSaving(true);
    try {
      await recordEmployeePurchase(id, purchForm);
      setPurchModal(false);
      setPurchForm({ product_id: '', quantity: 1, unit_price: '', payment_status: 'Deduct from Salary', notes: '' });
      fetchData();
    } catch (err) { setModalError(err.response?.data?.message || 'Failed.'); }
    finally { setSaving(false); }
  };

  const handleMarkAtt = async () => {
    setSaving(true);
    try {
      await markAttendance(id, { attendance_date: selectedDate, status: selectedAttStatus });
      setAttModal(false);
      fetchData();
      if (activeTab === 'attendance') fetchMonthAtt();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const fmt   = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtSm = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

  if (loading) return (
    <div className="max-w-5xl mx-auto space-y-4">
      {[...Array(3)].map((_, i) => <div key={i} className="card p-6 h-28 shimmer" />)}
    </div>
  );

  if (!data) return null;
  const { employee, currentMonth, recentAttendance, payments, purchases } = data;

  // Build calendar
  const daysInMonth = new Date(attYear, attMonth, 0).getDate();
  const firstDay    = new Date(attYear, attMonth - 1, 1).getDay();
  const attMap      = {};
  monthAtt.forEach((a) => {
    attMap[a.attendance_date.split('T')[0]] = a;
  });

  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/employees')} className="p-2 rounded-lg text-stone-400 hover:bg-stone-100 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-warm flex-shrink-0">
              <span className="text-white font-bold text-xl">{employee.name.charAt(0)}</span>
            </div>
            <div>
              <h2 className="font-display font-bold text-xl text-stone-900">{employee.name}</h2>
              <p className="text-stone-400 text-xs">{employee.employee_code} · {employee.designation || 'Staff'} · Joined {new Date(employee.joining_date).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate(`/employees/${id}/edit`)} className="btn-secondary text-sm flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </button>
          <button onClick={() => setPayModal(true)} className="btn-primary text-sm flex items-center gap-2">
            💰 Pay Salary
          </button>
        </div>
      </div>

      {/* This Month Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Monthly Salary', value: fmtSm(employee.monthly_salary), sub: 'Fixed', color: 'text-stone-800' },
          { label: 'Salary Earned', value: fmtSm(currentMonth.salaryEarned), sub: `${currentMonth.presentDays} days worked`, color: 'text-brand-700' },
          { label: 'Paid This Month', value: fmtSm(currentMonth.totalPaid), sub: 'Salary + advance', color: 'text-green-700' },
          {
            label: parseFloat(currentMonth.netPayable) >= 0 ? 'Balance Payable' : 'Advance Taken',
            value: fmtSm(Math.abs(currentMonth.netPayable)),
            sub: parseFloat(currentMonth.netPayable) >= 0 ? 'Pending to pay' : 'To recover',
            color: parseFloat(currentMonth.netPayable) >= 0 ? 'text-amber-600' : 'text-red-600',
          },
        ].map((s, i) => (
          <div key={i} className="card p-4">
            <p className="text-xs text-stone-400 uppercase font-semibold tracking-wide truncate">{s.label}</p>
            <p className={`text-xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            <p className="text-xs text-stone-400 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-stone-100 p-1 rounded-xl w-fit">
        {[
          { key: 'overview',   label: 'Overview' },
          { key: 'attendance', label: 'Attendance' },
          { key: 'ledger',     label: 'Ledger' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === t.key ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="grid lg:grid-cols-2 gap-5">
          {/* Employee Info */}
          <div className="card p-5 space-y-3">
            <h3 className="font-semibold text-stone-700 text-sm mb-1">Employee Details</h3>
            {[
              ['Employee Code', employee.employee_code],
              ['Contact', employee.contact_number],
              ['Aadhar', employee.aadhar_number || '—'],
              ['Address', employee.address || '—'],
              ['Designation', employee.designation || '—'],
              ['Status', employee.status],
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between gap-3 text-sm">
                <span className="text-stone-400 flex-shrink-0">{label}</span>
                <span className="text-stone-700 font-medium text-right">{val}</span>
              </div>
            ))}
          </div>

          {/* Recent Attendance */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-stone-700 text-sm">Recent Attendance</h3>
              <button onClick={() => { setSelectedDate(new Date().toISOString().split('T')[0]); setAttModal(true); }}
                className="text-xs text-brand-600 hover:underline">+ Mark Today</button>
            </div>
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {recentAttendance.length === 0 ? (
                <p className="text-stone-400 text-sm text-center py-4">No attendance records yet.</p>
              ) : recentAttendance.map((a) => (
                <div key={a.attendance_id} className="flex items-center justify-between py-1.5 border-b border-stone-50 last:border-0">
                  <span className="text-stone-600 text-sm">
                    {new Date(a.attendance_date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${attBadge[a.status] || ''}`}>{a.status}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Payments */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-stone-700 text-sm">Recent Payments</h3>
              <button onClick={() => { setModalError(''); setPayModal(true); }} className="text-xs text-brand-600 hover:underline">+ Add Payment</button>
            </div>
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {payments.length === 0 ? (
                <p className="text-stone-400 text-sm text-center py-4">No payments yet.</p>
              ) : payments.slice(0, 6).map((p) => (
                <div key={p.payment_id} className="flex items-center justify-between py-2 border-b border-stone-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-stone-800">{p.payment_type}</p>
                    <p className="text-xs text-stone-400">
                      {new Date(p.payment_date).toLocaleDateString('en-IN')} · {p.payment_method}
                      {p.month_year && ` · ${p.month_year}`}
                    </p>
                  </div>
                  <p className="font-semibold text-green-700">{fmt(p.amount)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Personal Purchases */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-stone-700 text-sm">Personal Purchases</h3>
              <button onClick={() => { setModalError(''); setPurchModal(true); }} className="text-xs text-brand-600 hover:underline">+ Add Purchase</button>
            </div>
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {purchases.length === 0 ? (
                <p className="text-stone-400 text-sm text-center py-4">No personal purchases.</p>
              ) : purchases.slice(0, 6).map((p) => (
                <div key={p.purchase_id} className="flex items-center justify-between py-2 border-b border-stone-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-stone-800">{p.product_name || 'Manual Entry'}</p>
                    <p className="text-xs text-stone-400">
                      {new Date(p.purchase_date).toLocaleDateString('en-IN')} · {p.quantity} pcs · {p.payment_status}
                    </p>
                  </div>
                  <p className="font-semibold text-stone-700">{fmt(p.total_amount)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ATTENDANCE TAB — Calendar */}
      {activeTab === 'attendance' && (
        <div className="card p-5">
          {/* Month navigator */}
          <div className="flex items-center justify-between mb-5">
            <button
              onClick={() => {
                if (attMonth === 1) { setAttMonth(12); setAttYear(y => y - 1); }
                else setAttMonth(m => m - 1);
              }}
              className="p-2 rounded-lg hover:bg-stone-100 text-stone-500 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h3 className="font-semibold text-stone-900">{monthNames[attMonth - 1]} {attYear}</h3>
            <button
              onClick={() => {
                if (attMonth === 12) { setAttMonth(1); setAttYear(y => y + 1); }
                else setAttMonth(m => m + 1);
              }}
              className="p-2 rounded-lg hover:bg-stone-100 text-stone-500 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Legend */}
          <div className="flex gap-4 mb-4 flex-wrap">
            {[['Present', 'bg-green-500'], ['Absent', 'bg-red-400'], ['Half-day', 'bg-amber-400'], ['Leave', 'bg-blue-400']].map(([label, cls]) => (
              <div key={label} className="flex items-center gap-1.5 text-xs text-stone-500">
                <div className={`w-3 h-3 rounded-sm ${cls}`} />
                {label}
              </div>
            ))}
            <div className="flex items-center gap-1.5 text-xs text-stone-500">
              <div className="w-3 h-3 rounded-sm bg-stone-200" />
              Not marked
            </div>
          </div>

          {/* Calendar grid */}
          {attLoadingCal ? (
            <div className="grid grid-cols-7 gap-1">
              {[...Array(35)].map((_, i) => <div key={i} className="h-10 rounded shimmer" />)}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => (
                <div key={d} className="text-center text-xs font-semibold text-stone-400 pb-2">{d}</div>
              ))}
              {[...Array(firstDay)].map((_, i) => <div key={`e-${i}`} />)}
              {[...Array(daysInMonth)].map((_, i) => {
                const day  = i + 1;
                const dateStr = `${attYear}-${String(attMonth).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                const rec  = attMap[dateStr];
                const isToday = dateStr === new Date().toISOString().split('T')[0];
                return (
                  <button
                    key={day}
                    onClick={() => { setSelectedDate(dateStr); setSelectedAttStatus(rec?.status || 'Present'); setAttModal(true); }}
                    className={`h-10 rounded-lg text-xs font-medium transition-all hover:opacity-80 flex flex-col items-center justify-center gap-0.5 ${
                      rec ? attColors[rec.status] + ' text-white' : 'bg-stone-100 text-stone-500'
                    } ${isToday ? 'ring-2 ring-brand-500 ring-offset-1' : ''}`}
                  >
                    <span>{day}</span>
                    {rec && <span className="text-[9px] opacity-80">{rec.status === 'Half-day' ? '½' : rec.status[0]}</span>}
                  </button>
                );
              })}
            </div>
          )}

          {/* Month summary */}
          {monthAtt.length > 0 && (
            <div className="mt-4 pt-4 border-t border-stone-100 grid grid-cols-4 gap-3 text-center">
              {[
                ['Present', monthAtt.filter(a => a.status === 'Present').length, 'text-green-700'],
                ['Half Day', monthAtt.filter(a => a.status === 'Half-day').length, 'text-amber-600'],
                ['Absent',   monthAtt.filter(a => a.status === 'Absent').length, 'text-red-600'],
                ['Leave',    monthAtt.filter(a => a.status === 'Leave').length, 'text-blue-600'],
              ].map(([label, count, color]) => (
                <div key={label}>
                  <p className={`text-xl font-bold ${color}`}>{count}</p>
                  <p className="text-xs text-stone-400">{label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* LEDGER TAB */}
      {activeTab === 'ledger' && (
        <div className="space-y-5">
          {/* All Payments */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
              <h3 className="font-semibold text-stone-700 text-sm">Salary & Payment History</h3>
              <button onClick={() => { setModalError(''); setPayModal(true); }} className="btn-primary text-xs px-3 py-1.5">+ Add Payment</button>
            </div>
            {payments.length === 0 ? (
              <div className="py-10 text-center text-stone-400 text-sm">No payments recorded.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-100">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-stone-400 uppercase">Date</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-stone-400 uppercase">Type</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-stone-400 uppercase hidden md:table-cell">Period</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-stone-400 uppercase hidden sm:table-cell">Method</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-stone-400 uppercase">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.payment_id} className="border-b border-stone-50 hover:bg-stone-50 transition-colors">
                      <td className="px-5 py-3 text-stone-600 text-xs">{new Date(p.payment_date).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}</td>
                      <td className="px-3 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                          p.payment_type === 'Salary' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          p.payment_type === 'Advance' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-green-50 text-green-700 border-green-200'
                        }`}>{p.payment_type}</span>
                      </td>
                      <td className="px-3 py-3 text-stone-500 text-xs hidden md:table-cell">{p.month_year || '—'}</td>
                      <td className="px-3 py-3 text-stone-500 text-xs hidden sm:table-cell">{p.payment_method}</td>
                      <td className="px-5 py-3 text-right font-semibold text-green-700">{fmt(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-stone-50 border-t border-stone-200">
                    <td colSpan={4} className="px-5 py-3 text-sm font-semibold text-stone-600">Total Paid</td>
                    <td className="px-5 py-3 text-right font-bold text-green-700">
                      {fmt(payments.reduce((s, p) => s + parseFloat(p.amount), 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>

          {/* Personal Purchases */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
              <h3 className="font-semibold text-stone-700 text-sm">Personal Purchases</h3>
              <button onClick={() => { setModalError(''); setPurchModal(true); }} className="btn-primary text-xs px-3 py-1.5">+ Add Purchase</button>
            </div>
            {purchases.length === 0 ? (
              <div className="py-10 text-center text-stone-400 text-sm">No purchases recorded.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-100">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-stone-400 uppercase">Date</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-stone-400 uppercase">Product</th>
                    <th className="text-right px-3 py-3 text-xs font-semibold text-stone-400 uppercase hidden sm:table-cell">Qty</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-stone-400 uppercase hidden md:table-cell">Status</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-stone-400 uppercase">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((p) => (
                    <tr key={p.purchase_id} className="border-b border-stone-50 hover:bg-stone-50 transition-colors">
                      <td className="px-5 py-3 text-stone-500 text-xs">{new Date(p.purchase_date).toLocaleDateString('en-IN', { day:'numeric', month:'short' })}</td>
                      <td className="px-3 py-3 font-medium text-stone-800 truncate max-w-[150px]">{p.product_name || 'Manual Entry'}</td>
                      <td className="px-3 py-3 text-center text-stone-500 hidden sm:table-cell">{p.quantity}</td>
                      <td className="px-3 py-3 hidden md:table-cell">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${
                          p.payment_status === 'Deduct from Salary' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          p.payment_status === 'Paid' ? 'bg-green-50 text-green-700 border-green-200' :
                          'bg-stone-100 text-stone-600 border-stone-200'
                        }`}>{p.payment_status}</span>
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-stone-700">{fmt(p.total_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Pay Salary Modal */}
      <Modal isOpen={payModal} onClose={() => setPayModal(false)} title="Record Payment" size="sm">
        <form onSubmit={handlePayment} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-stone-600 mb-1">Payment Type</label>
              <div className="grid grid-cols-3 gap-2">
                {['Salary', 'Advance', 'Bonus'].map((t) => (
                  <button key={t} type="button"
                    onClick={() => setPayForm((p) => ({ ...p, payment_type: t }))}
                    className={`py-2 rounded-lg text-xs font-semibold border-2 transition-all ${
                      payForm.payment_type === t
                        ? 'bg-brand-600 border-brand-600 text-white'
                        : 'border-stone-200 text-stone-600 hover:border-brand-300 bg-white'
                    }`}
                  >{t}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Amount (₹) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">₹</span>
                <input type="number" min="1" value={payForm.amount}
                  onChange={(e) => setPayForm((p) => ({ ...p, amount: e.target.value }))}
                  className="input-field pl-7" placeholder="Enter amount" autoFocus />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">For Month</label>
              <input value={payForm.month_year}
                onChange={(e) => setPayForm((p) => ({ ...p, month_year: e.target.value }))}
                className="input-field" placeholder="e.g. Mar-2026" />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Payment Method</label>
              <select value={payForm.payment_method}
                onChange={(e) => setPayForm((p) => ({ ...p, payment_method: e.target.value }))} className="input-field">
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="UPI">UPI</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Notes</label>
              <input value={payForm.notes}
                onChange={(e) => setPayForm((p) => ({ ...p, notes: e.target.value }))}
                className="input-field" placeholder="Optional note" />
            </div>
          </div>
          {modalError && <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">{modalError}</div>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setPayModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
              {saving ? 'Saving...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Personal Purchase Modal */}
      <Modal isOpen={purchModal} onClose={() => setPurchModal(false)} title="Record Personal Purchase" size="sm">
        <form onSubmit={handlePurchase} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Search Product (optional)</label>
            <div className="relative">
              <input value={prodSearch} onChange={(e) => setProdSearch(e.target.value)}
                className="input-field" placeholder="Type product name..." autoComplete="off" />
              {products.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white border border-stone-200 rounded-xl shadow-lg max-h-40 overflow-y-auto">
                  {products.map((p) => (
                    <button key={p.product_id} type="button"
                      onClick={() => {
                        setPurchForm((f) => ({ ...f, product_id: p.product_id, unit_price: p.lko_local_price || p.retail_price }));
                        setProdSearch(p.product_name);
                        setProducts([]);
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-stone-50 text-sm border-b border-stone-50 last:border-0"
                    >
                      <p className="font-medium text-stone-900">{p.product_name}</p>
                      <p className="text-xs text-stone-400">{p.brand} · ₹{Number(p.lko_local_price).toLocaleString('en-IN')}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Quantity</label>
              <input type="number" min="1" value={purchForm.quantity}
                onChange={(e) => setPurchForm((p) => ({ ...p, quantity: e.target.value }))}
                className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Unit Price (₹) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">₹</span>
                <input type="number" min="0" value={purchForm.unit_price}
                  onChange={(e) => setPurchForm((p) => ({ ...p, unit_price: e.target.value }))}
                  className="input-field pl-7" placeholder="0" />
              </div>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-stone-600 mb-1">Payment Status</label>
              <select value={purchForm.payment_status}
                onChange={(e) => setPurchForm((p) => ({ ...p, payment_status: e.target.value }))} className="input-field">
                <option value="Deduct from Salary">Deduct from Salary</option>
                <option value="Paid">Paid (Cash)</option>
                <option value="Pending">Pending</option>
              </select>
            </div>
            {purchForm.unit_price && purchForm.quantity && (
              <div className="col-span-2 p-3 bg-brand-50 border border-brand-200 rounded-lg">
                <p className="text-sm font-semibold text-brand-700">
                  Total: ₹{Number(parseFloat(purchForm.unit_price) * parseInt(purchForm.quantity || 1)).toLocaleString('en-IN')}
                </p>
              </div>
            )}
          </div>
          {modalError && <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">{modalError}</div>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setPurchModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
              {saving ? 'Saving...' : 'Record Purchase'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Mark Attendance Modal (from calendar) */}
      <Modal isOpen={attModal} onClose={() => setAttModal(false)} title={`Mark Attendance — ${selectedDate}`} size="sm">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {['Present', 'Absent', 'Half-day', 'Leave'].map((s) => (
              <button key={s} type="button" onClick={() => setSelectedAttStatus(s)}
                className={`py-3 rounded-xl text-sm font-semibold border-2 transition-all ${
                  selectedAttStatus === s
                    ? { Present: 'bg-green-500 border-green-500 text-white', Absent: 'bg-red-500 border-red-500 text-white', 'Half-day': 'bg-amber-400 border-amber-400 text-white', Leave: 'bg-blue-500 border-blue-500 text-white' }[s]
                    : 'border-stone-200 text-stone-600 hover:border-stone-300 bg-white'
                }`}
              >
                {{ Present: '✅ Present', Absent: '❌ Absent', 'Half-day': '🌗 Half Day', Leave: '🏖️ Leave' }[s]}
              </button>
            ))}
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={() => setAttModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleMarkAtt} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
