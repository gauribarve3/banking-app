import { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { formatCurrency, formatDate } from '../../utils/format';
import './FDCalculator.css';

export default function FDCalculator() {
  const [accounts, setAccounts] = useState([]);
  const [sourceAccount, setSourceAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [tenure, setTenure] = useState('12'); // months
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [error, setError] = useState('');

  const fetchAccounts = async () => {
    try {
      const res = await apiClient.get('/customer/accounts');
      // Only allow Current/Savings to fund an FD
      const fundable = (res.data.accounts || []).filter(acc => acc.accountType !== 'FD');
      setAccounts(fundable);
      if (fundable.length > 0) {
        setSourceAccount(fundable[0].accountNumber);
      }
    } catch (err) {
      console.error('Fetch accounts error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const parsedAmount = parseFloat(amount) || 0;
  const parsedTenure = parseInt(tenure) || 12;
  const rate = 0.071; // 7.1% p.a.
  const years = parsedTenure / 12;
  const interestEarned = parsedAmount * Math.pow(1 + rate, years) - parsedAmount;
  const maturityAmount = parsedAmount + interestEarned;
  
  const maturityDate = new Date();
  maturityDate.setMonth(maturityDate.getMonth() + parsedTenure);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (parsedAmount <= 0) {
      setError('Please enter a valid deposit amount.');
      return;
    }

    const selectedAccObj = accounts.find(acc => acc.accountNumber === sourceAccount);
    if (selectedAccObj && selectedAccObj.balance < parsedAmount) {
      setError('Insufficient funds in the selected funding account.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiClient.post('/customer/fd/create', {
        sourceAccountNumber: sourceAccount,
        amount: parsedAmount,
        tenureMonths: parsedTenure
      });
      setSuccessData(res.data);
      setAmount('');
      fetchAccounts();
    } catch (err) {
      console.error('Create FD error:', err);
      setError(err.response?.data?.message || 'Failed to open Fixed Deposit.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="page-loading"><div className="loading-screen__spinner" /></div>;
  }

  return (
    <div className="fd-calculator-page">
      <div className="page-header">
        <h1 className="page-title">Fixed Deposit (FD) Center</h1>
        <p className="page-subtitle">Calculate returns and open high-yield Indian Fixed Deposits instantly</p>
      </div>

      <div className="fd-calculator-layout">
        {/* Left Column - Calculator form */}
        <Card className="fd-form-card">
          <h2 className="fd-card-title">Open a New Fixed Deposit</h2>
          
          {error && <div className="fd-error-banner">{error}</div>}

          <form onSubmit={handleSubmit} className="fd-form">
            <div className="form-group">
              <label className="form-label" htmlFor="source-acc">Funding Source Account</label>
              <select
                id="source-acc"
                className="fd-select"
                value={sourceAccount}
                onChange={(e) => setSourceAccount(e.target.value)}
                required
              >
                {accounts.map(acc => (
                  <option key={acc._id} value={acc.accountNumber}>
                    {acc.accountType} Account - {acc.accountNumber} ({formatCurrency(acc.balance)})
                  </option>
                ))}
              </select>
            </div>

            <Input
              id="fd-amount"
              label="Deposit Amount (INR)"
              type="number"
              placeholder="e.g. 50000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              min="1000"
            />

            <div className="form-group">
              <label className="form-label" htmlFor="fd-tenure">Investment Tenure</label>
              <select
                id="fd-tenure"
                className="fd-select"
                value={tenure}
                onChange={(e) => setTenure(e.target.value)}
                required
              >
                <option value="12">1 Year (12 Months) @ 7.1% p.a.</option>
                <option value="36">3 Years (36 Months) @ 7.1% p.a.</option>
                <option value="60">5 Years (60 Months) @ 7.1% p.a.</option>
              </select>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              isLoading={submitting}
            >
              Open Fixed Deposit
            </Button>
          </form>
        </Card>

        {/* Right Column - Returns preview */}
        <Card className="fd-results-card">
          <h2 className="fd-card-title">Estimated Returns</h2>
          <div className="fd-results-list">
            <div className="fd-result-row">
              <span className="fd-result-label">Principal Amount</span>
              <span className="fd-result-val">{formatCurrency(parsedAmount)}</span>
            </div>
            <div className="fd-result-row">
              <span className="fd-result-label">Interest Rate</span>
              <span className="fd-result-val highlighted-rate">7.10% p.a.</span>
            </div>
            <div className="fd-result-row">
              <span className="fd-result-label">Tenure Selected</span>
              <span className="fd-result-val">{years} Year{years > 1 ? 's' : ''} ({parsedTenure} Months)</span>
            </div>
            <div className="fd-result-row divider">
              <span className="fd-result-label">Estimated Interest</span>
              <span className="fd-result-val interest">{formatCurrency(interestEarned)}</span>
            </div>
            <div className="fd-result-row total">
              <span className="fd-result-label">Total Maturity Value</span>
              <span className="fd-result-val maturity">{formatCurrency(maturityAmount)}</span>
            </div>
            <div className="fd-result-row">
              <span className="fd-result-label">Maturity Date</span>
              <span className="fd-result-val date">{formatDate(maturityDate)}</span>
            </div>
          </div>
          <div className="fd-calculator-disclaimer">
            * All computations are mock estimates for demonstration. Compounding is computed annually. T&C apply.
          </div>
        </Card>
      </div>

      {/* Success Modal */}
      <Modal
        isOpen={!!successData}
        onClose={() => setSuccessData(null)}
        title="Fixed Deposit Created Successfully"
      >
        {successData && (
          <div className="fd-success-receipt">
            <div className="receipt-check">✓</div>
            <h3>Fixed Deposit Opened</h3>
            <p className="receipt-subtitle">Your funds have been securely locked in</p>
            
            <div className="receipt-details">
              <div className="receipt-row">
                <span>FD Account Number</span>
                <strong>{successData.fdAccount?.accountNumber}</strong>
              </div>
              <div className="receipt-row">
                <span>Principal Deposited</span>
                <strong>{formatCurrency(successData.fdAccount?.balance)}</strong>
              </div>
              <div className="receipt-row">
                <span>Interest Rate</span>
                <strong>7.1% p.a.</strong>
              </div>
              <div className="receipt-row">
                <span>Maturity Amount</span>
                <strong className="text-success">{formatCurrency(successData.fdAccount?.maturityAmount)}</strong>
              </div>
              <div className="receipt-row">
                <span>Maturity Date</span>
                <strong>{formatDate(successData.fdAccount?.maturityDate)}</strong>
              </div>
            </div>
            <Button variant="primary" fullWidth onClick={() => setSuccessData(null)}>
              Done
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
