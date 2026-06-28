import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

export default function LandingPage() {
  const navigate = useNavigate();
  const [showIntro, setShowIntro] = useState(true);
  const [theme, setTheme] = useState(() => {
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  });

  // FD simulator state
  const [principal, setPrincipal] = useState(100000);
  const [years, setYears] = useState(3);
  const [result, setResult] = useState(0);
  const interestRate = 0.071; // 7.1% interest rate

  useEffect(() => {
    // A = P(1 + r)^t
    const calculated = principal * Math.pow(1 + interestRate, years);
    setResult(Math.round(calculated));
  }, [principal, years]);

  useEffect(() => {
    const handleInteraction = () => {
      setShowIntro(false);
      window.removeEventListener('mousemove', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };

    window.addEventListener('mousemove', handleInteraction);
    window.addEventListener('keydown', handleInteraction);
    window.addEventListener('touchstart', handleInteraction);

    return () => {
      window.removeEventListener('mousemove', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };
  }, []);

  useEffect(() => {
    if (showIntro) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-reveal');
        }
      });
    }, { threshold: 0.1 });

    // Track scroll elements
    const elements = document.querySelectorAll('.scroll-reveal');
    elements.forEach(el => observer.observe(el));

    return () => {
      elements.forEach(el => observer.unobserve(el));
    };
  }, [showIntro]);

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

  const handleAccessVault = () => {
    navigate('/login');
  };

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="landing-container">
      {/* 1. Fullscreen Reveal Intro Animation */}
      {showIntro && (
        <div className="reveal-intro">
          <div className="reveal-intro__content">
            <div className="reveal-intro__logo-wrapper">
              <svg width="48" height="48" viewBox="0 0 28 28" fill="none">
                <rect width="28" height="28" rx="8" fill="#0369A1"/>
                <path d="M8 10h12M8 14h12M8 18h8" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <h1 className="reveal-intro__title">VAULTBANK</h1>
            <p className="reveal-intro__tagline">Trust through refinement.</p>
          </div>
        </div>
      )}

      {/* Soft Top-Right Gradient Bloom */}
      <div className="landing-bloom" />

      {/* Sticky Header Nav */}
      <nav className="landing-nav">
        <div className="landing-nav__container">
          <div className="landing-nav__logo">
            <svg width="32" height="32" viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="8" fill="#0369A1"/>
              <path d="M8 10h12M8 14h12M8 18h8" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span className="landing-nav__brand-name">VaultBank</span>
          </div>

          <div className="landing-nav__links">
            <button type="button" onClick={() => scrollToSection('features')} className="nav-link-btn">Offerings</button>
            <button type="button" onClick={() => scrollToSection('growth')} className="nav-link-btn">FD Growth</button>
            <button type="button" onClick={() => scrollToSection('security')} className="nav-link-btn">Compliance</button>
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
              onClick={handleAccessVault}
            >
              Access Vault
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-section__container">
          <div className="hero-section__content vault-appear" style={{ '--delay': '200ms' }}>
            <div className="hero-badge">🏛️ RBI AUTHORIZED COMMERCIAL PLATFORM</div>
            <h1 className="hero-title">The new standard for wealth precision.</h1>
            <p className="hero-desc">
              VaultBank integrates institutional-grade safety with lightning-fast Indian banking rails. Move funds, accumulate interest, and secure credit lines instantly.
            </p>
            <div className="hero-ctas">
              <button 
                type="button" 
                className="vault-btn hero-primary-btn" 
                onClick={handleAccessVault}
              >
                Access Portal
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
          <div className="hero-section__visual vault-appear" style={{ '--delay': '450ms' }}>
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

      {/* Bento Grid Offerings Section */}
      <section id="features" className="features-section">
        <div className="section-header">
          <h2 className="section-title">Engineered for modern finance</h2>
          <p className="section-desc">Experience three reference points of visual design: Precision, Warmth, and Hierarchy.</p>
        </div>

        <div className="bento-grid">
          {/* Feature 1 */}
          <div className="bento-card vault-card scroll-reveal" style={{ '--delay': '100ms' }}>
            <span className="bento-icon">🛡️</span>
            <h3>Dynamic Security Keys</h3>
            <p>Every high-value transfer over ₹10,000 triggers immediate manager oversight and secure CIBIL verification. No unauthorized withdrawals, ever.</p>
          </div>
          {/* Feature 2 */}
          <div className="bento-card vault-card scroll-reveal" style={{ '--delay': '200ms' }}>
            <span className="bento-icon">⚡</span>
            <h3>Indian Rail Consistency</h3>
            <p>Standardized deposits and payments across Delhi Connaught Place, Mumbai Central, Bengaluru Koramangala, and Hyderabad Banjara Hills.</p>
          </div>
          {/* Feature 3 */}
          <div className="bento-card vault-card scroll-reveal" style={{ '--delay': '300ms' }}>
            <span className="bento-icon">💳</span>
            <h3>45-Day Interest-Free Cards</h3>
            <p>Elevate your CIBIL score automatically with our Premium Card. Enjoy 45 interest-free days and instant lock capability in the Credit Card Hub.</p>
          </div>
        </div>
      </section>

      {/* Simulator Section */}
      <section id="growth" className="calculator-section">
        <div className="calculator-container scroll-reveal">
          <div className="calc-info">
            <h2 className="section-title">See your wealth compound</h2>
            <p className="section-desc">
              VaultBank Fixed Deposits yield up to 7.1% interest. Adjust the principal amount and duration to simulate your growth.
            </p>
            <div className="calc-metrics">
              <div className="calc-metric-box">
                <span className="calc-metric-lbl">Principal Invested</span>
                <strong className="font-mono-data">₹{principal.toLocaleString('en-IN')}</strong>
              </div>
              <div className="calc-metric-box">
                <span className="calc-metric-lbl">Estimated Returns</span>
                <strong className="font-mono-data text-accent">₹{result.toLocaleString('en-IN')}</strong>
              </div>
            </div>
          </div>

          <div className="calc-sliders">
            <div className="slider-group">
              <div className="slider-label-row">
                <span>Principal Amount</span>
                <strong className="font-mono-data">₹{principal.toLocaleString('en-IN')}</strong>
              </div>
              <input 
                type="range" 
                min="10000" 
                max="1000000" 
                step="10000" 
                value={principal}
                onChange={(e) => setPrincipal(parseInt(e.target.value))}
                className="calc-range-input"
              />
            </div>

            <div className="slider-group">
              <div className="slider-label-row">
                <span>Investment Period</span>
                <strong className="font-mono-data">{years} Years</strong>
              </div>
              <input 
                type="range" 
                min="1" 
                max="5" 
                step="1" 
                value={years}
                onChange={(e) => setYears(parseInt(e.target.value))}
                className="calc-range-input"
              />
            </div>
            <p className="calc-note">Calculated at premium composite compounding rate of 7.1% per annum.</p>
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section id="security" className="security-section">
        <div className="security-container scroll-reveal">
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
              onClick={handleAccessVault}
            >
              Sign In to Verify Account Details
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-footer__container">
          <p>© 2026 VaultBank Commercial Banking Division. Authorized by Reserve Bank of India.</p>
        </div>
      </footer>
    </div>
  );
}
