import { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import { formatCurrency, formatDate } from '../../utils/format';
import './CreditCardHub.css';

export default function CreditCardHub() {
  const [accounts, setAccounts] = useState([]);
  const [creditCard, setCreditCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Account Aggregator Consent State
  const [showConsentModal, setShowConsentModal] = useState(false);

  // Spending Simulator State
  const [spendAmount, setSpendAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [showSpendModal, setShowSpendModal] = useState(false);

  // Repayment State
  const [repayAmount, setRepayAmount] = useState('');
  const [selectedSourceAcc, setSelectedSourceAcc] = useState('');
  const [showRepayModal, setShowRepayModal] = useState(false);

  const fetchCardData = async () => {
    try {
      const res = await apiClient.get('/customer/accounts');
      setAccounts(res.data.accounts || []);
      setCreditCard(res.data.creditCard || null);
      
      const operationalAccs = (res.data.accounts || []).filter(a => a.accountType !== 'FD');
      if (operationalAccs.length > 0 && !selectedSourceAcc) {
        setSelectedSourceAcc(operationalAccs[0].accountNumber);
      }
    } catch (err) {
      console.error('Fetch card data error:', err);
      setError('Failed to load card status.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCardData();
  }, []);

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

  const handleApply = async () => {
    setActionLoading(true);
    setError('');
    try {
      const res = await apiClient.post('/customer/credit-card/apply');
      setCreditCard(res.data.creditCard);
      setSuccessMsg('Your premium credit card application has been submitted successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Application submission failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSpendSimulate = async (e) => {
    e.preventDefault();
    if (!spendAmount || parseFloat(spendAmount) <= 0 || !merchant.trim()) {
      setError('Please fill in valid spending details.');
      return;
    }
    setActionLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await apiClient.post('/customer/credit-card/spend', {
        amount: parseFloat(spendAmount),
        merchant: merchant.trim(),
      });
      setCreditCard(res.data.creditCard);
      setSuccessMsg(`Simulated spend of ₹${parseFloat(spendAmount).toLocaleString('en-IN')} at ${merchant} approved.`);
      setSpendAmount('');
      setMerchant('');
      setShowSpendModal(false);
      fetchCardData(); // Refresh balances
    } catch (err) {
      setError(err.response?.data?.message || 'Transaction declined.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRepay = async (e) => {
    e.preventDefault();
    const outstandingDues = creditCard.outstandingAmount + (creditCard.interestAccrued || 0);
    if (!repayAmount || parseFloat(repayAmount) <= 0 || parseFloat(repayAmount) > outstandingDues) {
      setError(`Please enter a repayment amount between ₹1 and ₹${outstandingDues.toLocaleString('en-IN')}.`);
      return;
    }
    setActionLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await apiClient.post('/customer/credit-card/pay', {
        amount: parseFloat(repayAmount),
        sourceAccountNum: selectedSourceAcc,
      });
      setCreditCard(res.data.creditCard);
      setAccounts(res.data.accounts);
      setSuccessMsg(`Repayment of ₹${parseFloat(repayAmount).toLocaleString('en-IN')} successful.`);
      setRepayAmount('');
      setShowRepayModal(false);
      fetchCardData();
    } catch (err) {
      setError(err.response?.data?.message || 'Repayment failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConsentResponse = async (action) => {
    setActionLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await apiClient.post('/customer/credit-card/limit-increase', { action });
      if (action === 'grant') {
        setCreditCard(res.data.creditCard);
        setSuccessMsg(res.data.message);
      } else {
        setError(res.data.message);
      }
      setShowConsentModal(false);
      fetchCardData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to process limit upgrade.');
    } finally {
      setActionLoading(false);
    }
  };

  const getCibilRating = (score) => {
    if (score >= 800) return { label: 'Excellent CIBIL', variant: 'success' };
    if (score >= 700) return { label: 'Good CIBIL', variant: 'info' };
    if (score >= 600) return { label: 'Fair CIBIL', variant: 'warning' };
    return { label: 'Poor CIBIL', variant: 'danger' };
  };

  if (loading) {
    return (
      <div className="page-loading">
        <div className="loading-screen__spinner" />
      </div>
    );
  }

  // Not eligible card
  const isEligible = totalBalance >= 50000;
  const progressPct = Math.min(100, (totalBalance / 50000) * 100);

  return (
    <div className="cc-hub-page">
      <div className="page-header">
        <h1 className="page-title">Credit Card Hub</h1>
        <p className="page-subtitle">Manage your VaultBank Premium Credit Card & CIBIL score dynamics</p>
      </div>

      {error && <div className="cc-error-message">{error}</div>}
      {successMsg && <div className="cc-success-message">{successMsg}</div>}

      {/* RENDER BASED ON CARD STATUS */}
      {(!creditCard || creditCard.status === 'none' || creditCard.status === 'eligible') && (
        <div className="cc-status-container">
          <Card className="cc-promo-card">
            <div className="cc-promo-content">
              <div className="cc-promo-badge">EXCLUSIVE OFFER</div>
              <h2>VaultBank Premium Credit Card</h2>
              <p className="cc-promo-desc">
                Step into a world of financial flexibility. Get access to interest-free credit for up to 30 days, instant card usage, and monthly credit building reports.
              </p>
              
              <div className="cc-benefits">
                <div className="cc-benefit-item">
                  <span className="benefit-icon">💳</span>
                  <div>
                    <strong>₹10,000 Credit Limit</strong>
                    <p>Substantial starting limit for everyday shopping</p>
                  </div>
                </div>
                <div className="cc-benefit-item">
                  <span className="benefit-icon">📅</span>
                  <div>
                    <strong>30-Day Interest-Free Period</strong>
                    <p>Pay on time to build your score without extra interest</p>
                  </div>
                </div>
                <div className="cc-benefit-item">
                  <span className="benefit-icon">📈</span>
                  <div>
                    <strong>CIBIL Score Multiplier</strong>
                    <p>Timely payments reward your CIBIL score (+15 points)</p>
                  </div>
                </div>
              </div>

              {isEligible ? (
                <div className="cc-apply-now">
                  <p className="eligibility-ok-text">🎉 Congratulations! You meet the combined balance criteria of ₹50,000.</p>
                  <Button variant="primary" size="lg" onClick={handleApply} isLoading={actionLoading}>
                    Apply Instantly
                  </Button>
                </div>
              ) : (
                <div className="cc-lock-overlay">
                  <div className="cc-lock-message">
                    <span>🔒 Eligibility Locked</span>
                    <p>Requires combined accounts balance of ₹50,000 or above.</p>
                    <div className="eligibility-progress">
                      <div className="eligibility-progress-header">
                        <span>Current Portfolio Worth</span>
                        <strong>{formatCurrency(totalBalance)} / ₹50,000</strong>
                      </div>
                      <div className="progress-bar-bg">
                        <div className="progress-bar-fill" style={{ width: `${progressPct}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="cc-promo-visual">
              <div className="card-mockup card-mockup--gold">
                <div className="card-mockup__brand">VaultBank</div>
                <div className="card-mockup__chip"></div>
                <div className="card-mockup__number">4111 5500 •••• ••••</div>
                <div className="card-mockup__footer">
                  <span className="card-mockup__name">PREMIUM CLIENT</span>
                  <span className="card-mockup__expiry">VALID THRU: 12/30</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {creditCard && creditCard.status === 'applied' && (
        <div className="cc-status-container">
          <Card className="cc-pending-card">
            <div className="cc-pending-icon">⏳</div>
            <h2>Credit Card Application Under Review</h2>
            <p>Your relationship officer is checking your accounts and background details. Reviews normally take less than 24 hours.</p>
            <div className="cc-pending-details">
              <div><strong>Application Date:</strong> {creditCard.applicationDate ? formatDate(creditCard.applicationDate) : 'Today'}</div>
              <div><strong>Assigned Credit Limit:</strong> ₹10,000 (Expected)</div>
              <div><strong>Current CIBIL Status:</strong> {creditCard.cibilScore || 750}</div>
            </div>
            <Button variant="secondary" onClick={fetchCardData}>Refresh Status</Button>
          </Card>
        </div>
      )}

      {creditCard && creditCard.status === 'rejected' && (
        <div className="cc-status-container">
          <Card className="cc-rejected-card">
            <div className="cc-rejected-icon">❌</div>
            <h2>Application Declined</h2>
            <p>We regret to inform you that your application could not be approved at this time. Maintain a positive account ledger history and try applying again later.</p>
            <Button variant="primary" onClick={handleApply} isLoading={actionLoading}>Re-apply</Button>
          </Card>
        </div>
      )}

      {creditCard && creditCard.status === 'frozen' && (
        <div className="cc-status-container">
          <Card className="cc-frozen-card">
            <div className="cc-frozen-icon">❄️</div>
            <h2>Credit Card Frozen</h2>
            <p className="cc-frozen-text">
              Your credit card has been frozen due to security policies or a recently rejected high-value transfer request.
            </p>
            <div className="cc-frozen-actions-note">
              ℹ️ Transactions are temporarily disabled. Please contact your assigned branch manager to resolve this security flag and unfreeze your card.
            </div>
            <Button variant="secondary" onClick={fetchCardData}>Refresh Status</Button>
          </Card>
        </div>
      )}

      {creditCard && creditCard.status === 'active' && (
        <div className="cc-dashboard-layout">
          {/* Card Visualizer & Stats */}
          <div className="cc-dashboard-main">
            <Card className="cc-visualizer-card">
              <div className="card-visualizer-container">
                <div className="credit-card-glow"></div>
                <div className="credit-card-body">
                  <div className="card-header">
                    <span className="card-brand">VaultBank</span>
                    <span className="card-model">Premium</span>
                  </div>
                  <div className="card-chip"></div>
                  <div className="card-number">
                    {creditCard.cardNumber ? creditCard.cardNumber.replace(/(.{4})/g, '$1 ') : '•••• •••• •••• ••••'}
                  </div>
                  <div className="card-footer">
                    <div className="card-holder">
                      <span className="label">Card Holder</span>
                      <span className="value">Self</span>
                    </div>
                    <div className="card-valid">
                      <span className="label">Valid Thru</span>
                      <span className="value">12/30</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress of Limit */}
              <div className="limit-progress-section">
                <div className="limit-meta">
                  <span>Available Credit Limit</span>
                  <strong>{formatCurrency(creditCard.availableLimit)} / {formatCurrency(creditCard.cardLimit)}</strong>
                </div>
                <div className="limit-bar-bg">
                  <div className="limit-bar-fill" style={{ width: `${(creditCard.availableLimit / creditCard.cardLimit) * 100}%` }}></div>
                </div>
              </div>
            </Card>

            {/* Stats Grid */}
            <div className="cc-stats-grid">
              <Card>
                <span className="stat-label">Outstanding Balance</span>
                <h3 className="stat-value text-danger">{formatCurrency(creditCard.outstandingAmount)}</h3>
                <span className="stat-sub">Principal dues billed</span>
              </Card>

              <Card>
                <span className="stat-label">Interest Accrued</span>
                <h3 className="stat-value text-warning">{formatCurrency(creditCard.interestAccrued || 0)}</h3>
                <span className="stat-sub">2% monthly past due date</span>
              </Card>

              <Card>
                <span className="stat-label">Payment Due Date</span>
                <h3 className="stat-value">{creditCard.dueDate ? formatDate(creditCard.dueDate) : '—'}</h3>
                {new Date() > new Date(creditCard.dueDate) ? (
                  <Badge variant="danger">Late/Past Due</Badge>
                ) : (
                  <Badge variant="success">Interest-Free Period</Badge>
                )}
              </Card>

              <Card>
                <span className="stat-label">CIBIL Score</span>
                <h3 className="stat-value text-accent">{creditCard.cibilScore || 750}</h3>
                <Badge variant={getCibilRating(creditCard.cibilScore || 750).variant}>
                  {getCibilRating(creditCard.cibilScore || 750).label}
                </Badge>
              </Card>
            </div>
          </div>

          {/* Quick Actions Repay & Spend */}
          <div className="cc-dashboard-side">
            <Card className="cc-actions-card">
              <h3>Card Commands</h3>
              <p>Simulate purchases or repay outstanding balances to build credit score history.</p>
              
              <div className="cc-action-buttons">
                <Button variant="primary" fullWidth onClick={() => setShowSpendModal(true)}>
                  💳 Simulate Spend / Charge Card
                </Button>
                
                <Button 
                  variant="secondary" 
                  fullWidth 
                  onClick={() => setShowRepayModal(true)}
                  disabled={creditCard.outstandingAmount === 0 && (creditCard.interestAccrued || 0) === 0}
                >
                  💵 Repay Outstanding Dues
                </Button>

                <Button 
                  variant="outline" 
                  fullWidth 
                  onClick={() => setShowConsentModal(true)}
                  style={{ marginTop: '12px' }}
                >
                  🚀 Request Credit Limit Increase
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Spend Simulator Modal */}
      <Modal
        isOpen={showSpendModal}
        onClose={() => setShowSpendModal(false)}
        title="Simulate Credit Card Purchase"
      >
        <form onSubmit={handleSpendSimulate} className="cc-spend-form">
          <p className="modal-description-text">Simulate swipe, online, or POS spending using your premium credit card limit.</p>
          
          <Input
            id="spend-merchant"
            label="Merchant / Business Name"
            placeholder="e.g. Amazon.in, Starbucks, Indigo Airlines"
            value={merchant}
            onChange={(e) => setMerchant(e.target.value)}
            required
          />

          <Input
            id="spend-amount"
            label="Transaction Amount"
            type="number"
            min="1"
            max={creditCard ? creditCard.availableLimit : 10000}
            placeholder="0.00"
            prefix="₹"
            value={spendAmount}
            onChange={(e) => setSpendAmount(e.target.value)}
            required
          />

          {creditCard && parseFloat(spendAmount) > creditCard.availableLimit && (
            <div className="spend-error-warning">
              ⚠️ Insufficient available limit! Available: {formatCurrency(creditCard.availableLimit)}
            </div>
          )}

          <div className="modal-actions-wrap">
            <Button type="button" variant="secondary" onClick={() => setShowSpendModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={actionLoading} disabled={!merchant || !spendAmount || parseFloat(spendAmount) > (creditCard?.availableLimit || 0)}>
              Authorize Spend
            </Button>
          </div>
        </form>
      </Modal>

      {/* Repay Modal */}
      <Modal
        isOpen={showRepayModal}
        onClose={() => setShowRepayModal(false)}
        title="Repay Outstanding Balance"
      >
        <form onSubmit={handleRepay} className="cc-repay-form">
          <p className="modal-description-text">Repay card dues from savings or checking accounts. Timely repayment rewards your CIBIL score!</p>

          <div className="input-group">
            <label className="input-group__label" htmlFor="repay-source">Repayment Account Source</label>
            <select
              id="repay-source"
              className="deposit-select"
              value={selectedSourceAcc}
              onChange={(e) => setSelectedSourceAcc(e.target.value)}
            >
              {accounts.filter(a => a.accountType !== 'FD').map((acc) => (
                <option key={acc._id} value={acc.accountNumber} disabled={acc.isFrozen}>
                  {acc.accountType} Account — {acc.accountNumber} ({formatCurrency(acc.balance)})
                  {acc.isFrozen ? ' [FROZEN]' : ''}
                </option>
              ))}
            </select>
          </div>

          <Input
            id="repay-amount"
            label="Repayment Amount"
            type="number"
            min="1"
            max={creditCard ? creditCard.outstandingAmount + (creditCard.interestAccrued || 0) : 10000}
            placeholder="0.00"
            prefix="₹"
            value={repayAmount}
            onChange={(e) => setRepayAmount(e.target.value)}
            required
          />

          <div className="repay-details-hint">
            Outstanding dues to settle: <strong>{formatCurrency((creditCard?.outstandingAmount || 0) + (creditCard?.interestAccrued || 0))}</strong>
            <br />
            {creditCard && new Date() > new Date(creditCard.dueDate) ? (
              <span className="text-danger">⚠️ Repaying late (past due date) will reduce CIBIL score by 35 points!</span>
            ) : (
              <span className="text-success">✨ Repaying now (on time) will boost CIBIL score by 15 points!</span>
            )}
          </div>

          <div className="modal-actions-wrap">
            <Button type="button" variant="secondary" onClick={() => setShowRepayModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={actionLoading} disabled={!repayAmount || parseFloat(repayAmount) <= 0}>
              Complete Payment
            </Button>
          </div>
        </form>
      </Modal>

      {/* Account Aggregator Consent Modal */}
      <Modal
        isOpen={showConsentModal}
        onClose={() => setShowConsentModal(false)}
        title="RBI Account Aggregator Consent Request"
      >
        <div style={{ padding: '4px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.15)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', color: 'var(--color-accent)' }}>Data Access Consent Request</h4>
            <p style={{ margin: 0, fontSize: '13.5px', lineHeight: '1.5', color: 'var(--color-text-primary)' }}>
              <strong>VaultBank Credit Team</strong> is requesting access to your financial metrics for credit limit underwriting:
            </p>
            <ul style={{ margin: '10px 0 0 0', paddingLeft: '20px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <li>6-Month Account Transaction History (`transactions_6m`)</li>
              <li>Comprehensive Account Summary & Balance details (`account_summary`)</li>
            </ul>
          </div>
          
          <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div><strong>Purpose:</strong> credit_assessment (Credit Card Limit Upgrade)</div>
            <div><strong>Duration:</strong> 30 Days (Revocable at any time from your Profile Security tab)</div>
            <div><strong>Framework:</strong> Consent-based secure sandbox (RBI Dec 2021 framework specs)</div>
          </div>

          <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
            By clicking "Approve & Grant", your transaction history is digitally retrieved via secure API to calculate card limit upgrades. Denying will reject the limit increase.
          </p>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
            <Button 
              variant="danger" 
              onClick={() => handleConsentResponse('deny')}
              isLoading={actionLoading}
            >
              Deny Sharing
            </Button>
            <Button 
              variant="primary" 
              onClick={() => handleConsentResponse('grant')}
              isLoading={actionLoading}
            >
              Approve & Grant
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
