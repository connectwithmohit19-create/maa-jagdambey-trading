import { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';

export default function PortalLayout() {
  const navigate  = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('mjt_portal_token');
    const cust  = localStorage.getItem('mjt_portal_customer');
    if (!token) { navigate('/portal/login'); return; }
    if (cust) setCustomer(JSON.parse(cust));
  }, [navigate]);

  const logout = () => {
    localStorage.removeItem('mjt_portal_token');
    localStorage.removeItem('mjt_portal_customer');
    navigate('/portal/login');
  };

  const navLinks = [
    { to: '/catalogue',        label: 'Catalogue', icon: '🛍️' },
    { to: '/portal/dashboard', label: 'Dashboard', icon: '🏠' },
    { to: '/portal/orders',    label: 'My Orders',  icon: '📦' },
    { to: '/portal/payments',  label: 'Payments',   icon: '💳' },
  ];

  return (
    <div className="min-h-screen" style={{ background: '#EFDFCE' }}>
      <header className="sticky top-0 z-30 shadow-warm" style={{ background: '#3d2730' }}>
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #8f6069, #6e4850)' }}>
              <span className="text-white font-bold font-display">M</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-white truncate">Maa Jagdambey Trading</p>
              {customer && <p className="text-xs truncate" style={{ color: '#b98089' }}>{customer.name}{customer.shopName ? ` · ${customer.shopName}` : ''}</p>}
            </div>
            <button onClick={() => setMenuOpen(!menuOpen)} className="sm:hidden p-2 rounded-lg" style={{ color: '#d4adb2' }}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d={menuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
              </svg>
            </button>
            <nav className="hidden sm:flex items-center gap-1">
              {navLinks.map(l => (
                <NavLink key={l.to} to={l.to}
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${isActive ? 'text-white' : ''}`
                  }
                  style={({ isActive }) => isActive ? { background: '#8f6069' } : { color: '#d4adb2' }}>
                  {l.label}
                </NavLink>
              ))}
              <button onClick={logout} className="ml-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all" style={{ color: '#d4adb2' }}>
                Logout
              </button>
            </nav>
          </div>
          {menuOpen && (
            <div className="sm:hidden mt-3 pt-3 space-y-1" style={{ borderTop: '1px solid #4a2e34' }}>
              {navLinks.map(l => (
                <NavLink key={l.to} to={l.to} onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${isActive ? 'text-white' : ''}`
                  }
                  style={({ isActive }) => isActive ? { background: '#8f6069' } : { color: '#d4adb2' }}>
                  {l.icon} {l.label}
                </NavLink>
              ))}
              <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm" style={{ color: '#d4adb2' }}>
                🚪 Logout
              </button>
            </div>
          )}
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
