import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Badge from './ui/Badge';
import './Sidebar.css';

const navItems = {
  customer: [
    { path: '/customer/dashboard', label: 'Dashboard', icon: 'home' },
    { path: '/customer/accounts', label: 'Accounts', icon: 'wallet' },
    { path: '/customer/transfer', label: 'Transfer', icon: 'send' },
    { path: '/customer/deposit', label: 'Deposit Money', icon: 'deposit' },
    { path: '/customer/credit-card', label: 'Credit Card', icon: 'creditcard' },
    { path: '/customer/mandates', label: 'Mandates', icon: 'calendar' },
    { path: '/customer/profile', label: 'Profile', icon: 'user' },
  ],
  employee: [
    { path: '/employee/dashboard', label: 'Dashboard', icon: 'home' },
    { path: '/employee/approvals', label: 'Approvals', icon: 'check' },
    { path: '/employee/messages', label: 'Messages', icon: 'message' },
    { path: '/employee/credit-cards', label: 'Card Review', icon: 'creditcard' },
  ],
  admin: [
    { path: '/admin/dashboard', label: 'Dashboard', icon: 'home' },
    { path: '/admin/employees', label: 'Employees', icon: 'users' },
    { path: '/admin/branches', label: 'Branches', icon: 'building' },
  ],
};

const icons = {
  home: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M3 10L10 3l7 7v7a1 1 0 01-1 1h-4v-4H8v4H4a1 1 0 01-1-1v-7z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  wallet: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="2" y="5" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M2 9h16" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="14" cy="12.5" r="1" fill="currentColor"/>
    </svg>
  ),
  send: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M18 2L9 11M18 2l-5 16-4-7-7-4 16-5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  check: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M16 5L7.5 14 4 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="2" y="2" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  ),
  users: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="7" cy="7" r="3" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M1 17c0-3 2.5-5 6-5s6 2 6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="14" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M15 12c2.5.5 4 2 4 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  building: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="3" y="3" width="14" height="15" rx="1" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M7 7h2M7 10h2M11 7h2M11 10h2M8 14h4v4H8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  logout: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M7 17H4a1 1 0 01-1-1V4a1 1 0 011-1h3M13 14l4-4-4-4M17 10H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  calendar: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="3" y="4" width="14" height="13" rx="2" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M7 2v4M13 2v4M3 8h14" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  ),
  user: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M16 17c0-2-3-3.5-6-3.5s-6 1.5-6 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="10" cy="7" r="3" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  ),
  deposit: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M10 3v10M6 9l4 4 4-4M3 17h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  creditcard: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="2" y="5" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M2 9h16M5 12h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  message: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M18 4H2v10h4l4 4 4-4h4V4z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
};

const roleLabelMap = {
  customer: 'Customer',
  employee: 'Branch Manager',
  admin: 'System Admin',
};

const roleVariantMap = {
  customer: 'info',
  employee: 'warning',
  admin: 'danger',
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const items = navItems[user?.role] || [];

  const [theme, setTheme] = useState(() => {
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  });

  const toggleTheme = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('vault-theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className={`sidebar sidebar--${user?.role || 'customer'}`}>
      {/* Brand */}
      <div className="sidebar__brand">
        <div className="sidebar__logo">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <rect width="28" height="28" rx="8" fill="var(--color-accent)"/>
            <path d="M8 10h12M8 14h12M8 18h8" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <span className="sidebar__brand-name">VaultBank</span>
      </div>

      {/* User info */}
      <div className="sidebar__user">
        <div className="sidebar__avatar">
          {user?.firstName?.[0]}{user?.lastName?.[0]}
        </div>
        <div className="sidebar__user-info">
          <span className="sidebar__user-name">{user?.firstName} {user?.lastName}</span>
          <Badge variant={roleVariantMap[user?.role]} size="sm">
            {roleLabelMap[user?.role]}
          </Badge>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar__nav">
        <span className="sidebar__nav-label">Menu</span>
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
            }
          >
            <span className="sidebar__link-icon">{icons[item.icon]}</span>
            <span className="sidebar__link-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer controls: Dark Mode & Logout */}
      <div className="sidebar__footer">
        <div className="theme-toggle-container">
          <button 
            type="button"
            className={`theme-toggle-btn ${theme === 'light' ? 'active' : ''}`}
            onClick={() => toggleTheme('light')}
            title="Light Mode"
          >
            ☀️
          </button>
          <button 
            type="button"
            className={`theme-toggle-btn ${theme === 'dark' ? 'active' : ''}`}
            onClick={() => toggleTheme('dark')}
            title="Dark Mode"
          >
            🌙
          </button>
        </div>
        <button className="sidebar__link sidebar__logout" onClick={handleLogout}>
          <span className="sidebar__link-icon">{icons.logout}</span>
          <span className="sidebar__link-label">Sign Out</span>
        </button>
      </div>

      <div className="sidebar__legal" style={{ padding: '12px 20px', fontSize: '11px', color: 'var(--color-text-secondary)', opacity: 0.6, display: 'flex', gap: '8px', borderTop: '1px solid var(--color-border)', justifyContent: 'center' }}>
        <a href="/privacy.txt" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>Privacy Policy</a>
        <span>·</span>
        <a href="/terms.txt" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>Terms</a>
      </div>
    </aside>
  );
}
