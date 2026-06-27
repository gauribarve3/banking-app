import { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { formatDateTime, formatCurrency } from '../../utils/format';
import './PendingCards.css';

export default function PendingCards() {
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'overview'
  const [pendingCustomers, setPendingCustomers] = useState([]);
  const [overviewCustomers, setOverviewCustomers] = useState([]);
  const [loadingPending, setLoadingPending] = useState(true);
  const [loadingOverview, setLoadingOverview] = useState(false);
  
  const [actionLoading, setActionLoading] = useState('');
  const [confirmModal, setConfirmModal] = useState(null); // { customer, action }
  const [suggestModal, setSuggestModal] = useState(null); // customer
  const [suggestMessage, setSuggestMessage] = useState('');
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchPending = async () => {
    try {
      setLoadingPending(true);
      const res = await apiClient.get('/employee/credit-cards/pending');
      setPendingCustomers(res.data.customers || []);
    } catch (err) {
      console.error('Fetch pending cards error:', err);
      setError('Failed to load pending credit card applications.');
    } finally {
      setLoadingPending(false);
    }
  };

  const fetchOverview = async () => {
    try {
      setLoadingOverview(true);
      const res = await apiClient.get('/employee/credit-cards/overview');
      setOverviewCustomers(res.data.overview || []);
    } catch (err) {
      console.error('Fetch card overview error:', err);
      setError('Failed to load customers credit card overview.');
    } finally {
      setLoadingOverview(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setError('');
    if (tab === 'pending') {
      fetchPending();
    } else {
      fetchOverview();
    }
  };

  const handleAction = async () => {
    if (!confirmModal) return;
    const { customer, action } = confirmModal;

    setActionLoading(customer._id);
    try {
      await apiClient.patch(`/employee/credit-cards/${customer._id}/resolve`, { action });
      setConfirmModal(null);
      await fetchPending(); // Refresh list
    } catch (err) {
      console.error('Resolve card error:', err);
      alert(err.response?.data?.message || 'Action failed.');
    } finally {
      setActionLoading('');
    }
  };

  const handleOpenSuggest = (customer) => {
    setSuggestModal(customer);
    setSuggestMessage(
      `Hi ${customer.firstName}, we noticed you do not have an active credit card with us. Having a credit card helps build your CIBIL score. If you maintain a total balance above ₹50,000 across your accounts, you'll become instantly eligible to apply for our Premium Credit Card. Let us know if you need help setting it up!`
    );
  };

  const handleSendSuggestion = async (e) => {
    e.preventDefault();
    if (!suggestModal || !suggestMessage.trim()) return;

    setSuggestLoading(true);
    try {
      await apiClient.post('/employee/messages/send', {
        customerId: suggestModal._id,
        messageText: suggestMessage
      });
      alert('Credit card recommendation message sent successfully.');
      setSuggestModal(null);
      setSuggestMessage('');
    } catch (err) {
      console.error('Send suggestion error:', err);
      alert('Failed to send card suggestion.');
    } finally {
      setSuggestLoading(false);
    }
  };

  const getCibilRating = (score) => {
    if (score >= 800) return { label: 'Excellent (Low Risk)', variant: 'success' };
    if (score >= 700) return { label: 'Good (Eligible)', variant: 'info' };
    if (score >= 600) return { label: 'Fair (Review Required)', variant: 'warning' };
    return { label: 'Poor (High Risk)', variant: 'danger' };
  };

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'applied': return 'warning';
      case 'eligible': return 'info';
      case 'frozen': return 'danger';
      case 'rejected': return 'danger';
      default: return 'secondary';
    }
  };

  return (
    <div className="pending-cards-page">
      <div className="page-header">
        <h1 className="page-title">Credit Card Review Centre</h1>
        <p className="page-subtitle">Review credit worthiness, manage customer applications, and analyze card usage</p>
      </div>

      {/* Tabs Layout */}
      <div className="cards-tabs">
        <button 
          className={`tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => handleTabChange('pending')}
        >
          Pending Applications ({pendingCustomers.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => handleTabChange('overview')}
        >
          Customer Cards Overview
        </button>
      </div>

      {error && <div className="cards-error">{error}</div>}

      {activeTab === 'pending' ? (
        <div className="cards-container">
          {loadingPending ? (
            <div className="tab-loading">Loading pending applications...</div>
          ) : pendingCustomers.length === 0 ? (
            <Card>
              <div className="cards-empty">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                  <rect x="2" y="6" width="44" height="36" rx="4" stroke="var(--color-accent)" strokeWidth="2"/>
                  <path d="M2 16h44M6 26h6" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <h3>No Pending Applications</h3>
                <p>All credit card requests have been successfully processed.</p>
              </div>
            </Card>
          ) : (
            <div className="cards-list">
              {pendingCustomers.map((cust) => (
                <Card key={cust._id} className="card-application-item">
                  <div className="card-app__profile">
                    <div className="card-app__avatar">
                      {cust.firstName[0]}{cust.lastName[0]}
                    </div>
                    <div className="card-app__info">
                      <h3>{cust.firstName} {cust.lastName}</h3>
                      <span className="card-app__email">📧 {cust.email}</span>
                      <span className="card-app__date">
                        Applied: {cust.creditCard?.applicationDate ? formatDateTime(cust.creditCard.applicationDate) : 'Recently'}
                      </span>
                    </div>
                  </div>

                  <div className="card-app__metrics">
                    <div className="metric-box">
                      <span className="metric-label">Credit Bureau Score</span>
                      <strong className="metric-value">{cust.creditCard?.cibilScore || 750}</strong>
                      <Badge variant={getCibilRating(cust.creditCard?.cibilScore || 750).variant}>
                        {getCibilRating(cust.creditCard?.cibilScore || 750).label}
                      </Badge>
                    </div>
                    <div className="metric-box">
                      <span className="metric-label">Assigned Limit</span>
                      <strong className="metric-value">₹10,000</strong>
                      <span className="metric-sub">Billed: Interest-free 45d</span>
                    </div>
                  </div>

                  <div className="card-app__actions">
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => setConfirmModal({ customer: cust, action: 'reject' })}
                    >
                      Decline Card
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setConfirmModal({ customer: cust, action: 'approve' })}
                    >
                      Issue Card
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Overview Tab */
        <div className="overview-container">
          {loadingOverview ? (
            <div className="tab-loading">Loading customer card statuses...</div>
          ) : overviewCustomers.length === 0 ? (
            <Card>
              <div className="cards-empty">
                <h3>No Customer Overview Available</h3>
                <p>No customers are currently assigned to you.</p>
              </div>
            </Card>
          ) : (
            <div className="overview-grid">
              {overviewCustomers.map((cust) => {
                const cc = cust.creditCard || { status: 'none' };
                const hasCard = cc.status === 'active' || cc.status === 'frozen';
                const utilisationPercent = hasCard && cc.cardLimit > 0 
                  ? Math.min(100, Math.round((cc.outstandingAmount / cc.cardLimit) * 100))
                  : 0;

                return (
                  <Card key={cust._id} className={`overview-item-card ${cc.status}`}>
                    <div className="overview-item__top">
                      <div className="overview-item__user">
                        <h4>{cust.firstName} {cust.lastName}</h4>
                        <span className="overview-item__subtext">{cust.email}</span>
                      </div>
                      <Badge variant={getStatusBadgeVariant(cc.status)}>
                        {cc.status.toUpperCase()}
                      </Badge>
                    </div>

                    <div className="overview-item__body">
                      {hasCard ? (
                        <div className="overview-item__cc-stats">
                          <div className="overview-stat-row">
                            <span>Card Limit:</span>
                            <strong>{formatCurrency(cc.cardLimit)}</strong>
                          </div>
                          <div className="overview-stat-row">
                            <span>Outstanding Dues:</span>
                            <strong className={cc.outstandingAmount > 0 ? "dues-alert" : ""}>
                              {formatCurrency(cc.outstandingAmount)}
                            </strong>
                          </div>
                          <div className="overview-stat-row">
                            <span>CIBIL Score:</span>
                            <span className="cibil-display">🛡️ {cc.cibilScore}</span>
                          </div>
                          
                          {/* Utilization Bar */}
                          <div className="utilisation-container">
                            <div className="utilisation-label-row">
                              <span>Limit Utilization</span>
                              <span>{utilisationPercent}%</span>
                            </div>
                            <div className="utilisation-track">
                              <div 
                                className="utilisation-fill" 
                                style={{ 
                                  width: `${utilisationPercent}%`,
                                  background: utilisationPercent > 80 ? '#ef4444' : utilisationPercent > 50 ? '#f59e0b' : '#10b981'
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="overview-item__no-card">
                          <p>Customer does not have an active credit card.</p>
                          <div className="overview-stat-row">
                            <span>Total Balance:</span>
                            <strong>{formatCurrency(cust.totalBalance || 0)}</strong>
                          </div>
                          <div className="overview-stat-row">
                            <span>Est. CIBIL:</span>
                            <span>{cc.cibilScore || 750}</span>
                          </div>
                          
                          {/* Suggest Card Action */}
                          {(cc.status === 'none' || cc.status === 'rejected') && (
                            <Button 
                              variant="secondary" 
                              size="sm" 
                              className="suggest-card-btn"
                              onClick={() => handleOpenSuggest(cust)}
                            >
                              💬 Suggest Credit Card
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Confirmation Issue Modal */}
      <Modal
        isOpen={!!confirmModal}
        onClose={() => setConfirmModal(null)}
        title={`Confirm Card ${confirmModal?.action === 'approve' ? 'Approval' : 'Rejection'}`}
      >
        {confirmModal && (
          <div className="confirm-card-content">
            <p>
              Are you sure you want to <strong>{confirmModal.action}</strong> the premium credit card application for{' '}
              <strong>{confirmModal.customer.firstName} {confirmModal.customer.lastName}</strong>?
            </p>
            {confirmModal.action === 'approve' ? (
              <div className="card-approve-notice">
                ℹ️ Approving will generate a 16-digit card number and set an available limit of ₹10,000 with a 45-day grace period.
              </div>
            ) : (
              <div className="card-reject-notice">
                ⚠️ Rejecting will mark this application as declined. The customer will need to maintain a positive account status to re-apply.
              </div>
            )}
            <div className="confirm-actions">
              <Button variant="secondary" onClick={() => setConfirmModal(null)}>Cancel</Button>
              <Button
                variant={confirmModal.action === 'approve' ? 'primary' : 'danger'}
                isLoading={actionLoading === confirmModal.customer._id}
                onClick={handleAction}
              >
                {confirmModal.action === 'approve' ? 'Approve & Issue' : 'Decline'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Suggest Credit Card Action Modal */}
      <Modal
        isOpen={!!suggestModal}
        onClose={() => setSuggestModal(null)}
        title="Suggest Credit Card Eligibility"
      >
        {suggestModal && (
          <form onSubmit={handleSendSuggestion} className="suggest-card-form">
            <p>Send an educational/promotional message to <strong>{suggestModal.firstName} {suggestModal.lastName}</strong> regarding credit cards.</p>
            
            <div className="input-group">
              <label className="input-group__label">Message Draft</label>
              <textarea
                className="suggest-textarea"
                rows={5}
                value={suggestMessage}
                onChange={(e) => setSuggestMessage(e.target.value)}
                required
              />
            </div>

            <div className="confirm-actions">
              <Button type="button" variant="secondary" onClick={() => setSuggestModal(null)}>Cancel</Button>
              <Button type="submit" variant="primary" isLoading={suggestLoading}>
                Send Message
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
