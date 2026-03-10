import { useEffect, useState, useCallback } from 'react';
import {
  getCustomers, createCustomer, updateCustomer, deleteCustomer, getPriceCategories,
} from '../lib/api';
import Modal from '../components/Modal';

const emptyForm = {
  name: '', shop_name: '', contact_number: '', alternate_number: '',
  email: '', address: '', city: 'Lucknow', state: 'Uttar Pradesh',
  pincode: '', gst_number: '', pan_number: '',
  price_category_id: '', credit_limit: '', customer_type: 'Retailer',
};

const customerTypes = ['Retailer', 'Dealer', 'Distributor', 'Wholesaler'];

const categoryColors = {
  'LKO': 'bg-blue-50 text-blue-700 border-blue-200',
  'OUT': 'bg-purple-50 text-purple-700 border-purple-200',
  'SPL': 'bg-brand-50 text-brand-700 border-brand-200',
  'RTL': 'bg-stone-100 text-stone-600 border-stone-200',
};

export default function Customers() {
  const [customers, setCustomers]   = useState([]);
  const [priceCategories, setPriceCats] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [catFilter, setCatFilter]   = useState('');

  const [modalOpen, setModalOpen]   = useState(false);
  const [editing, setEditing]       = useState(null);
  const [form, setForm]             = useState(emptyForm);
  const [formError, setFormError]   = useState('');
  const [saving, setSaving]         = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const fetchCustomers = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (search.trim()) params.search = search.trim();
      if (catFilter) params.price_category = catFilter;
      const res = await getCustomers(params);
      setCustomers(res.data.customers);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search, catFilter]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  useEffect(() => {
    getPriceCategories().then((res) => setPriceCats(res.data.categories)).catch(console.error);
  }, []);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (customer) => {
    setEditing(customer);
    setForm({
      name: customer.name || '',
      shop_name: customer.shop_name || '',
      contact_number: customer.contact_number || '',
      alternate_number: customer.alternate_number || '',
      email: customer.email || '',
      address: customer.address || '',
      city: customer.city || 'Lucknow',
      state: customer.state || 'Uttar Pradesh',
      pincode: customer.pincode || '',
      gst_number: customer.gst_number || '',
      pan_number: customer.pan_number || '',
      price_category_id: customer.price_category_id || '',
      credit_limit: customer.credit_limit || '',
      customer_type: customer.customer_type || 'Retailer',
    });
    setFormError('');
    setModalOpen(true);
  };

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setFormError('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setFormError('Customer name is required.');
      return;
    }
    if (!form.contact_number.trim()) {
      setFormError('Contact number is required.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      if (editing) {
        await updateCustomer(editing.customer_id, form);
      } else {
        await createCustomer(form);
      }
      setModalOpen(false);
      fetchCustomers(pagination.page);
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save customer.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteCustomer(id);
      setDeleteConfirm(null);
      fetchCustomers(pagination.page);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-1 max-w-lg">
          <input
            type="text"
            placeholder="Search by name, shop, contact..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field flex-1"
          />
          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            className="input-field w-40"
          >
            <option value="">All Categories</option>
            {priceCategories.map((c) => (
              <option key={c.category_id} value={c.category_id}>{c.category_name}</option>
            ))}
          </select>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2 whitespace-nowrap">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Customer
        </button>
      </div>

      {/* Summary */}
      <div className="flex gap-2 flex-wrap">
        <span className="px-3 py-1 bg-stone-100 text-stone-600 text-xs rounded-full font-medium">
          Total: {pagination.total} customers
        </span>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-stone-400 uppercase">Customer</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-stone-400 uppercase hidden sm:table-cell">Contact</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-stone-400 uppercase hidden md:table-cell">Price Category</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-stone-400 uppercase hidden lg:table-cell">Credit Limit</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-stone-400 uppercase hidden lg:table-cell">Balance</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-stone-400 uppercase">Status</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-stone-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-stone-50">
                    {[...Array(7)].map((_, j) => (
                      <td key={j} className="px-3 py-4">
                        <div className="h-4 rounded shimmer" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-stone-400">
                    {search ? 'No customers match your search.' : 'No customers yet. Add your first customer!'}
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.customer_id} className="border-b border-stone-50 hover:bg-stone-50/60 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-medium text-stone-900 truncate max-w-[160px]">{c.name}</p>
                      <p className="text-xs text-stone-400 truncate max-w-[160px]">
                        {c.shop_name || c.customer_code} · {c.customer_type}
                      </p>
                    </td>
                    <td className="px-3 py-3 hidden sm:table-cell">
                      <p className="text-stone-700">{c.contact_number}</p>
                      {c.city && <p className="text-xs text-stone-400">{c.city}</p>}
                    </td>
                    <td className="px-3 py-3 hidden md:table-cell">
                      {c.category_code ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${categoryColors[c.category_code] || 'bg-stone-100 text-stone-600'}`}>
                          {c.price_category_name}
                        </span>
                      ) : (
                        <span className="text-stone-400 text-xs">Not assigned</span>
                      )}
                    </td>
                    <td className="px-3 py-3 hidden lg:table-cell">
                      <span className="text-stone-600">
                        ₹{Number(c.credit_limit || 0).toLocaleString('en-IN')}
                      </span>
                    </td>
                    <td className="px-3 py-3 hidden lg:table-cell">
                      <span className={`font-medium ${c.current_balance > 0 ? 'text-amber-600' : 'text-stone-600'}`}>
                        ₹{Number(c.current_balance || 0).toLocaleString('en-IN')}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={c.status === 'Active' ? 'badge-active' : 'badge-inactive'}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(c)}
                          className="p-1.5 text-stone-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(c)}
                          className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Deactivate"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
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
              Showing {((pagination.page - 1) * 15) + 1}–{Math.min(pagination.page * 15, pagination.total)} of {pagination.total}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => fetchCustomers(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => fetchCustomers(pagination.page + 1)}
                disabled={pagination.page === pagination.pages}
                className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Customer' : 'Add New Customer'}
        size="lg"
      >
        <form onSubmit={handleSave} className="space-y-5">
          {/* Personal Info */}
          <div>
            <h4 className="text-sm font-semibold text-stone-700 mb-3 pb-1 border-b border-stone-100">Customer Information</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Full Name *</label>
                <input name="name" value={form.name} onChange={handleChange}
                  className="input-field" placeholder="e.g. Ramesh Kumar" />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Shop / Business Name</label>
                <input name="shop_name" value={form.shop_name} onChange={handleChange}
                  className="input-field" placeholder="e.g. Kumar Electronics" />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Contact Number *</label>
                <input name="contact_number" value={form.contact_number} onChange={handleChange}
                  className="input-field" placeholder="10-digit mobile number" maxLength={10} />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Alternate Number</label>
                <input name="alternate_number" value={form.alternate_number} onChange={handleChange}
                  className="input-field" placeholder="Optional" maxLength={10} />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Customer Type</label>
                <select name="customer_type" value={form.customer_type} onChange={handleChange} className="input-field">
                  {customerTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Price Category</label>
                <select name="price_category_id" value={form.price_category_id} onChange={handleChange} className="input-field">
                  <option value="">Select category</option>
                  {priceCategories.map((c) => (
                    <option key={c.category_id} value={c.category_id}>{c.category_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Email</label>
                <input type="email" name="email" value={form.email} onChange={handleChange}
                  className="input-field" placeholder="Optional" />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Credit Limit (₹)</label>
                <input type="number" name="credit_limit" value={form.credit_limit} onChange={handleChange}
                  min="0" className="input-field" placeholder="0" />
              </div>
            </div>
          </div>

          {/* Address */}
          <div>
            <h4 className="text-sm font-semibold text-stone-700 mb-3 pb-1 border-b border-stone-100">Address</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-stone-600 mb-1">Full Address</label>
                <textarea name="address" value={form.address} onChange={handleChange}
                  className="input-field resize-none" rows={2} placeholder="Shop/house address" />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">City</label>
                <input name="city" value={form.city} onChange={handleChange} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Pincode</label>
                <input name="pincode" value={form.pincode} onChange={handleChange}
                  className="input-field" placeholder="6-digit pincode" maxLength={6} />
              </div>
            </div>
          </div>

          {/* GST / PAN */}
          <div>
            <h4 className="text-sm font-semibold text-stone-700 mb-3 pb-1 border-b border-stone-100">Tax Information (Optional)</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">GST Number</label>
                <input name="gst_number" value={form.gst_number} onChange={handleChange}
                  className="input-field font-mono uppercase" placeholder="15-digit GSTIN" maxLength={15} />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">PAN Number</label>
                <input name="pan_number" value={form.pan_number} onChange={handleChange}
                  className="input-field font-mono uppercase" placeholder="10-char PAN" maxLength={10} />
              </div>
            </div>
          </div>

          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {formError}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : editing ? 'Update Customer' : 'Add Customer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Deactivate Customer" size="sm">
        <div className="text-center py-2">
          <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h4 className="font-semibold text-stone-900 mb-1">Deactivate Customer?</h4>
          <p className="text-stone-500 text-sm mb-5">
            <strong>{deleteConfirm?.name}</strong> will be marked inactive. Their data will be preserved.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={() => handleDelete(deleteConfirm.customer_id)} className="btn-danger flex-1">
              Deactivate
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
