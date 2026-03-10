import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEmployees, getTodayAttendance, markAttendance } from '../lib/api';
import Modal from '../components/Modal';

const statusColors = {
  Active:     'bg-green-50 text-green-700 border-green-200',
  Resigned:   'bg-stone-100 text-stone-500 border-stone-200',
  Terminated: 'bg-red-50 text-red-600 border-red-200',
};

const attColors = {
  Present:  'bg-green-100 text-green-700',
  Absent:   'bg-red-100 text-red-600',
  'Half-day': 'bg-amber-100 text-amber-700',
  Leave:    'bg-blue-100 text-blue-600',
  null:     'bg-stone-100 text-stone-400',
};

export default function Employees() {
  const navigate = useNavigate();
  const [employees, setEmployees]   = useState([]);
  const [todayAtt, setTodayAtt]     = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [tab, setTab]               = useState('list'); // 'list' | 'attendance'

  // Quick attendance modal
  const [attModal, setAttModal]     = useState(false);
  const [attEmployee, setAttEmployee] = useState(null);
  const [attStatus, setAttStatus]   = useState('Present');
  const [attSaving, setAttSaving]   = useState(false);
  const today = new Date().toISOString().split('T')[0];

  const fetchEmployees = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search.trim()) params.search = search.trim();
      const res = await getEmployees(params);
      setEmployees(res.data.employees);
      setPagination(res.data.pagination);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [search]);

  const fetchTodayAtt = useCallback(async () => {
    try {
      const res = await getTodayAttendance();
      setTodayAtt(res.data.employees);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);
  useEffect(() => { fetchTodayAtt(); }, [fetchTodayAtt]);

  const openAttModal = (emp) => {
    setAttEmployee(emp);
    setAttStatus(emp.attendance_status || 'Present');
    setAttModal(true);
  };

  const handleMarkAtt = async () => {
    setAttSaving(true);
    try {
      await markAttendance(attEmployee.employee_id, {
        attendance_date: today,
        status: attStatus,
      });
      setAttModal(false);
      fetchTodayAtt();
    } catch (err) { console.error(err); }
    finally { setAttSaving(false); }
  };

  const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

  const presentCount = todayAtt.filter(e => e.attendance_status === 'Present').length;
  const absentCount  = todayAtt.filter(e => e.attendance_status === 'Absent').length;
  const unmarkedCount= todayAtt.filter(e => !e.attendance_status).length;

  return (
    <div className="space-y-4">
      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card p-4">
          <p className="text-xs text-stone-400 uppercase font-semibold">Total Staff</p>
          <p className="text-2xl font-bold text-stone-800 mt-1">{pagination.total}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-stone-400 uppercase font-semibold">Present Today</p>
          <p className="text-2xl font-bold text-green-700 mt-1">{presentCount}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-stone-400 uppercase font-semibold">Absent Today</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{absentCount}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-stone-400 uppercase font-semibold">Not Marked</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{unmarkedCount}</p>
        </div>
      </div>

      {/* Tabs + Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-1 bg-stone-100 p-1 rounded-xl">
          {[{ key: 'list', label: 'All Employees' }, { key: 'attendance', label: "Today's Attendance" }].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                tab === t.key ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {tab === 'list' && (
            <input
              type="text"
              placeholder="Search employee..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field w-52"
            />
          )}
          <button onClick={() => navigate('/employees/new')} className="btn-primary flex items-center gap-2 whitespace-nowrap text-sm">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Employee
          </button>
        </div>
      </div>

      {/* Employee List Tab */}
      {tab === 'list' && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-stone-400 uppercase">Employee</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-stone-400 uppercase hidden sm:table-cell">Contact</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-stone-400 uppercase hidden md:table-cell">Salary</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-stone-400 uppercase hidden lg:table-cell">Days Worked</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-stone-400 uppercase hidden lg:table-cell">Balance</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-stone-400 uppercase">Status</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-stone-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(4)].map((_, i) => (
                    <tr key={i} className="border-b border-stone-50">
                      {[...Array(7)].map((_, j) => (
                        <td key={j} className="px-3 py-4"><div className="h-4 rounded shimmer" /></td>
                      ))}
                    </tr>
                  ))
                ) : employees.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-14 text-center">
                      <div className="flex flex-col items-center gap-2 text-stone-400">
                        <span className="text-4xl">👨‍💼</span>
                        <p className="text-sm">{search ? 'No employees found.' : 'No employees added yet.'}</p>
                        {!search && (
                          <button onClick={() => navigate('/employees/new')} className="btn-primary text-xs mt-2 px-4 py-2">
                            Add First Employee
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  employees.map((emp) => (
                    <tr
                      key={emp.employee_id}
                      onClick={() => navigate(`/employees/${emp.employee_id}`)}
                      className="border-b border-stone-50 hover:bg-brand-50/30 cursor-pointer transition-colors"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-brand-700 font-semibold text-sm">{emp.name.charAt(0)}</span>
                          </div>
                          <div>
                            <p className="font-semibold text-stone-900">{emp.name}</p>
                            <p className="text-xs text-stone-400">{emp.employee_code} {emp.designation ? `· ${emp.designation}` : ''}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 hidden sm:table-cell">
                        <p className="text-stone-700">{emp.contact_number}</p>
                      </td>
                      <td className="px-3 py-3 hidden md:table-cell">
                        <p className="font-medium text-stone-800">{fmt(emp.monthly_salary)}<span className="text-xs text-stone-400">/mo</span></p>
                      </td>
                      <td className="px-3 py-3 hidden lg:table-cell">
                        <p className="text-stone-600">{emp.days_worked_this_month || 0} days</p>
                        <p className="text-xs text-stone-400">this month</p>
                      </td>
                      <td className="px-3 py-3 hidden lg:table-cell">
                        <p className={`font-medium ${parseFloat(emp.current_balance) < 0 ? 'text-amber-600' : 'text-green-600'}`}>
                          {fmt(Math.abs(emp.current_balance))}
                          <span className="text-xs ml-1 font-normal text-stone-400">
                            {parseFloat(emp.current_balance) < 0 ? 'advance taken' : 'pending'}
                          </span>
                        </p>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusColors[emp.status] || 'bg-stone-100'}`}>
                          {emp.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/employees/${emp.employee_id}`); }}
                          className="p-1.5 text-stone-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Today's Attendance Tab */}
      {tab === 'attendance' && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-stone-800">Today's Attendance</h3>
              <p className="text-xs text-stone-400 mt-0.5">
                {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
            <span className="text-xs text-stone-400">Click a row to mark attendance</span>
          </div>
          <div className="divide-y divide-stone-50">
            {todayAtt.length === 0 ? (
              <div className="py-12 text-center text-stone-400 text-sm">No active employees found.</div>
            ) : (
              todayAtt.map((emp) => (
                <div
                  key={emp.employee_id}
                  onClick={() => openAttModal(emp)}
                  className="flex items-center gap-4 px-5 py-3 hover:bg-stone-50 cursor-pointer transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-brand-700 font-semibold">{emp.name.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-stone-900">{emp.name}</p>
                    <p className="text-xs text-stone-400">{emp.designation || emp.employee_code}</p>
                  </div>
                  {emp.check_in_time && (
                    <p className="text-xs text-stone-400 hidden sm:block">In: {emp.check_in_time}</p>
                  )}
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${attColors[emp.attendance_status] || attColors[null]}`}>
                    {emp.attendance_status || 'Not Marked'}
                  </span>
                  <svg className="w-4 h-4 text-stone-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Mark Attendance Modal */}
      <Modal isOpen={attModal} onClose={() => setAttModal(false)} title={`Mark Attendance — ${attEmployee?.name}`} size="sm">
        <div className="space-y-4">
          <p className="text-xs text-stone-400">
            Date: {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {['Present', 'Absent', 'Half-day', 'Leave'].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setAttStatus(s)}
                className={`py-3 rounded-xl text-sm font-semibold border-2 transition-all ${
                  attStatus === s
                    ? {
                        Present:  'bg-green-500 border-green-500 text-white',
                        Absent:   'bg-red-500 border-red-500 text-white',
                        'Half-day': 'bg-amber-400 border-amber-400 text-white',
                        Leave:    'bg-blue-500 border-blue-500 text-white',
                      }[s]
                    : 'border-stone-200 text-stone-600 hover:border-stone-300 bg-white'
                }`}
              >
                {{ Present: '✅ Present', Absent: '❌ Absent', 'Half-day': '🌗 Half Day', Leave: '🏖️ Leave' }[s]}
              </button>
            ))}
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setAttModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleMarkAtt} disabled={attSaving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {attSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
              {attSaving ? 'Saving...' : 'Mark Attendance'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
