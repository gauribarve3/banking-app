import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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

  // Theme state
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

  // Auth drawer slide state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Growth Simulator Calculator state
  const [calcPrincipal, setCalcPrincipal] = useState(100000);
  const [calcYears, setCalcYears] = useState(3);
  const calcRate = 0.071; // 7.1% standard premium rate
  const [calcResult, setCalcResult] = useState(0);

  useEffect(() => {
    // Calculate simple compound interest: A = P(1 + r)^n
    const total = calcPrincipal * Math.pow(1 + calcRate, calcYears);
    setCalcResult(Math.round(total));
  }, [calcPrincipal, calcYears]);

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
      setError(err.response?.data?.message || 'Login failed. Please try again.');
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
        setSuccess('Account created! Logging you in...');
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
    window.location.href = 'http://localhost:5000/api/auth/google';
  };

  const updateSignupField = (field, value) => {
    setSignupData(prev => ({ ...prev, [field]: value }));
  };

  // Scroll to page section helper
  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="landing-page">
      {/* Sticky Premium Navigation Header */}
      <nav className="landing-nav">
        <div className="landing-nav__container">
          <div className="landing-nav__logo">
            <svg width="32" height="32" viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="8" fill="var(--customer-accent)"/>
              <path d="M8 10h12M8 14h12M8 18h8" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span className="landing-nav__brand-name">VaultBank</span>
          </div>

          <div className="landing-nav__links">
            <button type="button" onClick={() => scrollToSection('features')} className="nav-link-btn">Features</button>
            <button type="button" onClick={() => scrollToSection('calculator')} className="nav-link-btn">Interest Growth</button>
            <button type="button" onClick={() => scrollToSection('security')} className="nav-link-btn">Security</button>
          </div>

          <div className="landing-nav__actions">
            <button 
              type="button" 
              className="landing-nav__theme-toggle" 
              onClick={toggleTheme}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <button 
              type="button" 
              className="vault-btn cta-primary-btn"
              onClick={() => { setIsDrawerOpen(true); setActiveTab('login'); }}
            >
              Access Vault
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-section__container">
          <div className="hero-section__content vault-appear" style={{ '--delay': '100ms' }}>
            <div className="hero-badge">🔒 SECURE RBI AUTHORIZED ESCROW</div>
            <h1 className="hero-title">The new standard for wealth precision.</h1>
            <p className="hero-desc">
              VaultBank integrates institutional-grade safety with lightning-fast Indian banking rails. Move funds, accumulate interest, and secure credit lines instantly.
            </p>
            <div className="hero-ctas">
              <button 
                type="button" 
                className="vault-btn hero-primary-btn" 
                onClick={() => { setIsDrawerOpen(true); setActiveTab('signup'); }}
              >
                Open Account Instantly
              </button>
              <button 
                type="button" 
                className="vault-btn hero-secondary-btn" 
                onClick={() => scrollToSection('features')}
              >
                Explore Offerings ↓
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="hero-metrics">
              <div className="metric-item">
                <span className="metric-num font-mono-data">₹500Cr+</span>
                <span className="metric-lbl">Monthly Volume</span>
              </div>
              <div className="metric-item">
                <span className="metric-num font-mono-data">7.1%</span>
                <span className="metric-lbl">FD Interest</span>
              </div>
              <div className="metric-item">
                <span className="metric-num font-mono-data">99.9%</span>
                <span className="metric-lbl">Core Rails Uptime</span>
              </div>
            </div>
          </div>

          {/* Interactive Live Dashboard Mockup */}
          <div className="hero-section__visual vault-appear" style={{ '--delay': '300ms' }}>
            <div className="mockup-frame">
              <div className="mockup-header">
                <span className="mockup-dot red"></span>
                <span className="mockup-dot yellow"></span>
                <span className="mockup-dot green"></span>
                <span className="mockup-title">VaultBank Live Dashboard</span>
              </div>
              <div className="mockup-body">
                <div className="mockup-grid">
                  <div className="mockup-card balance">
                    <span className="mockup-card-label">SAVINGS ACCOUNT</span>
                    <strong className="mockup-card-amount font-mono-data">₹3,42,850.75</strong>
                    <span className="mockup-card-sub text-success">↑ 12% this month</span>
                  </div>
                  <div className="mockup-card limit">
                    <span className="mockup-card-label">PREMIUM CREDIT LIMIT</span>
                    <strong className="mockup-card-amount font-mono-data">₹10,000.00</strong>
                    <div className="mockup-progress-bar">
                      <div className="mockup-progress-fill" style={{ width: '60%' }}></div>
                    </div>
                  </div>
                </div>

                <div className="mockup-transactions">
                  <span className="mockup-section-title">RECENT TRANSACTIONS</span>
                  <div className="mockup-tx-row">
                    <span>Rent Repayment (Mumbai)</span>
                    <strong className="font-mono-data text-danger">-₹18,500</strong>
                  </div>
                  <div className="mockup-tx-row">
                    <span>FD Interest Payout</span>
                    <strong className="font-mono-data text-success">+₹2,410</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Bento Section */}
      <section id="features" className="features-section">
        <div className="section-header">
          <h2 className="section-title">Engineered for modern finance</h2>
          <p className="section-desc">Experience three reference points of visual design: Precision, Warmth, and Hierarchy.</p>
        </div>

        <div className="bento-grid">
          {/* Feature 1 */}
          <div className="bento-card vault-card vault-appear" style={{ '--delay': '100ms' }}>
            <span className="bento-icon">🛡️</span>
            <h3>Dynamic Security Keys</h3>
            <p>Every high-value transfer over ₹10,000 triggers immediate manager oversight and secure CIBIL verification. No unauthorized withdrawals, ever.</p>
          </div>
          {/* Feature 2 */}
          <div className="bento-card vault-card vault-appear" style={{ '--delay': '200ms' }}>
            <span className="bento-icon">⚡</span>
            <h3>Indian Rail Consistency</h3>
            <p>Standardized deposits and payments across Delhi Connaught Place, Mumbai Central, Bengaluru Koramangala, and Hyderabad Banjara Hills.</p>
          </div>
          {/* Feature 3 */}
          <div className="bento-card vault-card vault-appear" style={{ '--delay': '300ms' }}>
            <span className="bento-icon">💳</span>
            <h3>45-Day Interest-Free Cards</h3>
            <p>Elevate your CIBIL score automatically with our Premium Card. Enjoy 45 interest-free days and instant lock capability in the Credit Card Hub.</p>
          </div>
        </div>
      </section>

      {/* Simulator Section */}
      <section id="calculator" className="calculator-section">
        <div className="calculator-container">
          <div className="calc-info">
            <h2 className="section-title">See your wealth compound</h2>
            <p className="section-desc">
              VaultBank Fixed Deposits yield up to 7.1% interest. Adjust the principal amount and duration to simulate your growth.
            </p>
            <div className="calc-metrics">
              <div className="calc-metric-box">
                <span className="calc-metric-lbl">Principal Invested</span>
                <strong className="font-mono-data">₹{calcPrincipal.toLocaleString('en-IN')}</strong>
              </div>
              <div className="calc-metric-box">
                <span className="calc-metric-lbl">Estimated Returns</span>
                <strong className="font-mono-data text-accent">₹{calcResult.toLocaleString('en-IN')}</strong>
              </div>
            </div>
          </div>

          <div className="calc-sliders">
            <div className="slider-group">
              <div className="slider-label-row">
                <span>Principal Amount</span>
                <strong className="font-mono-data">₹{calcPrincipal.toLocaleString('en-IN')}</strong>
              </div>
              <input 
                type="range" 
                min="10000" 
                max="1000000" 
                step="10000" 
                value={calcPrincipal}
                onChange={(e) => setCalcPrincipal(parseInt(e.target.value))}
                className="calc-range-input"
              />
            </div>

            <div className="slider-group">
              <div className="slider-label-row">
                <span>Investment Period</span>
                <strong className="font-mono-data">{calcYears} Years</strong>
              </div>
              <input 
                type="range" 
                min="1" 
                max="5" 
                step="1" 
                value={calcYears}
                onChange={(e) => setCalcYears(parseInt(e.target.value))}
                className="calc-range-input"
              />
            </div>
            <p className="calc-note">Calculated at premium composite compounding rate of 7.1% per annum.</p>
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section id="security" className="security-section">
        <div className="security-container">
          <div className="security-visual">
            <div className="vault-lock-motif">
              <div className="lock-circle">🔒</div>
              <div className="pulse-ring"></div>
              <div className="pulse-ring delay-1"></div>
            </div>
          </div>
          <div className="security-text">
            <h2>Your safety is our absolute priority</h2>
            <p>
              We operate under rigorous RBI guidelines. Our automated escrow locks credit lines whenever anomalous high-value transactions are flagged or rejected, ensuring maximum safety for savings and current deposits.
            </p>
            <button 
              type="button" 
              className="vault-btn security-cta"
              onClick={() => { setIsDrawerOpen(true); setActiveTab('login'); }}
            >
              Sign In to Verify Account Details
            </button>
          </div>
        </div>
      </section>

      {/* AUTH SLIDE-OUT DRAWER BACKDROP */}
      {isDrawerOpen && (
        <div className="drawer-backdrop" onClick={() => setIsDrawerOpen(false)} />
      )}

      {/* AUTH SLIDE-OUT DRAWER */}
      <div className={`auth-drawer ${isDrawerOpen ? 'open' : ''}`}>
        <div className="drawer-header">
          <h3>Portal Access</h3>
          <button type="button" className="drawer-close-btn" onClick={() => setIsDrawerOpen(false)}>✕</button>
        </div>

        <div className="login-card">
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

          {/* Error/Success messages */}
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
                <p>Sign in to access your secure portal</p>
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
                    placeholder="Enter your password"
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
                <h2>Create your account</h2>
                <p>Register Savings & Current accounts instantly</p>
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
      </div>
    </div>
  );
}
