import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { login } from '../lib/api';

export default function Login() {
  const navigate = useNavigate();
  const { setAuth } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password) {
      setError('Please enter username and password.');
      return;
    }

    setLoading(true);

    try {
      localStorage.removeItem('mjt_token');
      localStorage.removeItem('mjt_user');

      const res = await login(username.trim(), password);

      if (res.success) {
        localStorage.setItem('mjt_token', res.token);
        localStorage.setItem('mjt_user', JSON.stringify(res.user));
        setAuth(res.user);
        navigate('/dashboard');
      } else {
        setError(res.message || 'Login failed');
      }

    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="min-h-screen flex" style={{ background: '#EFDFCE' }}>
      {/* Left panel — decorative */}
      <div className="hidden lg:flex lg:w-2/5 flex-col justify-between p-10"
        style={{ background: 'linear-gradient(160deg, #4a2e34 0%, #3d2730 50%, #261e19 100%)' }}>
        <div>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #8f6069, #6e4850)' }}>
            <span className="text-white font-bold text-2xl font-display">M</span>
          </div>
        </div>
        <div>
          <h2 className="font-display font-bold text-3xl text-white leading-tight">
            Maa Jagdambey<br />Trading
          </h2>
          <p className="mt-3 text-sm" style={{ color: '#b98089' }}>Electronics &amp; Appliances Wholesale</p>
          <p className="text-xs mt-1" style={{ color: '#6e4850' }}>Lucknow, Uttar Pradesh</p>
          <div className="mt-8 space-y-3">
            {['Dashboard & Analytics', 'Orders & Invoices', 'Employee Management', 'Customer Portal'].map(f => (
              <div key={f} className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#8f6069' }} />
                <span className="text-sm" style={{ color: '#d4adb2' }}>{f}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs" style={{ color: '#4a2e34' }}>v5.0 · Business Management System</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden text-center mb-8">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-warm-md mx-auto mb-3"
              style={{ background: 'linear-gradient(135deg, #8f6069, #3d2730)' }}>
              <span className="text-white font-bold text-2xl font-display">M</span>
            </div>
            <h1 className="font-display font-bold text-xl text-warm-900">Maa Jagdambey Trading</h1>
          </div>

          <div className="bg-white rounded-2xl border border-beige-400 shadow-warm-md p-7">
            <h2 className="font-display font-bold text-xl text-warm-900 mb-1">Admin Login</h2>
            <p className="text-warm-400 text-xs mb-6">Sign in to manage your business</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-warm-600 mb-1.5">Username</label>
                <input type="text" value={username} onChange={e => { setUsername(e.target.value); setError(''); }}
                  className="input-field" placeholder="admin" autoFocus />
              </div>
              <div>
                <label className="block text-xs font-semibold text-warm-600 mb-1.5">Password</label>
                <div className="relative">
                  <input type={showPwd ? 'text' : 'password'} value={password}
                    onChange={e => { setPassword(e.target.value); setError(''); }}
                    className="input-field pr-10" placeholder="••••••••" />
                  <button type="button" onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-warm-400 hover:text-warm-600">
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

              <button type="submit" disabled={loading} className="btn-primary w-full py-3 flex items-center justify-center gap-2 mt-2">
                {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>
          </div>

          <p className="text-center mt-5">
            <a href="/portal/login" className="text-xs text-warm-400 hover:text-warm-600 transition-colors">Customer Portal →</a>
          </p>
        </div>
      </div>
    </div>
  );
}
