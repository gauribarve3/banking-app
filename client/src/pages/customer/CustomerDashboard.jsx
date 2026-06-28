import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import { socket } from '../../api/socket';
import { Doughnut, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import StatCard from '../../components/ui/StatCard';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { formatCurrency, formatDate, maskAccountNumber } from '../../utils/format';
import './CustomerDashboard.css';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

export default function CustomerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [poc, setPoc] = useState(null);
  const [creditCard, setCreditCard] = useState(null);
  const [mandates, setMandates] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Interactive modal states
  const [showBalanceBreakdown, setShowBalanceBreakdown] = useState(false);
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [messageText, setMessageText] = useState('');

  const fetchData = async () => {
    try {
      const [accRes, txRes, mandateRes, summaryRes] = await Promise.all([
        apiClient.get('/customer/accounts'),
        apiClient.get('/customer/transactions'),
        apiClient.get('/customer/mandates'),
        apiClient.get('/customer/transactions/summary')
      ]);
      setAccounts(accRes.data.accounts || []);
      setPoc(accRes.data.poc || null);
      setCreditCard(accRes.data.creditCard || null);
      setTransactions(txRes.data.transactions || []);
      const mands = mandateRes.data.mandates || [];
      setMandates(mands);
      setSummaryData(summaryRes.data.monthlySummary || {});

      // Analyze warnings
      const calculatedWarnings = analyzeWarnings(
        accRes.data.accounts || [],
        txRes.data.transactions || [],
        mands,
        accRes.data.creditCard || null
      );
      setWarnings(calculatedWarnings);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleStatusUpdate = ({ transaction }) => {
      setTransactions(prev => {
        const idx = prev.findIndex(t => t._id === transaction._id);
        if (idx !== -1) {
          const updated = [...prev];
          updated[idx] = transaction;
          return updated;
        } else {
          return [transaction, ...prev];
        }
      });
      fetchData();
    };

    socket.on('transaction:status_update', handleStatusUpdate);

    return () => {
      socket.off('transaction:status_update', handleStatusUpdate);
    };
  }, []);

  const analyzeWarnings = (accs, txs, mands, card) => {
    const list = [];
    const now = new Date();

    // 1. Credit Card warnings
    if (card) {
      if (card.status === 'frozen') {
        list.push({
          type: 'danger',
          icon: '❄️',
          title: 'Credit Card Frozen',
          desc: 'Your credit card has been frozen due to security flags (e.g. a rejected large transfer). Please contact your relationship manager to review and unfreeze.',
          actionText: 'View Card Hub',
          actionPath: '/customer/credit-card'
        });
      } else if (card.status === 'active' && card.outstandingAmount > 0 && card.dueDate) {
        const daysLeft = Math.ceil((new Date(card.dueDate) - now) / (1000 * 60 * 60 * 24));
        if (daysLeft >= 0 && daysLeft <= 2) {
          list.push({
            type: 'danger',
            icon: '⏰',
            title: 'Credit Card Payment Due Soon',
            desc: `Your outstanding card balance of ${formatCurrency(card.outstandingAmount)} is due in ${daysLeft === 0 ? 'today' : daysLeft === 1 ? '1 day' : daysLeft + ' days'} (${formatDate(card.dueDate)}). Pay now to prevent 2.5% daily compounding interest escalation.`,
            actionText: 'Repay Card',
            actionPath: '/customer/credit-card'
          });
        }
      }
    }

    // 2. Mandate warnings (arriving in <= 2 days)
    if (mands && mands.length > 0) {
      mands.forEach(mand => {
        if (mand.status === 'active' && mand.nextDeductionDate) {
          const daysLeft = Math.ceil((new Date(mand.nextDeductionDate) - now) / (1000 * 60 * 60 * 24));
          if (daysLeft >= 0 && daysLeft <= 2) {
            list.push({
              type: 'warning',
              icon: '🔄',
              title: `Autopay Mandate Processing Soon`,
              desc: `Your autopay mandate to ${mand.merchantName} for ${formatCurrency(mand.amount)} is scheduled for execution on ${formatDate(mand.nextDeductionDate)} (${daysLeft === 0 ? 'today' : daysLeft === 1 ? 'tomorrow' : 'in 2 days'}). Ensure your account has sufficient balance.`,
              actionText: 'Manage Mandates',
              actionPath: '/customer/mandates'
            });
          }
        }
        if (mand.status === 'cancelled' && mand.updatedAt) {
          const hoursAgo = (now - new Date(mand.updatedAt)) / (1000 * 60 * 60);
          if (hoursAgo >= 0 && hoursAgo <= 24) {
            list.push({
              type: 'info',
              icon: '🚫',
              title: 'Mandate Revoked',
              desc: `Your autopay mandate to ${mand.merchantName} has been successfully revoked and cancelled. No future payments will be processed.`,
              actionText: 'View Mandates',
              actionPath: '/customer/mandates'
            });
          }
        }
      });
    }

    // 3. Negative Transaction actions (rejections within 24 hours)
    if (txs && txs.length > 0) {
      txs.forEach(tx => {
        if (tx.status === 'rejected' && tx.updatedAt) {
          const hoursAgo = (now - new Date(tx.updatedAt)) / (1000 * 60 * 60);
          if (hoursAgo >= 0 && hoursAgo <= 24) {
            const isDeposit = tx.type === 'deposit';
            const details = isDeposit 
              ? `deposit request of ${formatCurrency(tx.amount)}` 
              : `transfer of ${formatCurrency(tx.amount)} to account ${maskAccountNumber(tx.receiverAccountNum)}`;
            list.push({
              type: 'danger',
              icon: '❌',
              title: `${isDeposit ? 'Deposit' : 'Transfer'} Request Rejected`,
              desc: `Your recent ${details} was rejected. Reason: ${tx.rejectionReason || 'Compliance review flag'}.`,
              actionText: 'Transfer Center',
              actionPath: isDeposit ? '/customer/deposit' : '/customer/transfer'
            });
          }
        }
      });
    }

    return list;
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    try {
      await apiClient.post('/customer/messages', { messageText });
      alert(`Message successfully sent to your Relationship Manager, ${poc?.firstName}!`);
      setMessageText('');
      setShowContactModal(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send message.');
    }
  };

  if (loading) {
    return (
      <div className="page-loading">
        <div className="loading-screen__spinner" />
      </div>
    );
  }

  // Filter transactions for selected account modal
  const accountSpecificTransactions = selectedAccount
    ? transactions.filter(
        (tx) =>
          tx.senderAccountNum === selectedAccount.accountNumber ||
          tx.receiverAccountNum === selectedAccount.accountNumber
      )
    : [];

  return (
    <div className="customer-dashboard">
      <div className="page-header">
        <div>
          <h1 className="page-title">Welcome back, {user?.firstName}</h1>
          <p className="page-subtitle">Here is an overview of your Indian banking portfolio</p>
        </div>
        <div className="page-header__actions">
          <Button variant="secondary" onClick={() => navigate('/customer/transfer')}>
            Transfer Money
          </Button>
          <Button variant="primary" onClick={() => navigate('/customer/fd-calculator')}>
            Open Fixed Deposit (FD)
          </Button>
        </div>
      </div>

      {/* Usability Warnings List */}
      {warnings.map((warn, index) => (
        <div key={index} className={`cc-banner cc-banner--${warn.type === 'danger' ? 'due' : warn.type === 'warning' ? 'applied' : 'eligible'}`} style={{ marginBottom: '16px' }}>
          <div className="cc-banner__content">
            <span className="cc-banner__icon">{warn.icon}</span>
            <div>
              <h4 className="cc-banner__title">{warn.title}</h4>
              <p className="cc-banner__desc">{warn.desc}</p>
            </div>
          </div>
          <Button variant={warn.type === 'danger' ? 'primary' : 'secondary'} size="sm" onClick={() => navigate(warn.actionPath)}>
            {warn.actionText}
          </Button>
        </div>
      ))}

      {/* Credit Card Status Banners */}
      {creditCard && creditCard.status === 'eligible' && (
        <div className="cc-banner cc-banner--eligible" style={{ marginBottom: '24px' }}>
          <div className="cc-banner__content">
            <span className="cc-banner__icon">🎉</span>
            <div>
              <h4 className="cc-banner__title">VaultBank Premium Credit Card Eligibility</h4>
              <p className="cc-banner__desc">Good news! You qualify for our premium credit card with a ₹10,000 limit, a 30-day interest-free grace period, and instant approval.</p>
            </div>
          </div>
          <Button variant="primary" size="sm" onClick={() => navigate('/customer/credit-card')}>Apply Now</Button>
        </div>
      )}
      {creditCard && creditCard.status === 'applied' && (
        <div className="cc-banner cc-banner--applied" style={{ marginBottom: '24px' }}>
          <div className="cc-banner__content">
            <span className="cc-banner__icon">⏳</span>
            <div>
              <h4 className="cc-banner__title">Credit Card Application Pending</h4>
              <p className="cc-banner__desc">Your application is currently under review by your relationship manager. We will notify you once approved.</p>
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={() => navigate('/customer/credit-card')}>View Hub</Button>
        </div>
      )}
      {creditCard && creditCard.status === 'active' && creditCard.outstandingAmount > 0 && (
        <div className="cc-banner cc-banner--due" style={{ marginBottom: '24px' }}>
          <div className="cc-banner__content">
            <span className="cc-banner__icon">💳</span>
            <div>
              <h4 className="cc-banner__title">Credit Card Bill Due</h4>
              <p className="cc-banner__desc">Outstanding: <strong>{formatCurrency(creditCard.outstandingAmount)}</strong> (Interest accrued: {formatCurrency(creditCard.interestAccrued || 0)}). Due Date: {formatDate(creditCard.dueDate)}.</p>
            </div>
          </div>
          <Button variant="primary" size="sm" onClick={() => navigate('/customer/credit-card')}>Repay Now</Button>
        </div>
      )}

      {/* Stat Cards (Interactive) */}
      <div className="stats-grid stats-grid--3">
        <div onClick={() => setShowBalanceBreakdown(true)} style={{ cursor: 'pointer' }}>
          <StatCard
            icon={
              <span style={{ fontSize: '20px', fontWeight: 'bold' }}>₹</span>
            }
            label="Total Net Worth (Click for details)"
            value={formatCurrency(totalBalance)}
            sub="Combined savings & current assets"
          />
        </div>
        <div onClick={() => {
          const firstAccount = document.querySelector('.account-cards');
          if (firstAccount) firstAccount.scrollIntoView({ behavior: 'smooth' });
        }} style={{ cursor: 'pointer' }}>
          <StatCard
            icon={
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <rect x="2" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M2 10h18" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
            }
            label="Active Accounts"
            value={accounts.length}
            sub={accounts.filter(a => !a.isFrozen).length + ' operational'}
          />
        </div>
        <div onClick={() => setShowAllTransactions(true)} style={{ cursor: 'pointer' }}>
          <StatCard
            icon={
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path d="M3 17l4-4 4 4 4-8 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            }
            label="Transactions (Click for ledger)"
            value={transactions.length}
            sub="View complete history"
          />
        </div>
      </div>

      {/* Charts Section */}
      <div className="charts-grid">
        <Card className="chart-card">
          <h3 className="chart-card__title">Asset Allocation</h3>
          <div className="chart-card__canvas">
            <Doughnut
              data={{
                labels: accounts.map(a => a.accountType === 'FD' ? 'Fixed Deposit' : `${a.accountType}`),
                datasets: [{
                  data: accounts.map(a => a.balance),
                  backgroundColor: ['#6366f1', '#0D9668', '#0284c7', '#f59e0b', '#ec4899', '#8b5cf6'],
                  borderColor: '#ffffff',
                  borderWidth: 3,
                  hoverOffset: 8,
                }],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                plugins: {
                  legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true, font: { size: 12, family: 'Inter' } } },
                  tooltip: {
                    callbacks: { label: (ctx) => `${ctx.label}: ${formatCurrency(ctx.raw)}` },
                    backgroundColor: '#1A1D26',
                    titleFont: { family: 'Inter' },
                    bodyFont: { family: 'Inter' },
                    padding: 12,
                    cornerRadius: 8,
                  },
                },
              }}
            />
          </div>
        </Card>

        <Card className="chart-card">
          <h3 className="chart-card__title">Transaction Activity (Last 30 Days)</h3>
          <div className="chart-card__canvas">
            <Bar
              data={(() => {
                const now = Date.now();
                const DAY = 86400000;
                const weeks = ['Week 4', 'Week 3', 'Week 2', 'This Week'];
                const sent = [0, 0, 0, 0];
                const received = [0, 0, 0, 0];
                transactions.filter(tx => tx.status === 'completed').forEach(tx => {
                  const daysAgo = Math.floor((now - new Date(tx.createdAt).getTime()) / DAY);
                  const weekIdx = daysAgo < 7 ? 3 : daysAgo < 14 ? 2 : daysAgo < 21 ? 1 : daysAgo < 28 ? 0 : -1;
                  if (weekIdx >= 0) {
                    if (tx.senderUserId?._id === user?._id) sent[weekIdx] += tx.amount;
                    else received[weekIdx] += tx.amount;
                  }
                });
                return {
                  labels: weeks,
                  datasets: [
                    { label: 'Sent', data: sent, backgroundColor: 'rgba(220, 38, 38, 0.7)', borderRadius: 6, barPercentage: 0.6, categoryPercentage: 0.7 },
                    { label: 'Received', data: received, backgroundColor: 'rgba(13, 150, 104, 0.7)', borderRadius: 6, barPercentage: 0.6, categoryPercentage: 0.7 },
                  ],
                };
              })()}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'top', align: 'end', labels: { usePointStyle: true, font: { size: 11, family: 'Inter' }, padding: 12 } },
                  tooltip: {
                    callbacks: { label: (ctx) => `${ctx.dataset.label}: ${formatCurrency(ctx.raw)}` },
                    backgroundColor: '#1A1D26',
                    bodyFont: { family: 'Inter' },
                    padding: 12,
                    cornerRadius: 8,
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: { callback: v => `₹${(v/1000).toFixed(0)}k`, font: { size: 11, family: 'Inter' } },
                    grid: { color: 'rgba(0,0,0,0.04)' },
                  },
                  x: { grid: { display: false }, ticks: { font: { size: 11, family: 'Inter' } } },
                },
              }}
            />
          </div>
        </Card>
      </div>

      <div className="dashboard-two-column">
        {/* Main Content (Left) */}
        <div className="dashboard-main-col">
          {/* Account Cards */}
          <section className="section">
            <h2 className="section-title">Your Accounts <span className="section-title__sub">(Click any card for account statements)</span></h2>
            <div className="account-cards">
              {accounts.map((acc) => (
                <Card
                  key={acc._id}
                  className="account-card"
                  onClick={() => setSelectedAccount(acc)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="account-card__header">
                    <div className="account-card__type">
                      <span className="account-card__type-icon">
                        {acc.accountType === 'FD' ? (
                          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                            <rect x="3" y="3" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                            <path d="M7 7h6M7 10h6M7 13h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                          </svg>
                        ) : acc.accountType === 'Current' ? (
                          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                            <rect x="2" y="5" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                            <path d="M2 9h16" stroke="currentColor" strokeWidth="1.5"/>
                          </svg>
                        ) : (
                          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                            <path d="M4 18V8l6-5 6 5v10H4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                            <rect x="8" y="12" width="4" height="6" stroke="currentColor" strokeWidth="1.5"/>
                          </svg>
                        )}
                      </span>
                      <span className="account-card__type-label">
                        {acc.accountType === 'FD' ? 'Fixed Deposit' : `${acc.accountType} Account`}
                      </span>
                    </div>
                    <div className="account-card__badges">
                      {acc.isFrozen && <Badge variant="danger">Frozen</Badge>}
                      {acc.accountType === 'FD' && <Badge variant="info">{acc.interestRate}% p.a.</Badge>}
                    </div>
                  </div>
                  <div className="account-card__balance">
                    {formatCurrency(acc.balance)}
                  </div>
                  <div className="account-card__footer-info">
                    <span className="account-card__number">
                      {maskAccountNumber(acc.accountNumber)}
                    </span>
                    {acc.accountType === 'FD' && acc.maturityDate && (
                      <span className="account-card__maturity">
                        Matures: {formatDate(acc.maturityDate)}
                      </span>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </section>

          {/* Recent Transactions */}
          <section className="section">
            <h2 className="section-title">Recent Transactions</h2>
            <Card padding="none">
              <div className="tx-list">
                {transactions.slice(0, 5).map((tx) => {
                  const isSender = tx.senderUserId?._id === user?._id;
                  const counterparty = isSender ? tx.receiverUserId : tx.senderUserId;
                  const counterpartyName = counterparty
                    ? `${counterparty.firstName} ${counterparty.lastName}`
                    : 'Unknown Counterparty';

                  return (
                    <div key={tx._id} className="tx-row">
                      <div className="tx-row__icon-wrap" data-type={isSender ? 'sent' : 'received'}>
                        {isSender ? (
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M4 12L12 4M12 4H6M12 4v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M12 4L4 12M4 12h6M4 12V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                      <div className="tx-row__info">
                        <span className="tx-row__name">
                          {isSender ? `To ${counterpartyName}` : `From ${counterpartyName}`}
                        </span>
                        <span className="tx-row__desc">
                          {tx.description || (tx.receiverAccountNum?.includes('FD') ? 'Fixed Deposit Deposit' : 'Transfer')}
                        </span>
                      </div>
                      <div className="tx-row__meta">
                        <span className={`tx-row__amount ${isSender ? 'tx-row__amount--sent' : 'tx-row__amount--received'}`}>
                          {isSender ? '-' : '+'}{formatCurrency(tx.amount)}
                        </span>
                        <span className="tx-row__date">{formatDate(tx.createdAt)}</span>
                      </div>
                      <div className="tx-row__status">
                        <Badge
                          variant={
                            tx.status === 'completed' ? 'success' :
                            tx.status === 'pending' ? 'warning' : 'danger'
                          }
                        >
                          {tx.status}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
                {transactions.length === 0 && (
                  <div className="tx-list__empty">No transactions yet.</div>
                )}
              </div>
            </Card>
          </section>
        </div>

        {/* Sidebar Column (Right) */}
        <div className="dashboard-side-col">
          {/* POC Employee Info */}
          {poc && (
            <Card className="poc-card">
              <div className="poc-card__header">
                <h3>Your Point of Contact</h3>
                <p>Assigned Branch Relationship Officer</p>
              </div>
              <div className="poc-card__body">
                <div className="poc-card__avatar">
                  {poc.firstName[0]}{poc.lastName[0]}
                </div>
                <div className="poc-card__details">
                  <span className="poc-card__name">{poc.firstName} {poc.lastName}</span>
                  <span className="poc-card__role">Branch Manager</span>
                  <span className="poc-card__email">{poc.email}</span>
                  <span className="poc-card__branch">📍 {poc.assignedBranchId?.name || 'Local Branch'}</span>
                </div>
              </div>
              <div className="poc-card__footer">
                <Button variant="secondary" size="sm" fullWidth onClick={() => setShowContactModal(true)}>
                  Send Message
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Interactive Modal 1: Balance Asset Allocation */}
      <Modal
        isOpen={showBalanceBreakdown}
        onClose={() => setShowBalanceBreakdown(false)}
        title="Asset Allocation Breakdown"
      >
        <div className="breakdown-modal">
          <p className="breakdown-summary">
            Here is the current distribution of your **{formatCurrency(totalBalance)}** portfolio:
          </p>
          <div className="breakdown-list">
            {accounts.map(acc => {
              const pct = totalBalance > 0 ? (acc.balance / totalBalance) * 100 : 0;
              return (
                <div key={acc._id} className="breakdown-row">
                  <div className="breakdown-row__meta">
                    <span className="breakdown-row__label">
                      <strong>{acc.accountType === 'FD' ? 'Fixed Deposit' : `${acc.accountType} Account`}</strong> ({maskAccountNumber(acc.accountNumber)})
                    </span>
                    <span className="breakdown-row__value">{formatCurrency(acc.balance)} ({pct.toFixed(1)}%)</span>
                  </div>
                  <div className="breakdown-bar-bg">
                    <div className="breakdown-bar-fill" style={{ width: `${pct}%`, background: acc.accountType === 'FD' ? '#0284c7' : acc.accountType === 'Current' ? '#6366f1' : 'var(--color-accent)' }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Modal>

      {/* Interactive Modal 2: All Ledger Transactions */}
      <Modal
        isOpen={showAllTransactions}
        onClose={() => setShowAllTransactions(false)}
        title="Account Ledger (All Transactions)"
      >
        <div className="all-tx-modal">
          <div className="tx-list tx-list--modal">
            {transactions.map((tx) => {
              const isSender = tx.senderUserId?._id === user?._id;
              const counterparty = isSender ? tx.receiverUserId : tx.senderUserId;
              const counterpartyName = counterparty
                ? `${counterparty.firstName} ${counterparty.lastName}`
                : 'Unknown';

              return (
                <div key={tx._id} className="tx-row">
                  <div className="tx-row__icon-wrap" data-type={isSender ? 'sent' : 'received'}>
                    {isSender ? '⬆️' : '⬇️'}
                  </div>
                  <div className="tx-row__info">
                    <span className="tx-row__name">{isSender ? `To ${counterpartyName}` : `From ${counterpartyName}`}</span>
                    <span className="tx-row__desc">{tx.description || 'Transfer'}</span>
                  </div>
                  <div className="tx-row__meta">
                    <span className={`tx-row__amount ${isSender ? 'tx-row__amount--sent' : 'tx-row__amount--received'}`}>
                      {isSender ? '-' : '+'}{formatCurrency(tx.amount)}
                    </span>
                    <span className="tx-row__date">{formatDate(tx.createdAt)}</span>
                  </div>
                  <div className="tx-row__status">
                    <Badge variant={tx.status === 'completed' ? 'success' : tx.status === 'pending' ? 'warning' : 'danger'}>
                      {tx.status}
                    </Badge>
                  </div>
                </div>
              );
            })}
            {transactions.length === 0 && <div className="tx-list__empty">No transactions found.</div>}
          </div>
        </div>
      </Modal>

      {/* Interactive Modal 3: Account Statements */}
      <Modal
        isOpen={!!selectedAccount}
        onClose={() => setSelectedAccount(null)}
        title={selectedAccount ? `${selectedAccount.accountType} Account Statement` : 'Account Statement'}
      >
        {selectedAccount && (
          <div className="account-statement-modal">
            <div className="statement-header">
              <div>
                <span className="statement-number">Account Number: {selectedAccount.accountNumber}</span>
                <h3 className="statement-balance">{formatCurrency(selectedAccount.balance)}</h3>
                <span className="statement-label">Available Balance</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <Badge variant={selectedAccount.isFrozen ? 'danger' : 'success'}>
                  {selectedAccount.isFrozen ? 'Frozen' : 'Active'}
                </Badge>
                {selectedAccount.accountType === 'FD' && (
                  <div style={{ marginTop: '8px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                    <div>Interest Rate: <strong>{selectedAccount.interestRate}% p.a.</strong></div>
                    <div>Maturity Amt: <strong>{formatCurrency(selectedAccount.maturityAmount)}</strong></div>
                  </div>
                )}
              </div>
            </div>

            <h4 style={{ margin: '20px 0 10px', fontSize: '14px', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' }}>Recent Ledger Transactions</h4>
            <div className="tx-list tx-list--statement">
              {accountSpecificTransactions.map((tx) => {
                const isSender = tx.senderUserId?._id === user?._id;
                return (
                  <div key={tx._id} className="tx-row">
                    <div className="tx-row__info">
                      <span className="tx-row__name">
                        {tx.type === 'deposit' ? 'Cash Deposit' : tx.type === 'withdrawal' ? 'Atm Withdrawal' : isSender ? 'Sent Out' : 'Received In'}
                      </span>
                      <span className="tx-row__desc">{tx.description || 'Transfer'}</span>
                      {tx.status === 'rejected' && tx.rejectionReason && (
                        <span className="tx-row__rejection-note" style={{ display: 'block', fontSize: '12px', color: 'var(--color-danger)', marginTop: '4px', fontWeight: '500' }}>
                          Reason: {tx.rejectionReason}
                        </span>
                      )}
                    </div>
                    <div className="tx-row__meta">
                      <span className={`tx-row__amount ${isSender ? 'tx-row__amount--sent' : 'tx-row__amount--received'}`}>
                        {isSender ? '-' : '+'}{formatCurrency(tx.amount)}
                      </span>
                      <span className="tx-row__date">{formatDate(tx.createdAt)}</span>
                    </div>
                    <Badge variant={tx.status === 'completed' ? 'success' : tx.status === 'pending' ? 'warning' : 'danger'}>
                      {tx.status}
                    </Badge>
                  </div>
                );
              })}
              {accountSpecificTransactions.length === 0 && (
                <div className="tx-list__empty">No transactions for this account yet.</div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Interactive Modal 4: Relationship Manager Contact Form */}
      <Modal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
        title={`Message ${poc?.firstName}`}
      >
        <form onSubmit={handleSendMessage} className="poc-contact-form">
          <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
            Submit an inquiry to your dedicated branch contact. They will be notified immediately.
          </p>
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label htmlFor="poc-msg" style={{ fontSize: '13px', fontWeight: '500', display: 'block', marginBottom: '6px' }}>Message Body</label>
            <textarea
              id="poc-msg"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Type your query regarding loans, transfers, or FDs..."
              rows={4}
              required
              style={{ width: '100%', padding: '12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', outline: 'none', resize: 'vertical' }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <Button type="button" variant="secondary" onClick={() => setShowContactModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Send Message</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
