import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { portalLogin } from '../../lib/api';

export default function PortalLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password) { setError('Please enter username and password.'); return; }
    setLoading(true);
    try {
      const res = await portalLogin(username.trim().toLowerCase(), password);
      localStorage.setItem('mjt_portal_token', res.data.token);
      localStorage.setItem('mjt_portal_customer', JSON.stringify(res.data.customer));
      navigate('/portal/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#EFDFCE' }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-warm-md mx-auto mb-4"
            style={{ background: 'linear-gradient(135deg, #8f6069, #3d2730)' }}>
            <span className="text-white font-bold text-3xl font-display">M</span>
          </div>
          <h1 className="font-display font-bold text-2xl text-warm-900">Maa Jagdambey</h1>
          <p className="text-warm-500 text-sm mt-1">Customer Portal</p>
        </div>

        <div className="bg-white rounded-2xl border border-beige-400 shadow-warm-md p-6">
          <h2 className="font-semibold text-warm-900 text-lg mb-1">Welcome Back</h2>
          <p className="text-warm-400 text-xs mb-5">Log in to view your orders, invoices &amp; balance</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-warm-600 mb-1.5">Username</label>
              <input type="text" value={username} onChange={e => { setUsername(e.target.value); setError(''); }}
                className="input-field" placeholder="Your username" autoCapitalize="off" autoFocus />
            </div>
            <div>
              <label className="block text-xs font-semibold text-warm-600 mb-1.5">Password</label>
              <div className="relative">
                <input type={showPwd ? 'text' : 'password'} value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  className="input-field pr-10" placeholder="Your password" />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-warm-400 hover:text-warm-600 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    {showPwd
                      ? <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      : <><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></>
                    }
                  </svg>
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl text-xs" style={{ background: '#fdf5f6', border: '1px solid #d4adb2', color: '#6e4850' }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
              {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {loading ? 'Logging in…' : 'Login to Portal'}
            </button>
          </form>

          <p className="text-center text-xs text-warm-400 mt-5">Forgot credentials? Contact us at your store.</p>
        </div>

        <div className="text-center mt-5 space-y-2">
          <a href="/catalogue" className="block text-sm font-medium transition-colors" style={{ color: '#8f6069' }}>
            🛍️ Browse Product Catalogue
          </a>
          <a href="/login" className="block text-xs text-warm-400 hover:text-warm-600 transition-colors">← Admin Login</a>
        </div>
      </div>
    </div>
  );
}
