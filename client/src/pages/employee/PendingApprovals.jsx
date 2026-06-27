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
