import { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { formatCurrency } from '../../utils/format';
import './DepositPage.css';

export default function DepositPage() {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccNum, setSelectedAccNum] = useState('');
  const [amount, setAmount] = useState('');
  const [depositDate, setDepositDate] = useState(new Date().toISOString().split('T')[0]);
  const [depositLocation, setDepositLocation] = useState('Main Mumbai Branch');
  const [sourceOfFunds, setSourceOfFunds] = useState('Cash Holdings');
  
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const res = await apiClient.get('/customer/accounts');
        // Only operational savings/checking accounts can receive deposits (no FD)
        const operationalAccounts = (res.data.accounts || []).filter(
          (acc) => acc.accountType !== 'FD'
        );
        setAccounts(operationalAccounts);
        if (operationalAccounts.length > 0) {
          setSelectedAccNum(operationalAccounts[0].accountNumber);
        }
      } catch (err) {
        console.error('Fetch accounts error:', err);
      }
    };
    fetchAccounts();
  }, []);

  const validate = () => {
    const errs = {};
    if (!selectedAccNum) errs.account = 'Select a receiving account.';
    if (!amount || parseFloat(amount) <= 0) errs.amount = 'Enter a valid positive deposit amount.';
    if (!depositDate) errs.date = 'Select a deposit date.';
    if (!depositLocation.trim()) errs.location = 'Enter branch location.';
    if (!sourceOfFunds.trim()) errs.source = 'Enter source of funds.';

    const selectedAcc = accounts.find((a) => a.accountNumber === selectedAccNum);
    if (selectedAcc && selectedAcc.isFrozen) {
      errs.account = 'This account is frozen. Deposits cannot be requested.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setErrors({});

    const depositData = {
      accountNum: selectedAccNum,
      amount: parseFloat(amount),
      depositDate,
      depositLocation,
      sourceOfFunds,
    };

    try {
      const res = await apiClient.post('/customer/deposit', depositData);
      setResult(res.data);
      setAmount('');
    } catch (err) {
      setErrors({ server: err.response?.data?.message || 'Deposit request failed.' });
    } finally {
      setIsLoading(false);
    }
  };

  const activeAccount = accounts.find((a) => a.accountNumber === selectedAccNum);

  return (
    <div className="deposit-page">
      <div className="page-header">
        <h1 className="page-title">Deposit Money</h1>
        <p className="page-subtitle">Request cash or cheque deposit approvals into your account</p>
      </div>

      <div className="deposit-layout">
        <Card className="deposit-form-card">
          <form onSubmit={handleSubmit} className="deposit-form">
            {errors.server && (
              <div className="deposit-error-banner">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M8 5v3M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                {errors.server}
              </div>
            )}

            {/* Account Selection */}
            <div className="input-group">
              <label className="input-group__label" htmlFor="deposit-account">Destination Account</label>
              <select
                id="deposit-account"
                className="deposit-select"
                value={selectedAccNum}
                onChange={(e) => setSelectedAccNum(e.target.value)}
              >
                {accounts.map((acc) => (
                  <option key={acc._id} value={acc.accountNumber} disabled={acc.isFrozen}>
                    {acc.accountType} Account — {acc.accountNumber} ({formatCurrency(acc.balance)})
                    {acc.isFrozen ? ' [FROZEN]' : ''}
                  </option>
                ))}
              </select>
              {errors.account && <span className="input-group__error">{errors.account}</span>}
            </div>

            {/* Amount */}
            <Input
              id="deposit-amount"
              label="Deposit Amount"
              type="number"
              placeholder="0.00"
              prefix="₹"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              error={errors.amount}
              required
            />

            {/* Date */}
            <Input
              id="deposit-date"
              label="Scheduled Deposit Date"
              type="date"
              value={depositDate}
              onChange={(e) => setDepositDate(e.target.value)}
              error={errors.date}
              required
            />

            {/* Branch Location */}
            <div className="input-group">
              <label className="input-group__label" htmlFor="deposit-location">Branch Location</label>
              <select
                id="deposit-location"
                className="deposit-select"
                value={depositLocation}
                onChange={(e) => setDepositLocation(e.target.value)}
              >
                <option value="Mumbai Central">Mumbai Central</option>
                <option value="Delhi Connaught Place">Delhi Connaught Place</option>
                <option value="Bengaluru Koramangala">Bengaluru Koramangala</option>
                <option value="Hyderabad Banjara Hills">Hyderabad Banjara Hills</option>
              </select>
              {errors.location && <span className="input-group__error">{errors.location}</span>}
            </div>

            {/* Source of Funds */}
            <div className="input-group">
              <label className="input-group__label" htmlFor="deposit-source">Source of Funds</label>
              <select
                id="deposit-source"
                className="deposit-select"
                value={sourceOfFunds}
                onChange={(e) => setSourceOfFunds(e.target.value)}
              >
                <option value="Cash Holdings">Cash Holdings</option>
                <option value="Salary/Business Income">Salary/Business Income</option>
                <option value="Gift/Inheritance">Gift/Inheritance</option>
                <option value="Investment Liquidation">Investment Liquidation</option>
              </select>
              {errors.source && <span className="input-group__error">{errors.source}</span>}
            </div>

            <div className="deposit-info-note">
              💡 Deposit requests require physical verification at the chosen branch. Your Relationship Manager will review and approve the credit once the funds are processed.
            </div>

            <Button type="submit" variant="primary" size="lg" fullWidth isLoading={isLoading}>
              Submit Deposit Request
            </Button>
          </form>
        </Card>

        {/* Summary Sidebar */}
        <div className="deposit-summary-sidebar">
          <Card>
            <h3 className="deposit-summary-title">Request Summary</h3>
            <div className="deposit-summary-rows">
              <div className="deposit-summary-row">
                <span className="deposit-summary-label">Target Account</span>
                <span className="deposit-summary-value">
                  {activeAccount ? `${activeAccount.accountType} — ${activeAccount.accountNumber}` : '—'}
                </span>
              </div>
              <div className="deposit-summary-row">
                <span className="deposit-summary-label">Amount</span>
                <span className="deposit-summary-value deposit-summary-amount">
                  {amount ? formatCurrency(parseFloat(amount) || 0) : '—'}
                </span>
              </div>
              <div className="deposit-summary-row">
                <span className="deposit-summary-label">Date</span>
                <span className="deposit-summary-value">{depositDate || '—'}</span>
              </div>
              <div className="deposit-summary-row">
                <span className="deposit-summary-label">Branch</span>
                <span className="deposit-summary-value">{depositLocation}</span>
              </div>
              <div className="deposit-summary-row">
                <span className="deposit-summary-label">Funding Source</span>
                <span className="deposit-summary-value">{sourceOfFunds}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Success Modal */}
      <Modal
        isOpen={!!result}
        onClose={() => setResult(null)}
        title="Deposit Request Submitted"
      >
        {result && (
          <div className="deposit-result-modal">
            <div className="deposit-result-icon">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <circle cx="24" cy="24" r="22" stroke="var(--color-accent)" strokeWidth="2.5"/>
                <path d="M15 24l6 6 12-12" stroke="var(--color-accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3>Request Submitted Successfully</h3>
            <p>Your deposit of <strong>{formatCurrency(result.transaction?.amount)}</strong> has been logged with Transaction ID: <code className="tx-id-code">{result.transaction?._id}</code>.</p>
            <p className="sub-text">Please visit the <strong>{depositLocation}</strong> on <strong>{new Date(depositDate).toLocaleDateString('en-IN')}</strong> to complete the transaction. The credit will reflect once the Branch Manager approves the deposit.</p>
            <Button variant="primary" fullWidth onClick={() => setResult(null)}>
              Done
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
