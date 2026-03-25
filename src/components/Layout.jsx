import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  LayoutDashboard, Upload, CheckCircle, DollarSign, Wallet,
  FileText, Shield, BarChart3, Building, CreditCard, TrendingUp,
  LogOut, Menu, X, Zap, ChevronRight, Sun, Moon
} from 'lucide-react';

const navigationConfig = {
  msme: {
    title: 'MSME Console',
    items: [
      { path: '/msme', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { path: '/msme/upload', label: 'Upload Invoice', icon: Upload },
      { path: '/msme/verification', label: 'Verification Status', icon: CheckCircle },
      { path: '/msme/offers', label: 'Funding Offers', icon: DollarSign },
      { path: '/msme/receive', label: 'Receive Money', icon: Wallet },
    ]
  },
  funder: {
    title: 'Funder Dashboard',
    items: [
      { path: '/funder', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { path: '/funder/invoices', label: 'Available Invoices', icon: FileText },
      { path: '/funder/risk', label: 'Risk Scores', icon: Shield },
      { path: '/funder/portfolio', label: 'Portfolio', icon: BarChart3 },
    ]
  },
  buyer: {
    title: 'Buyer Portal',
    items: [
      { path: '/buyer', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { path: '/buyer/confirm', label: 'Confirm Invoice', icon: Building },
      { path: '/buyer/financing', label: 'Track Financing', icon: TrendingUp },
      { path: '/buyer/payment', label: 'Make Payment', icon: CreditCard },
    ]
  }
};

export default function Layout() {
  const { user, userRole, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('invoflow-theme') === 'dark';
  });
  const nav = navigationConfig[userRole] || navigationConfig.msme;

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('invoflow-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--th-bg)' }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" style={{ background: 'var(--th-overlay)' }} onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-72 flex flex-col transform transition-transform duration-300 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`} style={{ background: 'var(--th-bg-sidebar)', backdropFilter: 'blur(16px)', borderRight: '1px solid var(--th-border)' }}>
        {/* Logo */}
        <div className="p-6" style={{ borderBottom: '1px solid var(--th-border)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center">
              <Zap size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold" style={{ color: 'var(--th-text)' }}>InvoFlow</h1>
              <p className="text-xs text-primary-400 font-medium">AI-Powered Finance</p>
            </div>
          </div>
        </div>

        {/* Role badge */}
        <div className="px-6 py-4">
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--th-text-faint)' }}>{nav.title}</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 overflow-y-auto">
          {nav.items.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl mb-1 text-sm font-medium transition-all duration-200 group`
              }
              style={({ isActive }) => ({
                background: isActive ? 'var(--th-active-bg)' : 'transparent',
                color: isActive ? 'var(--color-primary-500)' : 'var(--th-text-muted)',
                border: isActive ? '1px solid var(--th-active-border)' : '1px solid transparent',
              })}
            >
              <item.icon size={18} className="flex-shrink-0" />
              <span className="flex-1">{item.label}</span>
              <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div className="p-4" style={{ borderTop: '1px solid var(--th-border)' }}>
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ background: 'var(--th-bg-card)', border: '1px solid var(--th-border)' }}>
            <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-white text-sm font-bold">
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate" style={{ color: 'var(--th-text)' }}>{user?.email || 'User'}</p>
              <p className="text-xs capitalize" style={{ color: 'var(--th-text-faint)' }}>{userRole}</p>
            </div>
            <button onClick={handleLogout} className="p-2 rounded-lg transition-colors text-danger-400 hover:bg-danger-500/10">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-30 px-6 py-4 flex items-center justify-between" style={{ background: 'var(--th-glass-bg)', backdropFilter: 'blur(16px)', borderBottom: '1px solid var(--th-border)' }}>
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg transition-colors"
            style={{ color: 'var(--th-text-muted)' }}
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-4 ml-auto">
            {/* Theme toggle */}
            <button
              onClick={() => setIsDark(!isDark)}
              className="p-2 rounded-xl transition-all duration-300"
              style={{ background: 'var(--th-bg-card)', border: '1px solid var(--th-border)' }}
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? <Sun size={18} className="text-warning-400" /> : <Moon size={18} className="text-primary-500" />}
            </button>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent-400 animate-pulse" />
              <span className="text-sm" style={{ color: 'var(--th-text-muted)' }}>Agents Active</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
