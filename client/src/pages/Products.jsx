import { useEffect, useState, useCallback } from 'react';
import {
  getProducts, createProduct, updateProduct, deleteProduct, getProductCategories,
} from '../lib/api';
import Modal from '../components/Modal';

const emptyForm = {
  sku: '', product_name: '', category_id: '', brand: '', model_number: '',
  description: '', warranty_period: '', warranty_type: '',
  purchase_price: '', retail_price: '', lko_local_price: '',
  outer_market_price: '', special_rate_price: '',
  current_stock: '', minimum_stock: '5', unit: 'Piece',
  hsn_code: '', gst_percentage: '18',
};

function PriceField({ label, name, value, onChange, highlight }) {
  return (
    <div>
      <label className={`block text-xs font-medium mb-1 ${highlight ? 'text-brand-700' : 'text-stone-600'}`}>
        {label}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">₹</span>
        <input
          type="number"
          name={name}
          value={value}
          onChange={onChange}
          min="0"
          step="0.01"
          className={`input-field pl-7 ${highlight ? 'border-brand-300 focus:ring-brand-400' : ''}`}
          placeholder="0"
        />
      </div>
    </div>
  );
}

export default function Products() {
  const [products, setProducts]     = useState([]);
  const [categories, setCategories] = useState([]);
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

  const fetchProducts = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (search.trim()) params.search = search.trim();
      if (catFilter) params.category = catFilter;
      const res = await getProducts(params);
      setProducts(res.data.products);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search, catFilter]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    getProductCategories().then((res) => setCategories(res.data.categories)).catch(console.error);
  }, []);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (product) => {
    setEditing(product);
    setForm({
      sku: product.sku || '',
      product_name: product.product_name || '',
      category_id: product.category_id || '',
      brand: product.brand || '',
      model_number: product.model_number || '',
      description: product.description || '',
      warranty_period: product.warranty_period || '',
      warranty_type: product.warranty_type || '',
      purchase_price: product.purchase_price || '',
      retail_price: product.retail_price || '',
      lko_local_price: product.lko_local_price || '',
      outer_market_price: product.outer_market_price || '',
      special_rate_price: product.special_rate_price || '',
      current_stock: product.current_stock || '',
      minimum_stock: product.minimum_stock || '5',
      unit: product.unit || 'Piece',
      hsn_code: product.hsn_code || '',
      gst_percentage: product.gst_percentage || '18',
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
    if (!form.product_name.trim()) {
      setFormError('Product name is required.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      if (editing) {
        await updateProduct(editing.product_id, form);
      } else {
        await createProduct(form);
      }
      setModalOpen(false);
      fetchProducts(pagination.page);
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save product.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteProduct(id);
      setDeleteConfirm(null);
      fetchProducts(pagination.page);
    } catch (err) {
      console.error(err);
    }
  };

  const fmt = (n) =>
    n ? `₹${Number(n).toLocaleString('en-IN')}` : '—';

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-1 max-w-lg">
          <input
            type="text"
            placeholder="Search by name, SKU, brand..."
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
            {categories.map((c) => (
              <option key={c.category_id} value={c.category_id}>{c.category_name}</option>
            ))}
          </select>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2 whitespace-nowrap">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Product
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-stone-400 uppercase">Product</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-stone-400 uppercase hidden md:table-cell">Category</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-stone-400 uppercase">Retail</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-stone-400 uppercase hidden lg:table-cell">LKO Price</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-stone-400 uppercase hidden lg:table-cell">Stock</th>
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
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-stone-400">
                    {search ? 'No products match your search.' : 'No products yet. Add your first product!'}
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.product_id} className="border-b border-stone-50 hover:bg-stone-50/60 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-medium text-stone-900 truncate max-w-[180px]">{p.product_name}</p>
                      <p className="text-xs text-stone-400">{p.sku} {p.brand ? `· ${p.brand}` : ''}</p>
                    </td>
                    <td className="px-3 py-3 hidden md:table-cell">
                      <span className="text-stone-600 text-xs">{p.category_name || '—'}</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="font-medium text-stone-800">{fmt(p.retail_price)}</span>
                    </td>
                    <td className="px-3 py-3 hidden lg:table-cell">
                      <span className="text-stone-600">{fmt(p.lko_local_price)}</span>
                    </td>
                    <td className="px-3 py-3 hidden lg:table-cell">
                      <span className={`font-medium ${p.current_stock <= p.minimum_stock ? 'text-red-600' : 'text-stone-700'}`}>
                        {p.current_stock}
                      </span>
                      {p.current_stock <= p.minimum_stock && (
                        <span className="ml-1 text-xs text-red-500">Low</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <span className={p.is_active ? 'badge-active' : 'badge-inactive'}>
                        {p.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(p)}
                          className="p-1.5 text-stone-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(p)}
                          className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
                onClick={() => fetchProducts(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => fetchProducts(pagination.page + 1)}
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
        title={editing ? 'Edit Product' : 'Add New Product'}
        size="lg"
      >
        <form onSubmit={handleSave} className="space-y-5">
          {/* Basic Info */}
          <div>
            <h4 className="text-sm font-semibold text-stone-700 mb-3 pb-1 border-b border-stone-100">Basic Information</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-stone-600 mb-1">Product Name *</label>
                <input name="product_name" value={form.product_name} onChange={handleChange}
                  className="input-field" placeholder="e.g. Samsung AC 1.5 Ton 5 Star" />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">SKU</label>
                <input name="sku" value={form.sku} onChange={handleChange}
                  className="input-field" placeholder="Auto-generated if empty" />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Category</label>
                <select name="category_id" value={form.category_id} onChange={handleChange} className="input-field">
                  <option value="">Select category</option>
                  {categories.map((c) => (
                    <option key={c.category_id} value={c.category_id}>{c.category_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Brand</label>
                <input name="brand" value={form.brand} onChange={handleChange}
                  className="input-field" placeholder="e.g. Samsung" />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Model Number</label>
                <input name="model_number" value={form.model_number} onChange={handleChange}
                  className="input-field" placeholder="e.g. AR18BY5ZAPU" />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Warranty Period</label>
                <input name="warranty_period" value={form.warranty_period} onChange={handleChange}
                  className="input-field" placeholder="e.g. 1 Year" />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Unit</label>
                <select name="unit" value={form.unit} onChange={handleChange} className="input-field">
                  <option value="Piece">Piece</option>
                  <option value="Box">Box</option>
                  <option value="Set">Set</option>
                  <option value="Pair">Pair</option>
                </select>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div>
            <h4 className="text-sm font-semibold text-stone-700 mb-3 pb-1 border-b border-stone-100">
              Pricing (3-Tier System)
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <PriceField label="Purchase Price (Admin Only)" name="purchase_price"
                value={form.purchase_price} onChange={handleChange} highlight />
              <PriceField label="Retail / MRP" name="retail_price"
                value={form.retail_price} onChange={handleChange} />
              <PriceField label="LKO Local Price" name="lko_local_price"
                value={form.lko_local_price} onChange={handleChange} />
              <PriceField label="Outer Market Price" name="outer_market_price"
                value={form.outer_market_price} onChange={handleChange} />
              <PriceField label="Special Rate" name="special_rate_price"
                value={form.special_rate_price} onChange={handleChange} />
            </div>
          </div>

          {/* Stock & Tax */}
          <div>
            <h4 className="text-sm font-semibold text-stone-700 mb-3 pb-1 border-b border-stone-100">Stock & Tax</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Current Stock</label>
                <input type="number" name="current_stock" value={form.current_stock} onChange={handleChange}
                  min="0" className="input-field" placeholder="0" />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Min Stock (Reorder)</label>
                <input type="number" name="minimum_stock" value={form.minimum_stock} onChange={handleChange}
                  min="0" className="input-field" placeholder="5" />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">HSN Code</label>
                <input name="hsn_code" value={form.hsn_code} onChange={handleChange}
                  className="input-field" placeholder="e.g. 8415" />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">GST %</label>
                <select name="gst_percentage" value={form.gst_percentage} onChange={handleChange} className="input-field">
                  <option value="0">0%</option>
                  <option value="5">5%</option>
                  <option value="12">12%</option>
                  <option value="18">18%</option>
                  <option value="28">28%</option>
                </select>
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
              ) : editing ? 'Update Product' : 'Add Product'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Deactivate Product" size="sm">
        <div className="text-center py-2">
          <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h4 className="font-semibold text-stone-900 mb-1">Are you sure?</h4>
          <p className="text-stone-500 text-sm mb-5">
            This will deactivate <strong>{deleteConfirm?.product_name}</strong>. It can be reactivated later.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={() => handleDelete(deleteConfirm.product_id)} className="btn-danger flex-1">
              Deactivate
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
