import { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import StatCard from '../../components/ui/StatCard';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { formatCurrency, formatDate } from '../../utils/format';
import { Doughnut, Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import './AdminDashboard.css';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Statement date filtering states
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');
  const [filterLoading, setFilterLoading] = useState(false);

  // Interactive modal states
  const [activeModal, setActiveModal] = useState(null); // 'volume' | 'liquidity' | 'users' | 'pending'

  const fetchAdminTransactions = async (start = '', end = '') => {
    setFilterLoading(true);
    try {
      const res = await apiClient.get('/admin/transactions', {
        params: { startDate: start, endDate: end }
      });
      setTransactions(res.data.transactions);
    } catch (err) {
      console.error('Admin transactions fetch error:', err);
    } finally {
      setFilterLoading(false);
    }
  };

  const handleApplyFilter = () => {
    fetchAdminTransactions(filterStart, filterEnd);
  };

  const handleClearFilter = () => {
    setFilterStart('');
    setFilterEnd('');
    fetchAdminTransactions('', '');
  };

  const handleExportCSV = () => {
    const headers = ['Date', 'Sender', 'Receiver', 'Description', 'Amount', 'Status'];
    const rows = transactions.map(tx => {
      const sender = tx.senderUserId ? `${tx.senderUserId.firstName} ${tx.senderUserId.lastName}` : '—';
      const receiver = tx.receiverUserId ? `${tx.receiverUserId.firstName} ${tx.receiverUserId.lastName}` : '—';
      const date = new Date(tx.createdAt).toLocaleDateString('en-IN');
      const amount = tx.amount;
      return [date, sender, receiver, tx.description || '—', amount, tx.status];
    });

    const csvString = [headers.join(','), ...rows.map(e => e.map(val => `"${val.toString().replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `system_transactions_${filterStart || 'all'}_to_${filterEnd || 'all'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [anaRes, txRes, custRes] = await Promise.all([
          apiClient.get('/admin/analytics'),
          apiClient.get('/admin/transactions'),
          apiClient.get('/admin/customers'),
        ]);
        setAnalytics(anaRes.data.analytics);
        setTransactions(txRes.data.transactions);
        setCustomers(custRes.data.customers || []);
      } catch (err) {
        console.error('Admin dashboard error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading || !analytics) {
    return <div className="page-loading"><div className="loading-screen__spinner" /></div>;
  }

  // Filter lists for modals
  const pendingTxns = transactions.filter(t => t.status === 'pending');
  const allAccounts = customers.flatMap(c => c.accounts.map(acc => ({
    ...acc,
    customerName: `${c.firstName} ${c.lastName}`,
    customerEmail: c.email
  }))).sort((a, b) => b.balance - a.balance);

  return (
    <div className="admin-dashboard">
      <div className="page-header">
        <h1 className="page-title">System Overview</h1>
        <p className="page-subtitle">Global analytics and operational metrics (Click cards to see details)</p>
      </div>

      <div className="stats-grid stats-grid--4">
        <div onClick={() => setActiveModal('volume')} style={{ cursor: 'pointer' }}>
          <StatCard
            icon={<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M3 17l4-4 4 4 4-8 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            label="Transaction Volume"
            value={formatCurrency(analytics.totalVolume)}
            sub={`${analytics.totalTransactions} total transactions`}
          />
        </div>
        <div onClick={() => setActiveModal('liquidity')} style={{ cursor: 'pointer' }}>
          <StatCard
            icon={<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M11 1v20M6 5h10a3 3 0 010 6H6a3 3 0 000 6h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            label="System Liquidity"
            value={formatCurrency(analytics.systemLiquidity)}
            sub="Total customer assets"
          />
        </div>
        <div onClick={() => setActiveModal('users')} style={{ cursor: 'pointer' }}>
          <StatCard
            icon={<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="8" cy="8" r="4" stroke="currentColor" strokeWidth="1.5"/><path d="M1 20c0-4 3-6.5 7-6.5s7 2.5 7 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>}
            label="Active Users"
            value={analytics.activeCustomers + analytics.activeEmployees}
            sub={`${analytics.activeCustomers} customers · ${analytics.activeEmployees} employees`}
          />
        </div>
        <div onClick={() => setActiveModal('pending')} style={{ cursor: 'pointer' }}>
          <StatCard
            icon={<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M12 2L2 8l10 6 10-6-10-6zM2 14l10 6 10-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            label="Pending Transfers"
            value={analytics.pendingTransfers}
            sub={analytics.pendingTransfers > 0 ? 'Click to view pending' : 'No transfers pending'}
          />
        </div>
      </div>

      {/* Visualizations Section */}
      <div className="charts-grid-admin">
        {/* Chart 1: Branch Liquidity */}
        <Card className="chart-card">
          <h3 className="chart-card__title">Branch Liquidity Overview (Customer Balances)</h3>
          <div className="chart-card__canvas">
            <Bar
              data={{
                labels: analytics.branchLiquidity?.map(b => b.branchName) || [],
                datasets: [{
                  label: 'Liquidity',
                  data: analytics.branchLiquidity?.map(b => b.totalLiquidity) || [],
                  backgroundColor: ['#0D9668', '#0284c7', '#6366f1', '#f59e0b'],
                  borderRadius: 8,
                  barPercentage: 0.5,
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    callbacks: { label: (ctx) => `${ctx.dataset.label}: ${formatCurrency(ctx.raw)}` },
                    backgroundColor: '#1A1D26',
                    titleFont: { family: 'Inter' },
                    bodyFont: { family: 'Inter' },
                    padding: 12,
                    cornerRadius: 8,
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: { callback: v => `₹${(v/100000).toFixed(1)}L`, font: { size: 11, family: 'Inter' } },
                    grid: { color: 'rgba(0,0,0,0.04)' }
                  },
                  x: { grid: { display: false }, ticks: { font: { size: 11, family: 'Inter' } } }
                }
              }}
            />
          </div>
        </Card>

        {/* Chart 2: Transaction Status */}
        <Card className="chart-card">
          <h3 className="chart-card__title">Transaction Status breakdown</h3>
          <div className="chart-card__canvas">
            <Doughnut
              data={{
                labels: analytics.statusCounts?.map(s => s._id.charAt(0).toUpperCase() + s._id.slice(1)) || [],
                datasets: [{
                  data: analytics.statusCounts?.map(s => s.count) || [],
                  backgroundColor: ['#0D9668', '#f59e0b', '#dc2626'],
                  borderColor: '#ffffff',
                  borderWidth: 3,
                  hoverOffset: 6,
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                plugins: {
                  legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true, font: { size: 12, family: 'Inter' } } },
                  tooltip: {
                    backgroundColor: '#1A1D26',
                    titleFont: { family: 'Inter' },
                    bodyFont: { family: 'Inter' },
                    padding: 12,
                    cornerRadius: 8,
                  }
                }
              }}
            />
          </div>
        </Card>

        {/* Chart 3: System User Base */}
        <Card className="chart-card">
          <h3 className="chart-card__title">System User Base</h3>
          <div className="chart-card__canvas">
            <Pie
              data={{
                labels: analytics.userRoles?.map(u => u._id === 'employee' ? 'Managers' : u._id.charAt(0).toUpperCase() + u._id.slice(1)) || [],
                datasets: [{
                  data: analytics.userRoles?.map(u => u.count) || [],
                  backgroundColor: ['#6366f1', '#0284c7', '#0d9668'],
                  borderColor: '#ffffff',
                  borderWidth: 3,
                  hoverOffset: 6,
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true, font: { size: 12, family: 'Inter' } } },
                  tooltip: {
                    backgroundColor: '#1A1D26',
                    titleFont: { family: 'Inter' },
                    bodyFont: { family: 'Inter' },
                    padding: 12,
                    cornerRadius: 8,
                  }
                }
              }}
            />
          </div>
        </Card>
      </div>

      {/* Recent system transactions */}
      <section className="section">
        <h2 className="section-title">Recent System Activity</h2>
        <Card padding="none">
          <div className="tx-list">
            {transactions.map((tx) => (
              <div key={tx._id} className="tx-row">
                <div className="tx-row__icon-wrap" data-type="received" style={{ background: 'var(--color-info-light)', color: 'var(--color-info)' }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M4 8h8M8 4v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <div className="tx-row__info">
                  <span className="tx-row__name">
                    {tx.senderUserId?.firstName} {tx.senderUserId?.lastName}
                    {' → '}
                    {tx.receiverUserId?.firstName} {tx.receiverUserId?.lastName}
                  </span>
                  <span className="tx-row__desc">{tx.description || 'Transfer'}</span>
                </div>
                <div className="tx-row__meta">
                  <span className="tx-row__amount" style={{ color: 'var(--color-text-primary)' }}>
                    {formatCurrency(tx.amount)}
                  </span>
                  <span className="tx-row__date">{formatDate(tx.createdAt)}</span>
                </div>
                <div className="tx-row__status">
                  <Badge
                    variant={tx.status === 'completed' ? 'success' : tx.status === 'pending' ? 'warning' : 'danger'}
                  >
                    {tx.status}
                  </Badge>
                </div>
              </div>
            ))}
            {transactions.length === 0 && (
              <div className="tx-list__empty">No recent activity.</div>
            )}
          </div>
        </Card>
      </section>

      {/* Modal 1: Volume Details */}
      <Modal
        isOpen={activeModal === 'volume'}
        onClose={() => setActiveModal(null)}
        title="Transaction Volume Log"
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexWrap: 'wrap',
          marginBottom: '16px',
          padding: '8px 12px',
          background: 'var(--color-bg-primary)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border-light)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>From:</span>
            <input
              type="date"
              value={filterStart}
              onChange={(e) => setFilterStart(e.target.value)}
              style={{
                padding: '4px 8px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
                background: 'var(--color-bg-card)',
                color: 'var(--color-text-primary)',
                fontSize: '11px'
              }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>To:</span>
            <input
              type="date"
              value={filterEnd}
              onChange={(e) => setFilterEnd(e.target.value)}
              style={{
                padding: '4px 8px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
                background: 'var(--color-bg-card)',
                color: 'var(--color-text-primary)',
                fontSize: '11px'
              }}
            />
          </div>
          <Button
            size="sm"
            onClick={handleApplyFilter}
            isLoading={filterLoading}
            style={{ padding: '4px 8px', fontSize: '11px' }}
          >
            Filter
          </Button>
          {(filterStart || filterEnd) && (
            <Button
              size="sm"
              variant="secondary"
              onClick={handleClearFilter}
              style={{ padding: '4px 8px', fontSize: '11px' }}
            >
              Clear
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportCSV}
            disabled={transactions.length === 0}
            style={{ padding: '4px 8px', fontSize: '11px', marginLeft: 'auto' }}
          >
            📥 Export CSV
          </Button>
        </div>

        <div style={{ maxHeight: '350px', overflowY: 'auto' }} className="tx-list">
          {transactions.map(tx => (
            <div key={tx._id} className="tx-row">
              <div className="tx-row__info">
                <span className="tx-row__name">{tx.senderUserId?.firstName} {tx.senderUserId?.lastName} ➡️ {tx.receiverUserId?.firstName} {tx.receiverUserId?.lastName}</span>
                <span className="tx-row__desc">{tx.description || 'P2P Transfer'}</span>
              </div>
              <div className="tx-row__meta">
                <strong className="tx-row__amount" style={{ color: 'var(--color-text-primary)' }}>{formatCurrency(tx.amount)}</strong>
                <span className="tx-row__date">{formatDate(tx.createdAt)}</span>
              </div>
              <Badge variant={tx.status === 'completed' ? 'success' : tx.status === 'pending' ? 'warning' : 'danger'}>
                {tx.status}
              </Badge>
            </div>
          ))}
          {transactions.length === 0 && (
            <div className="tx-list__empty">No transactions match the filter criteria.</div>
          )}
        </div>
      </Modal>

      {/* Modal 2: System Liquidity details */}
      <Modal
        isOpen={activeModal === 'liquidity'}
        onClose={() => setActiveModal(null)}
        title="Customer Asset Balances"
      >
        <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                <th style={{ padding: '8px' }}>Customer</th>
                <th style={{ padding: '8px' }}>Account</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>Balance</th>
              </tr>
            </thead>
            <tbody>
              {allAccounts.map((acc, index) => (
                <tr key={index} style={{ borderBottom: '1px solid var(--color-border-light)' }}>
                  <td style={{ padding: '8px' }}>
                    <div style={{ fontWeight: 600 }}>{acc.customerName}</div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>{acc.customerEmail}</div>
                  </td>
                  <td style={{ padding: '8px' }}>
                    <strong>{acc.accountType}</strong> ({acc.accountNumber})
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700 }}>
                    {formatCurrency(acc.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal>

      {/* Modal 3: Active Users details */}
      <Modal
        isOpen={activeModal === 'users'}
        onClose={() => setActiveModal(null)}
        title="User Base Overview"
      >
        <div style={{ padding: '8px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
            <div>
              <strong style={{ fontSize: '20px', display: 'block' }}>{analytics.activeCustomers}</strong>
              <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>Customers Registered</span>
            </div>
            <div>
              <strong style={{ fontSize: '20px', display: 'block' }}>{analytics.activeEmployees}</strong>
              <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>Branch Managers</span>
            </div>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '0 0 12px' }}>
            All user profiles are authenticated via security tokens and assigned to their respective branches.
          </p>
        </div>
      </Modal>

      {/* Modal 4: Pending Transfers details */}
      <Modal
        isOpen={activeModal === 'pending'}
        onClose={() => setActiveModal(null)}
        title="Pending Approvals List"
      >
        <div style={{ maxHeight: '350px', overflowY: 'auto' }} className="tx-list">
          {pendingTxns.map(tx => (
            <div key={tx._id} className="tx-row">
              <div className="tx-row__info">
                <span className="tx-row__name">{tx.senderUserId?.firstName} {tx.senderUserId?.lastName} ➡️ {tx.receiverUserId?.firstName} {tx.receiverUserId?.lastName}</span>
                <span className="tx-row__desc">{tx.description || 'Awaiting Review'}</span>
              </div>
              <div className="tx-row__meta">
                <strong className="tx-row__amount" style={{ color: 'var(--color-warning)' }}>{formatCurrency(tx.amount)}</strong>
                <span className="tx-row__date">{formatDate(tx.createdAt)}</span>
              </div>
              <Badge variant="warning">Pending</Badge>
            </div>
          ))}
          {pendingTxns.length === 0 && (
            <div className="tx-list__empty">No pending transfers currently in the system.</div>
          )}
        </div>
      </Modal>
    </div>
  );
}
