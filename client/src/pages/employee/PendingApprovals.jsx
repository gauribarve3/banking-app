import { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { formatCurrency, formatDateTime } from '../../utils/format';
import './PendingApprovals.css';

export default function PendingApprovals() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [confirmModal, setConfirmModal] = useState(null); // { tx, action }
  const [rejectionReasonText, setRejectionReasonText] = useState('');

  // Behavioral Risk States
  const [expandedRiskId, setExpandedRiskId] = useState('');
  const [riskContexts, setRiskContexts] = useState({});

  const toggleRiskContext = async (txId) => {
    if (expandedRiskId === txId) {
      setExpandedRiskId('');
      return;
    }
    setExpandedRiskId(txId);
    if (!riskContexts[txId]) {
      try {
        const res = await apiClient.get(`/employee/transactions/${txId}/risk-context`);
        setRiskContexts(prev => ({ ...prev, [txId]: res.data.riskMetrics }));
      } catch (err) {
        console.error('Error fetching risk context:', err);
      }
    }
  };

  const fetchPending = async () => {
    try {
      const res = await apiClient.get('/employee/pending');
      setTransactions(res.data.transactions);
    } catch (err) {
      console.error('Fetch pending error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleAction = async () => {
    if (!confirmModal) return;
    const { tx, action } = confirmModal;

    if (action === 'reject' && !rejectionReasonText.trim()) {
      alert('Please provide a reason for rejecting the transfer.');
      return;
    }

    setActionLoading(tx._id);

    try {
      await apiClient.patch(`/employee/transactions/${tx._id}`, {
        action,
        rejectionReason: action === 'reject' ? rejectionReasonText : undefined
      });
      setConfirmModal(null);
      setRejectionReasonText('');
      await fetchPending();
    } catch (err) {
      console.error('Action error:', err);
      alert(err.response?.data?.message || 'Action failed.');
    } finally {
      setActionLoading('');
    }
  };

  if (loading) {
    return <div className="page-loading"><div className="loading-screen__spinner" /></div>;
  }

  return (
    <div className="pending-approvals">
      <div className="page-header">
        <h1 className="page-title">Pending Approvals</h1>
        <p className="page-subtitle">Review and resolve transaction requests awaiting approval</p>
      </div>

      {transactions.length === 0 ? (
        <Card>
          <div className="approvals-empty">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="22" stroke="var(--color-accent)" strokeWidth="2"/>
              <path d="M15 24l6 6 12-12" stroke="var(--color-accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h3>All clear!</h3>
            <p>No pending transactions require your attention.</p>
          </div>
        </Card>
      ) : (
        <div className="approvals-list">
          {transactions.map((tx) => {
            const isDeposit = tx.type === 'deposit';
            return (
              <Card key={tx._id} className="approval-card">
                <div className="approval-card__header">
                  <div className="approval-card__parties">
                    {isDeposit ? (
                      <div className="approval-card__party">
                        <span className="approval-card__party-label">Cash Deposit Request</span>
                        <span className="approval-card__party-name">
                          {tx.receiverUserId?.firstName} {tx.receiverUserId?.lastName}
                        </span>
                        <span className="approval-card__party-acc">Target Account: {tx.receiverAccountNum}</span>
                      </div>
                    ) : (
                      <>
                        <div className="approval-card__party">
                          <span className="approval-card__party-label">From</span>
                          <span className="approval-card__party-name">
                            {tx.senderUserId?.firstName} {tx.senderUserId?.lastName}
                          </span>
                          <span className="approval-card__party-acc">{tx.senderAccountNum}</span>
                        </div>
                        <div className="approval-card__arrow">
                          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <path d="M4 10h12m0 0l-4-4m4 4l-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        <div className="approval-card__party">
                          <span className="approval-card__party-label">To</span>
                          <span className="approval-card__party-name">
                            {tx.receiverUserId?.firstName} {tx.receiverUserId?.lastName}
                          </span>
                          <span className="approval-card__party-acc">{tx.receiverAccountNum}</span>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="approval-card__amount-wrap">
                    <span className="approval-card__amount">{formatCurrency(tx.amount)}</span>
                    <Badge variant="warning" size="md">Pending {isDeposit ? 'Deposit' : 'Transfer'}</Badge>
                  </div>
                </div>

                <div className="approval-card__footer">
                  <div className="approval-card__meta">
                    <span>{tx.description || 'No description'}</span>
                    <span>·</span>
                    <span>{formatDateTime(tx.createdAt)}</span>
                  </div>
                  <div className="approval-card__actions">
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => setConfirmModal({ tx, action: 'reject' })}
                    >
                      Reject
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setConfirmModal({ tx, action: 'approve' })}
                    >
                      Approve
                    </Button>
                  </div>
                </div>

                {/* Behavioral Risk Analysis Toggle */}
                {!isDeposit && (
                  <div className="risk-analysis-toggle" style={{ borderTop: '1px dashed var(--color-border)', paddingTop: '12px', marginTop: '12px' }}>
                    <button
                      type="button"
                      className="risk-toggle-btn"
                      onClick={() => toggleRiskContext(tx._id)}
                      style={{ background: 'none', border: 'none', color: 'var(--color-accent)', fontWeight: '600', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', padding: 0 }}
                    >
                      {expandedRiskId === tx._id ? 'Hide Behavioral Risk Context ↑' : 'Show Behavioral Risk Context ↓'}
                    </button>
                  </div>
                )}

                {/* Collapsible Risk Panel */}
                {expandedRiskId === tx._id && !isDeposit && (
                  <div className="risk-panel" style={{ marginTop: '12px', padding: '14px', borderRadius: 'var(--radius-md)', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {!riskContexts[tx._id] ? (
                      <div className="risk-panel__loading" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-secondary)', fontSize: '13px' }}>
                        <div className="loading-screen__spinner small" style={{ width: '16px', height: '16px', border: '2px solid rgba(0,0,0,0.1)', borderTopColor: 'var(--color-accent)', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                        <span>Aggregating ledger behavior...</span>
                      </div>
                    ) : (
                      <div className="risk-panel__content" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {/* High-Risk Pattern Alerts */}
                        {riskContexts[tx._id].avgAmount30Days > 0 && tx.amount > (riskContexts[tx._id].avgAmount30Days * 5) && (
                          <div className="risk-alert danger" style={{ padding: '8px 12px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)', color: '#EF4444', fontSize: '12.5px' }}>
                            ⚠️ <strong>Out-of-Pattern Amount:</strong> This transfer is {Math.round(tx.amount / riskContexts[tx._id].avgAmount30Days)}x the customer's 30-day average!
                          </div>
                        )}
                        {riskContexts[tx._id].isNewRecipient && (
                          <div className="risk-alert warning" style={{ padding: '8px 12px', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.15)', color: '#D97706', fontSize: '12.5px' }}>
                            ℹ️ <strong>First-Time Payee:</strong> No historical completed transfers found from this sender to recipient account {tx.receiverAccountNum}.
                          </div>
                        )}

                        {/* Grid Metrics */}
                        <div className="risk-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
                          <div className="risk-metric" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span className="risk-metric__label" style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>30d Average Transferred</span>
                            <strong className="risk-metric__value font-mono-data" style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>{formatCurrency(riskContexts[tx._id].avgAmount30Days)}</strong>
                          </div>
                          <div className="risk-metric" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span className="risk-metric__label" style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>30d Maximum Transferred</span>
                            <strong className="risk-metric__value font-mono-data" style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>{formatCurrency(riskContexts[tx._id].maxAmount30Days)}</strong>
                          </div>
                          <div className="risk-metric" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span className="risk-metric__label" style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>30d Transfer Frequency</span>
                            <strong className="risk-metric__value font-mono-data" style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>{riskContexts[tx._id].txCount30Days} txs ({riskContexts[tx._id].weeklyFrequency}/wk)</strong>
                          </div>
                          <div className="risk-metric" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span className="risk-metric__label" style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Payee History</span>
                            <strong className="risk-metric__value" style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>
                              {riskContexts[tx._id].isNewRecipient ? 'New Payee' : `${riskContexts[tx._id].previousTransfersToRecipient} transfers completed`}
                            </strong>
                          </div>
                        </div>

                        {/* Transaction Time Distribution */}
                        <div className="risk-time-dist" style={{ borderTop: '1px solid var(--color-border)', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <span className="risk-time-dist__title" style={{ fontSize: '12px', fontWeight: '700', color: 'var(--color-text-secondary)' }}>30-Day Time Distribution</span>
                          <div className="time-dist-bars" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {Object.entries(riskContexts[tx._id].timeDistribution).map(([timeLabel, count]) => (
                              <div key={timeLabel} className="time-dist-bar-item" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                                <span className="time-lbl" style={{ width: '130px', color: 'var(--color-text-secondary)' }}>{timeLabel}</span>
                                <div className="time-bar-track" style={{ flex: 1, height: '6px', background: 'rgba(0,0,0,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                                  <div 
                                    className="time-bar-fill" 
                                    style={{ height: '100%', background: 'var(--color-accent)', width: `${riskContexts[tx._id].txCount30Days > 0 ? (count / riskContexts[tx._id].txCount30Days) * 100 : 0}%` }}
                                  />
                                </div>
                                <span className="time-count font-mono-data" style={{ width: '20px', textAlign: 'right', fontWeight: '600' }}>{count}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal */}
      <Modal
        isOpen={!!confirmModal}
        onClose={() => setConfirmModal(null)}
        title={`Confirm ${confirmModal?.action === 'approve' ? 'Approval' : 'Rejection'}`}
      >
        {confirmModal && (
          <div className="confirm-content">
            <p>
              Are you sure you want to <strong>{confirmModal.action}</strong> the {confirmModal.tx.type === 'deposit' ? 'deposit' : 'transfer'} of{' '}
              <strong>{formatCurrency(confirmModal.tx.amount)}</strong>{' '}
              {confirmModal.tx.type === 'deposit' ? 'to ' : 'from '}
              <strong>
                {confirmModal.tx.type === 'deposit'
                  ? `${confirmModal.tx.receiverUserId?.firstName} ${confirmModal.tx.receiverUserId?.lastName}`
                  : `${confirmModal.tx.senderUserId?.firstName} ${confirmModal.tx.senderUserId?.lastName}`
                }
              </strong>
              {confirmModal.tx.type === 'deposit' ? '' : ' to '}
              <strong>
                {confirmModal.tx.type === 'deposit'
                  ? ''
                  : `${confirmModal.tx.receiverUserId?.firstName} ${confirmModal.tx.receiverUserId?.lastName}`
                }
              </strong>?
            </p>
            {confirmModal.action === 'reject' && (
              <div className="form-group" style={{ margin: '16px 0' }}>
                <label htmlFor="rejection-reason" style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                  Rejection Reason
                </label>
                <textarea
                  id="rejection-reason"
                  style={{ width: '100%', padding: '10px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
                  rows={3}
                  value={rejectionReasonText}
                  onChange={(e) => setRejectionReasonText(e.target.value)}
                  placeholder="Explain why this request is being rejected..."
                  required
                />
              </div>
            )}
            <div className="confirm-actions">
              <Button variant="secondary" onClick={() => setConfirmModal(null)}>Cancel</Button>
              <Button
                variant={confirmModal.action === 'approve' ? 'primary' : 'danger'}
                isLoading={!!actionLoading}
                onClick={handleAction}
              >
                {confirmModal.action === 'approve' ? 'Approve' : 'Reject'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
