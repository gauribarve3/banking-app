import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import ChatBubble from '../components/ChatBubble';
import { useAuth } from '../hooks/useAuth';
import './DashboardLayout.css';

export default function DashboardLayout() {
  const { user } = useAuth();
  
  const [theme, setTheme] = useState(() => {
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  });

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('vault-theme', nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const getRoleHeaderStripe = () => {
    if (user?.role === 'admin') return 'stripe-admin';
    if (user?.role === 'employee') return 'stripe-employee';
    return 'stripe-customer';
  };

  const getRoleLabel = () => {
    if (user?.role === 'admin') return 'System Administrator Portal';
    if (user?.role === 'employee') return 'Branch Management Operations';
    return 'Premium Customer Portal';
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="dashboard-layout__main">
        {/* Top Header Bar */}
        <header className={`vault-header ${getRoleHeaderStripe()}`}>
          <div className="vault-header__left">
            <span className="vault-header__portal-name">{getRoleLabel()}</span>
          </div>
          <div className="vault-header__right">
            <div className="vault-header__user-meta">
              <button 
                type="button" 
                className="vault-header__theme-toggle" 
                onClick={toggleTheme}
                title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              >
                {theme === 'dark' ? '☀️' : '🌙'}
              </button>
              <span className="vault-header__user-email">{user?.email}</span>
              <span className="vault-header__status-dot"></span>
            </div>
          </div>
        </header>
        <div className="dashboard-layout__content">
          <Outlet />
        </div>
      </main>
      <ChatBubble />
    </div>
  );
}
