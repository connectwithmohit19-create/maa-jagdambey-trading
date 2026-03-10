import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createEmployee, updateEmployee, getEmployee } from '../lib/api';

const emptyForm = {
  name: '', contact_number: '', address: '',
  aadhar_number: '', joining_date: '', designation: '',
  monthly_salary: '', status: 'Active',
};

export default function EmployeeForm() {
  const navigate   = useNavigate();
  const { id }     = useParams();
  const isEdit     = !!id;

  const [form, setForm]     = useState(emptyForm);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  useEffect(() => {
    if (!isEdit) return;
    getEmployee(id).then((res) => {
      const e = res.data.employee;
      setForm({
        name: e.name || '',
        contact_number: e.contact_number || '',
        address: e.address || '',
        aadhar_number: e.aadhar_number || '',
        joining_date: e.joining_date?.split('T')[0] || '',
        designation: e.designation || '',
        monthly_salary: e.monthly_salary || '',
        status: e.status || 'Active',
      });
    }).catch(() => setError('Employee not found.')).finally(() => setLoading(false));
  }, [id, isEdit]);

  const handleChange = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim())           { setError('Name is required.'); return; }
    if (!form.contact_number.trim()) { setError('Contact number is required.'); return; }
    if (!form.joining_date)          { setError('Joining date is required.'); return; }

    setSaving(true);
    try {
      if (isEdit) {
        await updateEmployee(id, form);
        navigate(`/employees/${id}`);
      } else {
        const res = await createEmployee(form);
        navigate(`/employees/${res.data.employee.employee_id}`);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save employee.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="max-w-xl mx-auto space-y-4">
      {[...Array(3)].map((_, i) => <div key={i} className="card p-6 h-24 shimmer" />)}
    </div>
  );

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(isEdit ? `/employees/${id}` : '/employees')} className="p-2 rounded-lg text-stone-400 hover:bg-stone-100 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h2 className="font-display font-bold text-xl text-stone-900">{isEdit ? 'Edit Employee' : 'Add New Employee'}</h2>
          <p className="text-stone-400 text-xs mt-0.5">{isEdit ? 'Update employee details' : 'Fill in the details below'}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        {/* Personal Info */}
        <div>
          <h4 className="text-sm font-semibold text-stone-700 mb-3 pb-1 border-b border-stone-100">Personal Details</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-stone-600 mb-1">Full Name *</label>
              <input name="name" value={form.name} onChange={handleChange}
                className="input-field" placeholder="e.g. Ravi Kumar" />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Contact Number *</label>
              <input name="contact_number" value={form.contact_number} onChange={handleChange}
                className="input-field" placeholder="10-digit mobile" maxLength={10} />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Aadhar Number</label>
              <input name="aadhar_number" value={form.aadhar_number} onChange={handleChange}
                className="input-field" placeholder="12-digit Aadhar" maxLength={12} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-stone-600 mb-1">Address</label>
              <textarea name="address" value={form.address} onChange={handleChange}
                className="input-field resize-none" rows={2} placeholder="Residential address" />
            </div>
          </div>
        </div>

        {/* Job Details */}
        <div>
          <h4 className="text-sm font-semibold text-stone-700 mb-3 pb-1 border-b border-stone-100">Job Details</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Designation / Role</label>
              <input name="designation" value={form.designation} onChange={handleChange}
                className="input-field" placeholder="e.g. Sales Staff" />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Joining Date *</label>
              <input type="date" name="joining_date" value={form.joining_date} onChange={handleChange}
                className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Monthly Salary (₹)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">₹</span>
                <input type="number" name="monthly_salary" value={form.monthly_salary} onChange={handleChange}
                  min="0" className="input-field pl-7" placeholder="e.g. 15000" />
              </div>
            </div>
            {isEdit && (
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Employment Status</label>
                <select name="status" value={form.status} onChange={handleChange} className="input-field">
                  <option value="Active">Active</option>
                  <option value="Resigned">Resigned</option>
                  <option value="Terminated">Terminated</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>
        )}

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => navigate(isEdit ? `/employees/${id}` : '/employees')} className="btn-secondary flex-1">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
            {saving ? 'Saving...' : isEdit ? 'Update Employee' : 'Add Employee'}
          </button>
        </div>
      </form>
    </div>
  );
}
