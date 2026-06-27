import { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { formatCurrency, formatDate } from '../../utils/format';
import './MandatesPage.css';

const categoryIcons = {
  SIP: '📈', subscription: '🎬', EMI: '🏠', insurance: '🛡️', utility: '💡', other: '📋',
};

const categoryLabels = {
  SIP: 'SIP / Mutual Fund', subscription: 'Subscription', EMI: 'EMI / Loan',
  insurance: 'Insurance', utility: 'Utility Bill', other: 'Other',
};

export default function MandatesPage() {
  const [mandates, setMandates] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [newMandate, setNewMandate] = useState({
    customerAccountNum: '',
    merchantName: '',
    amount: '',
    frequency: 'monthly',
    category: 'other',
    nextDeductionDate: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [mandateRes, accRes] = await Promise.all([
        apiClient.get('/customer/mandates'),
        apiClient.get('/customer/accounts'),
      ]);
      setMandates(mandateRes.data.mandates || []);
      const nonFDAccounts = (accRes.data.accounts || []).filter(a => a.accountType !== 'FD');
      setAccounts(nonFDAccounts);
      if (nonFDAccounts.length > 0 && !newMandate.customerAccountNum) {
        setNewMandate(p => ({ ...p, customerAccountNum: nonFDAccounts[0].accountNumber }));
      }
    } catch (err) {
      console.error('Fetch mandates error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setActionLoading('create');
    try {
      const res = await apiClient.post('/customer/mandates', newMandate);
      setMessage({ type: 'success', text: res.data.message });
      setShowAddModal(false);
      setNewMandate(p => ({ ...p, merchantName: '', amount: '', nextDeductionDate: '' }));
      fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to create mandate.' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleAction = async (id, action) => {
    setActionLoading(id);
    try {
      const res = await apiClient.patch(`/customer/mandates/${id}/${action}`);
      setMessage({ type: 'success', text: res.data.message });
      fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || `Failed to ${action} mandate.` });
    } finally {
      setActionLoading(null);
    }
  };

  const activeMandates = mandates.filter(m => m.status === 'active');
  const pausedMandates = mandates.filter(m => m.status === 'paused');
  const cancelledMandates = mandates.filter(m => m.status === 'cancelled');
  const totalMonthly = activeMandates.reduce((sum, m) => sum + m.amount, 0);

  if (loading) {
    return <div className="page-loading"><div className="loading-screen__spinner" /></div>;
  }

  return (
    <div className="mandates-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Subscriptions & Mandates</h1>
          <p className="page-subtitle">Manage your recurring payments, SIPs, and auto-debits</p>
        </div>
        <Button variant="primary" onClick={() => setShowAddModal(true)}>
          + Add New Mandate
        </Button>
      </div>

      {message.text && (
        <div className={`mandate-alert mandate-alert--${message.type}`}>
          {message.text}
          <button onClick={() => setMessage({ type: '', text: '' })} className="mandate-alert__close">×</button>
        </div>
      )}

      {/* Summary Stats */}
      <div className="mandate-stats">
        <Card className="mandate-stat-card">
          <div className="mandate-stat__icon">📋</div>
          <div className="mandate-stat__info">
            <span className="mandate-stat__value">{activeMandates.length}</span>
            <span className="mandate-stat__label">Active Mandates</span>
          </div>
        </Card>
        <Card className="mandate-stat-card">
          <div className="mandate-stat__icon">⏸️</div>
          <div className="mandate-stat__info">
            <span className="mandate-stat__value">{pausedMandates.length}</span>
            <span className="mandate-stat__label">Paused</span>
          </div>
        </Card>
        <Card className="mandate-stat-card">
          <div className="mandate-stat__icon">💰</div>
          <div className="mandate-stat__info">
            <span className="mandate-stat__value">{formatCurrency(totalMonthly)}</span>
            <span className="mandate-stat__label">Active Commitments</span>
          </div>
        </Card>
      </div>

      {/* Mandates list */}
      {mandates.length === 0 ? (
        <Card className="mandate-empty">
          <div className="mandate-empty__icon">📋</div>
          <h3>No Mandates Yet</h3>
          <p>Set up recurring payments for SIPs, subscriptions, EMIs, and more.</p>
          <Button variant="primary" onClick={() => setShowAddModal(true)}>Create Your First Mandate</Button>
        </Card>
      ) : (
        <div className="mandate-list">
          {mandates.map(m => (
            <Card key={m._id} className={`mandate-card mandate-card--${m.status}`}>
              <div className="mandate-card__main">
                <div className="mandate-card__icon">
                  {categoryIcons[m.category] || '📋'}
                </div>
                <div className="mandate-card__info">
                  <div className="mandate-card__header">
                    <h3>{m.merchantName}</h3>
                    <Badge
                      variant={m.status === 'active' ? 'success' : m.status === 'paused' ? 'warning' : 'danger'}
                      size="sm"
                    >
                      {m.status}
                    </Badge>
                  </div>
                  <div className="mandate-card__meta">
                    <span>{categoryLabels[m.category] || 'Other'}</span>
                    <span>•</span>
                    <span className="mandate-card__freq">{m.frequency}</span>
                    <span>•</span>
                    <span>A/C ••{m.customerAccountNum?.slice(-4)}</span>
                  </div>
                </div>
                <div className="mandate-card__amount">
                  <span className="mandate-card__amount-value">{formatCurrency(m.amount)}</span>
                  <span className="mandate-card__amount-freq">/{m.frequency === 'monthly' ? 'mo' : m.frequency === 'quarterly' ? 'qtr' : 'yr'}</span>
                </div>
              </div>

              <div className="mandate-card__footer">
                <div className="mandate-card__dates">
                  {m.status !== 'cancelled' && (
                    <span className="mandate-card__next">
                      Next: <strong>{formatDate(m.nextDeductionDate)}</strong>
                    </span>
                  )}
                  {m.totalDeducted > 0 && (
                    <span className="mandate-card__total">
                      Total deducted: {formatCurrency(m.totalDeducted)}
                    </span>
                  )}
                </div>
                <div className="mandate-card__actions">
                  {m.status === 'active' && (
                    <>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleAction(m._id, 'pause')}
                        isLoading={actionLoading === m._id}
                      >
                        Pause
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleAction(m._id, 'revoke')}
                        isLoading={actionLoading === m._id}
                      >
                        Revoke
                      </Button>
                    </>
                  )}
                  {m.status === 'paused' && (
                    <>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleAction(m._id, 'resume')}
                        isLoading={actionLoading === m._id}
                      >
                        Resume
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleAction(m._id, 'revoke')}
                        isLoading={actionLoading === m._id}
                      >
                        Revoke
                      </Button>
                    </>
                  )}
                  {m.status === 'cancelled' && (
                    <span className="mandate-card__cancelled-text">Cancelled</span>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Mandate Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Set Up New Mandate"
      >
        <form onSubmit={handleCreate} className="mandate-form">
          <div className="mandate-form__field">
            <label>Debit Account</label>
            <select
              value={newMandate.customerAccountNum}
              onChange={(e) => setNewMandate(p => ({ ...p, customerAccountNum: e.target.value }))}
              required
            >
              {accounts.map(acc => (
                <option key={acc._id} value={acc.accountNumber}>
                  {acc.accountType} — {acc.accountNumber} ({formatCurrency(acc.balance)})
                </option>
              ))}
            </select>
          </div>

          <div className="mandate-form__field">
            <label>Merchant / Service Name</label>
            <input
              type="text"
              value={newMandate.merchantName}
              onChange={(e) => setNewMandate(p => ({ ...p, merchantName: e.target.value }))}
              placeholder="e.g. Netflix, Zerodha SIP, HDFC EMI"
              required
            />
          </div>

          <div className="mandate-form__row">
            <div className="mandate-form__field">
              <label>Amount (₹)</label>
              <input
                type="number"
                value={newMandate.amount}
                onChange={(e) => setNewMandate(p => ({ ...p, amount: e.target.value }))}
                placeholder="500"
                min="1"
                required
              />
            </div>
            <div className="mandate-form__field">
              <label>Frequency</label>
              <select
                value={newMandate.frequency}
                onChange={(e) => setNewMandate(p => ({ ...p, frequency: e.target.value }))}
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>

          <div className="mandate-form__row">
            <div className="mandate-form__field">
              <label>Category</label>
              <select
                value={newMandate.category}
                onChange={(e) => setNewMandate(p => ({ ...p, category: e.target.value }))}
              >
                <option value="SIP">SIP / Mutual Fund</option>
                <option value="subscription">Subscription</option>
                <option value="EMI">EMI / Loan</option>
                <option value="insurance">Insurance</option>
                <option value="utility">Utility Bill</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="mandate-form__field">
              <label>First Deduction Date</label>
              <input
                type="date"
                value={newMandate.nextDeductionDate}
                onChange={(e) => setNewMandate(p => ({ ...p, nextDeductionDate: e.target.value }))}
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
            <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary" isLoading={actionLoading === 'create'}>Create Mandate</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
