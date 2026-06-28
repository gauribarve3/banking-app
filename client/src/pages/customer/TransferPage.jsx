import { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import FraudWarningModal from '../../components/FraudWarningModal';
import { formatCurrency } from '../../utils/format';
import './TransferPage.css';

export default function TransferPage() {
  const [accounts, setAccounts] = useState([]);
  const [fromAccount, setFromAccount] = useState('');
  const [toAccount, setToAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [fraudWarnings, setFraudWarnings] = useState(null);
  const [pendingTransferData, setPendingTransferData] = useState(null);

  // VPA UPI States
  const [transferType, setTransferType] = useState('vpa'); // 'vpa' or 'account'
  const [toVpa, setToVpa] = useState('');
  const [resolvedName, setResolvedName] = useState('');
  const [vpaError, setVpaError] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  const handleVpaResolve = async () => {
    if (!toVpa.trim()) return;
    setIsResolving(true);
    setVpaError('');
    setResolvedName('');
    try {
      const res = await apiClient.get(`/users/resolve?vpa=${toVpa.trim().toLowerCase()}`);
      if (res.data.success) {
        setResolvedName(res.data.name);
        setToAccount(res.data.accountNumber);
      }
    } catch (err) {
      setVpaError(err.response?.data?.message || 'Failed to resolve VPA.');
      setToAccount('');
    } finally {
      setIsResolving(false);
    }
  };

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const res = await apiClient.get('/customer/accounts');
        setAccounts(res.data.accounts);
        if (res.data.accounts.length > 0) {
          setFromAccount(res.data.accounts[0].accountNumber);
        }
      } catch (err) {
        console.error('Fetch accounts error:', err);
      }
    };
    fetchAccounts();
  }, []);

  const validate = () => {
    const errs = {};
    if (!fromAccount) errs.from = 'Select a source account.';
    
    if (transferType === 'vpa') {
      if (!toVpa.trim()) {
        errs.to = 'VPA is required.';
      } else if (!resolvedName) {
        errs.to = 'Please verify the recipient VPA first.';
      }
    } else {
      if (!toAccount.trim()) errs.to = 'Enter recipient account number.';
    }

    if (!amount || parseFloat(amount) <= 0) errs.amount = 'Enter a valid amount.';

    const selectedAcc = accounts.find((a) => a.accountNumber === fromAccount);
    if (selectedAcc) {
      if (selectedAcc.isFrozen) errs.from = 'This account is frozen.';
      if (parseFloat(amount) > selectedAcc.balance) errs.amount = 'Insufficient funds.';
    }

    if (toAccount && fromAccount === toAccount.trim()) {
      errs.to = 'Cannot transfer to the same account.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    const transferData = {
      fromAccountNum: fromAccount,
      toAccountNum: toAccount.trim(),
      amount: parseFloat(amount),
      description,
    };

    try {
      const res = await apiClient.post('/customer/transfer', transferData);
      if (res.data.fraudWarning) {
        // Show fraud warning modal
        setFraudWarnings(res.data.warnings);
        setPendingTransferData(transferData);
      } else {
        setResult(res.data);
        setToAccount('');
        setToVpa('');
        setResolvedName('');
        setAmount('');
        setDescription('');
      }
    } catch (err) {
      setErrors({ server: err.response?.data?.message || 'Transfer failed.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFraudProceed = async () => {
    if (!pendingTransferData) return;
    setIsLoading(true);
    try {
      const res = await apiClient.post('/customer/transfer', {
        ...pendingTransferData,
        fraudAcknowledged: true,
        acknowledgementText: 'I UNDERSTAND',
      });
      setResult(res.data);
      setToAccount('');
      setToVpa('');
      setResolvedName('');
      setAmount('');
      setDescription('');
    } catch (err) {
      setErrors({ server: err.response?.data?.message || 'Transfer failed.' });
    } finally {
      setIsLoading(false);
      setFraudWarnings(null);
      setPendingTransferData(null);
    }
  };

  const selectedAcc = accounts.find((a) => a.accountNumber === fromAccount);

  return (
    <div className="transfer-page">
      <div className="page-header">
        <h1 className="page-title">Send Money</h1>
        <p className="page-subtitle">Transfer funds to another VaultBank customer</p>
      </div>

      <div className="transfer-layout">
        <Card className="transfer-form-card">
          <form onSubmit={handleSubmit} className="transfer-form">
            {errors.server && (
              <div className="transfer-error">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M8 5v3M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                {errors.server}
              </div>
            )}

            {/* From Account */}
            <div className="input-group">
              <label className="input-group__label" htmlFor="from-account">From Account</label>
              <select
                id="from-account"
                className="transfer-select"
                value={fromAccount}
                onChange={(e) => setFromAccount(e.target.value)}
              >
                {accounts.map((acc) => (
                  <option key={acc._id} value={acc.accountNumber} disabled={acc.isFrozen}>
                    {acc.accountType.charAt(0).toUpperCase() + acc.accountType.slice(1)} — {acc.accountNumber} ({formatCurrency(acc.balance)})
                    {acc.isFrozen ? ' [FROZEN]' : ''}
                  </option>
                ))}
              </select>
              {errors.from && <span className="input-group__error">{errors.from}</span>}
            </div>

            {/* Transfer Type Tabs */}
            <div className="login-tabs" style={{ marginBottom: '20px' }}>
              <button
                type="button"
                className={`login-tab ${transferType === 'vpa' ? 'login-tab--active' : ''}`}
                onClick={() => {
                  setTransferType('vpa');
                  setToAccount('');
                  setErrors({});
                }}
              >
                UPI VPA Transfer
              </button>
              <button
                type="button"
                className={`login-tab ${transferType === 'account' ? 'login-tab--active' : ''}`}
                onClick={() => {
                  setTransferType('account');
                  setToAccount('');
                  setErrors({});
                }}
              >
                Bank Account Number
              </button>
              <div
                className="login-tab__indicator"
                style={{ transform: `translateX(${transferType === 'account' ? '100%' : '0'})` }}
              />
            </div>

            {/* Recipient Input details */}
            {transferType === 'vpa' ? (
              <div className="input-group" style={{ marginBottom: '20px' }}>
                <label className="input-group__label" htmlFor="to-vpa">Recipient VPA (UPI Handle)</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    id="to-vpa"
                    type="text"
                    className="transfer-select"
                    placeholder="e.g. bob.williams@vaultbank"
                    value={toVpa}
                    onChange={(e) => {
                      setToVpa(e.target.value);
                      setResolvedName('');
                      setToAccount('');
                      setVpaError('');
                    }}
                    style={{ flex: 1, padding: '10px 14px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)' }}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleVpaResolve}
                    isLoading={isResolving}
                  >
                    Verify
                  </Button>
                </div>
                {errors.to && <span className="input-group__error" style={{ color: 'var(--vault-error)' }}>{errors.to}</span>}
                {vpaError && <span className="input-group__error" style={{ color: 'var(--vault-error)' }}>{vpaError}</span>}
                {resolvedName && (
                  <div className="vpa-verified-badge" style={{ marginTop: '8px', padding: '6px 10px', borderRadius: '4px', background: 'rgba(21, 128, 61, 0.08)', color: 'var(--vault-success)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700' }}>
                    <span>✓ Verified Payee: <strong>{resolvedName}</strong></span>
                  </div>
                )}
              </div>
            ) : (
              <Input
                id="to-account"
                label="Recipient Account Number"
                placeholder="e.g. 909012340003"
                value={toAccount}
                onChange={(e) => setToAccount(e.target.value)}
                error={errors.to}
              />
            )}

            {/* Amount */}
            <Input
              id="transfer-amount"
              label="Amount"
              type="number"
              placeholder="0.00"
              prefix="₹"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              error={errors.amount}
            />

            {/* Description */}
            <Input
              id="transfer-desc"
              label="Description (optional)"
              placeholder="What's this for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            {parseFloat(amount) > 10000 && (
              <div className="transfer-warning">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 1L1 14h14L8 1z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                  <path d="M8 6v3M8 11.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                Transfers over ₹10,000 require branch manager approval.
              </div>
            )}

            <Button type="submit" variant="primary" size="lg" fullWidth isLoading={isLoading}>
              Send Transfer
            </Button>
          </form>
        </Card>

        {/* Summary sidebar */}
        <div className="transfer-summary">
          <Card>
            <h3 className="transfer-summary__title">Transfer Summary</h3>
            <div className="transfer-summary__rows">
              <div className="transfer-summary__row">
                <span className="transfer-summary__label">From</span>
                <span className="transfer-summary__value">
                  {selectedAcc ? `${selectedAcc.accountType} — ${selectedAcc.accountNumber}` : '—'}
                </span>
              </div>
              <div className="transfer-summary__row">
                <span className="transfer-summary__label">To</span>
                <span className="transfer-summary__value">
                  {transferType === 'vpa' && resolvedName ? `${resolvedName} (${toVpa})` : toAccount || '—'}
                </span>
              </div>
              <div className="transfer-summary__row">
                <span className="transfer-summary__label">Amount</span>
                <span className="transfer-summary__value transfer-summary__amount">
                  {amount ? formatCurrency(parseFloat(amount) || 0) : '—'}
                </span>
              </div>
              {selectedAcc && (
                <div className="transfer-summary__row">
                  <span className="transfer-summary__label">Available</span>
                  <span className="transfer-summary__value">{formatCurrency(selectedAcc.balance)}</span>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Result Modal */}
      <Modal
        isOpen={!!result}
        onClose={() => setResult(null)}
        title="Transfer Submitted"
      >
        {result && (
          <div className="transfer-result">
            <div className="transfer-result__icon">
              {result.transaction?.status === 'completed' ? (
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                  <circle cx="24" cy="24" r="22" stroke="var(--color-accent)" strokeWidth="2.5"/>
                  <path d="M15 24l6 6 12-12" stroke="var(--color-accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                  <circle cx="24" cy="24" r="22" stroke="var(--color-warning)" strokeWidth="2.5"/>
                  <path d="M24 16v10M24 30v2" stroke="var(--color-warning)" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
              )}
            </div>
            <p className="transfer-result__message">{result.message}</p>
            <div className="transfer-result__amount">{formatCurrency(result.transaction?.amount || 0)}</div>
            <Badge
              variant={result.transaction?.status === 'completed' ? 'success' : 'warning'}
              size="md"
            >
              {result.transaction?.status}
            </Badge>
            <Button variant="secondary" fullWidth onClick={() => setResult(null)} style={{ marginTop: '16px' }}>
              Done
            </Button>
          </div>
        )}
      </Modal>

      {/* Fraud Warning Modal */}
      <FraudWarningModal
        isOpen={!!fraudWarnings}
        warnings={fraudWarnings || []}
        onCancel={() => { setFraudWarnings(null); setPendingTransferData(null); }}
        onProceed={handleFraudProceed}
        isLoading={isLoading}
      />
    </div>
  );
}
