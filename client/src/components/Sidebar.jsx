import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg> },
  { path: '/products',  label: 'Products',  icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg> },
  { path: '/customers', label: 'Customers', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
  { path: '/orders',    label: 'Orders',    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg> },
  { path: '/payments',  label: 'Payments',  icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg> },
  { path: '/employees', label: 'Employees', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> },
  { path: '/reports',   label: 'Reports',   icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> },
];

export default function Sidebar({ onClose }) {
  const { logout, user } = useAuth();

  return (
    <div className="flex flex-col h-full" style={{ background: '#3d2730' }}>
      {/* Brand */}
      <div className="px-5 py-5 border-b" style={{ borderColor: '#4a2e34' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #8f6069, #6e4850)' }}>
            <span className="text-white font-bold text-lg font-display">M</span>
          </div>
          <div className="min-w-0">
            <h1 className="font-display font-bold text-sm text-white leading-tight truncate">Maa Jagdambey</h1>
            <p className="text-xs truncate" style={{ color: '#b98089' }}>Trading · v5.0</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-xs font-semibold uppercase tracking-wider px-3 mb-3" style={{ color: '#6e4850' }}>Main Menu</p>
        {navItems.map(item => (
          <NavLink key={item.path} to={item.path} onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${isActive ? 'text-white' : 'text-maroon-300 hover:text-white'}`
            }
            style={({ isActive }) => isActive ? { background: '#8f6069' } : {}}
            onMouseEnter={e => { if (!e.currentTarget.classList.contains('text-white') || e.currentTarget.style.background !== '#8f6069') e.currentTarget.style.background = '#4a2e34'; }}
            onMouseLeave={e => { if (e.currentTarget.style.background === '#4a2e34') e.currentTarget.style.background = 'transparent'; }}
          >
            <span style={{ color: 'inherit' }}>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}

        <div className="pt-4 pb-1">
          <p className="text-xs font-semibold uppercase tracking-wider px-3 mb-3" style={{ color: '#6e4850' }}>Public & Portal</p>
          {[
            { href: '/catalogue', label: 'Product Catalogue ↗', icon: '🛍️' },
            { href: '/portal/login', label: 'Customer Portal ↗', icon: '🌐' },
          ].map(l => (
            <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
              style={{ color: '#b98089' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#4a2e34'; e.currentTarget.style.color = 'white'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#b98089'; }}>
              <span>{l.icon}</span>{l.label}
            </a>
          ))}
        </div>
      </nav>

      {/* User + logout */}
      <div className="px-3 py-4 border-t" style={{ borderColor: '#4a2e34' }}>
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: '#8f6069' }}>
            <span className="text-white text-xs font-bold">{user?.fullName?.charAt(0) || 'A'}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white text-sm font-medium truncate">{user?.fullName || 'Admin'}</p>
            <p className="text-xs" style={{ color: '#b98089' }}>{user?.role || 'Admin'}</p>
          </div>
        </div>
        <button onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
          style={{ color: '#b98089' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#4a2e34'; e.currentTarget.style.color = '#f5e6e8'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#b98089'; }}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          Logout
        </button>
      </div>
    </div>
  );
}
