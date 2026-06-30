import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import apiClient from '../api/client';
import './LoginPage.css';

const roleHome = {
  customer: '/customer/dashboard',
  employee: '/employee/dashboard',
  admin: '/admin/dashboard',
};

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState('login');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Theme toggle state
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

  // Login form inputs
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Signup form inputs
  const [signupData, setSignupData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    dateOfBirth: '',
    phone: '',
  });

  useEffect(() => {
    setError('');
    setSuccess('');
  }, [activeTab]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const user = await login(loginEmail, loginPassword);
      navigate(roleHome[user.role] || '/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const res = await apiClient.post('/auth/signup', signupData);
      if (res.data.success) {
        setSuccess('Account created! Authenticating...');
        const user = await login(signupData.email, signupData.password);
        setTimeout(() => navigate(roleHome[user.role] || '/'), 500);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Signup failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    const from = encodeURIComponent(window.location.origin);
    window.location.href = `${apiClient.defaults.baseURL}/auth/google?from=${from}`;
  };

  const updateSignupField = (field, value) => {
    setSignupData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="login-page">
      {/* Soft Top-Right Gradient Bloom */}
      <div className="login-bloom" />

      {/* Mini header to go back */}
      <header className="login-page__header">
        <Link to="/" className="login-page__back-link">
          ← Back to Landing
        </Link>
        <button 
          type="button" 
          className="login-nav__theme-toggle" 
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </header>

      {/* Main card center container */}
      <div className="login-page__content">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: '440px', gap: '20px' }}>
          <div className="login-card vault-appear" style={{ '--delay': '100ms' }}>
          
          <div className="login-card__brand">
            <svg width="32" height="32" viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="8" fill="#0369A1"/>
              <path d="M8 10h12M8 14h12M8 18h8" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <h2>VaultBank Portal</h2>
          </div>

          {/* Tab switcher */}
          <div className="login-tabs">
            <button
              className={`login-tab ${activeTab === 'login' ? 'login-tab--active' : ''}`}
              onClick={() => setActiveTab('login')}
            >
              Sign In
            </button>
            <button
              className={`login-tab ${activeTab === 'signup' ? 'login-tab--active' : ''}`}
              onClick={() => setActiveTab('signup')}
            >
              Create Account
            </button>
            <div
              className="login-tab__indicator"
              style={{ transform: `translateX(${activeTab === 'signup' ? '100%' : '0'})` }}
            />
          </div>

          {/* Alert messages */}
          {error && (
            <div className="login-alert login-alert--error">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M8 5v3M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="login-alert login-alert--success">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>{success}</span>
            </div>
          )}

          {/* LOGIN FORM */}
          {activeTab === 'login' && (
            <form className="login-form" onSubmit={handleLogin}>
              <div className="login-form__header">
                <h2>Welcome back</h2>
                <p>Enter your credentials to access your banking profile</p>
              </div>

              <div className="login-form__fields">
                <div className="login-input-group">
                  <label htmlFor="login-email">Email address</label>
                  <input
                    id="login-email"
                    type="email"
                    placeholder="you@example.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>

                <div className="login-input-group">
                  <label htmlFor="login-password">Password</label>
                  <input
                    id="login-password"
                    type="password"
                    placeholder="Enter password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <button type="submit" className="vault-btn login-btn login-btn--primary" disabled={isLoading}>
                {isLoading ? <span className="login-btn__spinner" /> : 'Sign In'}
              </button>

              <div className="login-divider">
                <span>Or continue with</span>
              </div>

              <button type="button" className="vault-btn login-btn login-btn--google" onClick={handleGoogleLogin}>
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                </svg>
                Sign in with Google
              </button>
            </form>
          )}

          {/* SIGNUP FORM */}
          {activeTab === 'signup' && (
            <form className="login-form" onSubmit={handleSignup}>
              <div className="login-form__header">
                <h2>Create account</h2>
                <p>Open Savings and Current accounts with us</p>
              </div>

              <div className="login-form__fields">
                <div className="login-form__row">
                  <div className="login-input-group">
                    <label htmlFor="signup-first">First Name *</label>
                    <input
                      id="signup-first"
                      type="text"
                      placeholder="Gauri"
                      value={signupData.firstName}
                      onChange={(e) => updateSignupField('firstName', e.target.value)}
                      required
                    />
                  </div>
                  <div className="login-input-group">
                    <label htmlFor="signup-last">Last Name *</label>
                    <input
                      id="signup-last"
                      type="text"
                      placeholder="Barve"
                      value={signupData.lastName}
                      onChange={(e) => updateSignupField('lastName', e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="login-form__row">
                  <div className="login-input-group">
                    <label htmlFor="signup-dob">Date of Birth</label>
                    <input
                      id="signup-dob"
                      type="date"
                      value={signupData.dateOfBirth}
                      onChange={(e) => updateSignupField('dateOfBirth', e.target.value)}
                    />
                  </div>
                  <div className="login-input-group">
                    <label htmlFor="signup-phone">Phone Number</label>
                    <input
                      id="signup-phone"
                      type="tel"
                      placeholder="+91 9876543210"
                      value={signupData.phone}
                      onChange={(e) => updateSignupField('phone', e.target.value)}
                    />
                  </div>
                </div>

                <div className="login-input-group">
                  <label htmlFor="signup-email">Email Address *</label>
                  <input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    value={signupData.email}
                    onChange={(e) => updateSignupField('email', e.target.value)}
                    required
                  />
                </div>

                <div className="login-form__row">
                  <div className="login-input-group">
                    <label htmlFor="signup-pass">Password *</label>
                    <input
                      id="signup-pass"
                      type="password"
                      placeholder="Min 6 characters"
                      value={signupData.password}
                      onChange={(e) => updateSignupField('password', e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                  <div className="login-input-group">
                    <label htmlFor="signup-confirm">Confirm Password *</label>
                    <input
                      id="signup-confirm"
                      type="password"
                      placeholder="Re-enter password"
                      value={signupData.confirmPassword}
                      onChange={(e) => updateSignupField('confirmPassword', e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              <button type="submit" className="vault-btn login-btn login-btn--primary" disabled={isLoading}>
                {isLoading ? <span className="login-btn__spinner" /> : 'Create Account'}
              </button>

              <div className="login-divider">
                <span>Or sign up with</span>
              </div>

              <button type="button" className="vault-btn login-btn login-btn--google" onClick={handleGoogleLogin}>
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                </svg>
                Sign up with Google
              </button>
            </form>
          )}
        </div>
        <div className="login-footer" style={{ textAlign: 'center', fontSize: '12px', color: 'var(--color-text-secondary)', opacity: 0.8 }}>
          <a href="/privacy.txt" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline', marginRight: '12px' }}>Privacy Policy</a>
          <a href="/terms.txt" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>Terms & Conditions</a>
        </div>
      </div>
      </div>
    </div>
  );
}
