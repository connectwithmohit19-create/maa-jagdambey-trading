import { useLocation } from 'react-router-dom';

const pageTitles = {
  '/dashboard':  { title: 'Dashboard',    subtitle: 'Business overview' },
  '/products':   { title: 'Products',     subtitle: 'Inventory management' },
  '/customers':  { title: 'Customers',    subtitle: 'Customer management' },
  '/orders':     { title: 'Orders',       subtitle: 'View and manage orders' },
  '/orders/new': { title: 'New Order',    subtitle: 'Create a new order' },
  '/payments':   { title: 'Payments',     subtitle: 'Payment collections' },
  '/employees':  { title: 'Employees',    subtitle: 'Staff management' },
  '/employees/new': { title: 'Add Employee', subtitle: 'Register new staff' },
};

export default function Header({ onMenuClick }) {
  const location = useLocation();
  const pathKey = Object.keys(pageTitles).find(k =>
    location.pathname === k || (k !== '/' && location.pathname.startsWith(k + '/'))
  );
  const page = pageTitles[pathKey] || { title: 'Maa Jagdambey Trading', subtitle: '' };
  const today = new Date().toLocaleDateString('en-IN', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-stone-100 px-4 md:px-6 py-3">
      <div className="flex items-center gap-4">
        <button onClick={onMenuClick} className="md:hidden p-2 rounded-lg text-stone-500 hover:bg-stone-100 transition-colors" aria-label="Open menu">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold text-stone-900 truncate">{page.title}</h2>
          <p className="text-xs text-stone-400 hidden sm:block">{today}</p>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-green-700 font-medium">Live</span>
        </div>
      </div>
    </header>
  );
}
