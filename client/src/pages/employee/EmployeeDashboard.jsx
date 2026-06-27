import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import apiClient from '../../api/client';
import { Doughnut, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import StatCard from '../../components/ui/StatCard';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { formatCurrency } from '../../utils/format';
import '../customer/CustomerDashboard.css';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Interactivity states
  const [showDepositsModal, setShowDepositsModal] = useState(false);
  const [filterFrozen, setFilterFrozen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [custRes, pendRes] = await Promise.all([
          apiClient.get('/employee/customers'),
          apiClient.get('/employee/pending'),
        ]);
        setCustomers(custRes.data.customers || []);
        setPendingCount(pendRes.data.transactions?.length || 0);
      } catch (err) {
        console.error('Employee dashboard error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const totalDeposits = customers.reduce((sum, c) =>
    sum + c.accounts.reduce((s, a) => s + a.balance, 0), 0
  );

  const frozenAccountsCount = customers.reduce((sum, c) =>
    sum + c.accounts.filter(a => a.isFrozen).length, 0
  );

  // Compute breakdown of deposits
  const currentTotal = customers.reduce((sum, c) =>
    sum + c.accounts.filter(a => a.accountType === 'Current').reduce((s, a) => s + a.balance, 0), 0
  );
  const savingsTotal = customers.reduce((sum, c) =>
    sum + c.accounts.filter(a => a.accountType === 'Savings').reduce((s, a) => s + a.balance, 0), 0
  );
  const fdTotal = customers.reduce((sum, c) =>
    sum + c.accounts.filter(a => a.accountType === 'FD').reduce((s, a) => s + a.balance, 0), 0
  );

  // Filter customers to display
  const displayedCustomers = filterFrozen
    ? customers.filter(c => c.accounts.some(a => a.isFrozen))
    : customers;

  if (loading) {
    return <div className="page-loading"><div className="loading-screen__spinner" /></div>;
  }

  return (
    <div className="employee-dashboard">
      <div className="page-header">
        <div>
          <h1 className="page-title">Branch Management</h1>
          <p className="page-subtitle">
            Welcome back, {user?.firstName}
            {user?.assignedBranchId?.name ? ` — ${user.assignedBranchId.name}` : ''}
          </p>
        </div>
      </div>

      {/* Interactive Stats Grid */}
      <div className="stats-grid stats-grid--4">
        <div onClick={() => setFilterFrozen(false)} style={{ cursor: 'pointer' }}>
          <StatCard
            icon={<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="8" cy="8" r="4" stroke="currentColor" strokeWidth="1.5"/><path d="M1 20c0-4 3-6.5 7-6.5s7 2.5 7 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>}
            label="Branch Customers"
            value={customers.length}
            sub="Show all customers"
          />
        </div>
        <div onClick={() => setShowDepositsModal(true)} style={{ cursor: 'pointer' }}>
          <StatCard
            icon={<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M11 1v20M6 5h10a3 3 0 010 6H6a3 3 0 000 6h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            label="Total Deposits"
            value={formatCurrency(totalDeposits)}
            sub="Click to view breakdown"
          />
        </div>
        <div onClick={() => navigate('/employee/approvals')} style={{ cursor: 'pointer' }}>
          <StatCard
            icon={<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M12 2L2 8l10 6 10-6-10-6zM2 14l10 6 10-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            label="Pending Approvals"
            value={pendingCount}
            sub={pendingCount > 0 ? 'Requires action (Click to resolve)' : 'All clear'}
          />
        </div>
        <div onClick={() => setFilterFrozen(!filterFrozen)} style={{ cursor: 'pointer' }}>
          <StatCard
            icon={<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M17 11H7m0 0l4-4m-4 4l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><rect x="2" y="2" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="1.5"/></svg>}
            label="Frozen Accounts"
            value={frozenAccountsCount}
            sub={filterFrozen ? 'Filtering: Frozen (Click to clear)' : 'Click to filter frozen'}
          />
        </div>
      </div>

      {/* Charts Section */}
      <div className="charts-grid">
        <Card className="chart-card">
          <h3 className="chart-card__title">Deposit Composition</h3>
          <div className="chart-card__canvas">
            <Doughnut
              data={{
                labels: ['Savings', 'Current', 'Fixed Deposits'],
                datasets: [{
                  data: [savingsTotal, currentTotal, fdTotal],
                  backgroundColor: ['#0D9668', '#6366f1', '#0284c7'],
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
                    padding: 12,
                    cornerRadius: 8,
                  },
                },
              }}
            />
          </div>
        </Card>
        <Card className="chart-card">
          <h3 className="chart-card__title">Customer Deposits (Top 8)</h3>
          <div className="chart-card__canvas">
            <Bar
              data={{
                labels: customers.slice(0, 8).map(c => `${c.firstName} ${c.lastName?.[0]}.`),
                datasets: [{
                  label: 'Total Balance',
                  data: customers.slice(0, 8).map(c => c.accounts.reduce((s, a) => s + a.balance, 0)),
                  backgroundColor: 'rgba(13, 150, 104, 0.7)',
                  borderRadius: 6,
                  barPercentage: 0.6,
                }],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    callbacks: { label: (ctx) => `Balance: ${formatCurrency(ctx.raw)}` },
                    backgroundColor: '#1A1D26',
                    padding: 12,
                    cornerRadius: 8,
                  },
                },
                scales: {
                  x: { beginAtZero: true, ticks: { callback: v => `\u20b9${(v/1000).toFixed(0)}k`, font: { size: 11, family: 'Inter' } }, grid: { color: 'rgba(0,0,0,0.04)' } },
                  y: { grid: { display: false }, ticks: { font: { size: 11, family: 'Inter' } } },
                },
              }}
            />
          </div>
        </Card>
      </div>

      {/* Customer list */}
      <section className="section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h2 className="section-title" style={{ margin: 0 }}>
            {filterFrozen ? 'Customers with Frozen Accounts' : 'Assigned Customers'}
          </h2>
          {filterFrozen && (
            <Button variant="ghost" size="sm" onClick={() => setFilterFrozen(false)}>
              Clear Filter
            </Button>
          )}
        </div>
        <Card padding="none">
          <div className="tx-list">
            {displayedCustomers.map((cust) => {
              const totalBal = cust.accounts.reduce((s, a) => s + a.balance, 0);
              const hasFrozen = cust.accounts.some((a) => a.isFrozen);

              return (
                <div
                  key={cust._id}
                  className="tx-row"
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/employee/customers/${cust._id}`)}
                >
                  <div className="tx-row__icon-wrap" data-type="received" style={{ background: 'var(--color-info-light)', color: 'var(--color-info)' }}>
                    <span style={{ fontWeight: 700, fontSize: '14px' }}>
                      {cust.firstName?.[0]}{cust.lastName?.[0]}
                    </span>
                  </div>
                  <div className="tx-row__info">
                    <span className="tx-row__name">{cust.firstName} {cust.lastName}</span>
                    <span className="tx-row__desc">{cust.email} · {cust.accounts.length} account(s)</span>
                  </div>
                  <div className="tx-row__meta">
                    <span className="tx-row__amount" style={{ color: 'var(--color-text-primary)' }}>
                      {formatCurrency(totalBal)}
                    </span>
                  </div>
                  <div className="tx-row__status">
                    {hasFrozen ? (
                      <Badge variant="danger">Has Frozen</Badge>
                    ) : (
                      <Badge variant="success">Active</Badge>
                    )}
                  </div>
                </div>
              );
            })}
            {displayedCustomers.length === 0 && (
              <div className="tx-list__empty">
                {filterFrozen ? 'No customers have frozen accounts.' : 'No customers assigned.'}
              </div>
            )}
          </div>
        </Card>
      </section>

      {/* Deposits Breakdown Modal */}
      <Modal
        isOpen={showDepositsModal}
        onClose={() => setShowDepositsModal(false)}
        title="Branch Deposits Breakdown"
      >
        <div style={{ padding: '8px 0' }}>
          <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '20px' }}>
            Liquidity breakdown across Savings, Current, and Fixed Deposits in your branch:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '4px' }}>
                <span><strong>Savings Deposits</strong></span>
                <span>{formatCurrency(savingsTotal)}</span>
              </div>
              <div style={{ height: '8px', background: 'var(--color-bg)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', background: 'var(--color-accent)', width: `${totalDeposits > 0 ? (savingsTotal / totalDeposits) * 100 : 0}%` }}></div>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '4px' }}>
                <span><strong>Current Deposits</strong></span>
                <span>{formatCurrency(currentTotal)}</span>
              </div>
              <div style={{ height: '8px', background: 'var(--color-bg)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', background: '#6366f1', width: `${totalDeposits > 0 ? (currentTotal / totalDeposits) * 100 : 0}%` }}></div>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '4px' }}>
                <span><strong>Fixed Deposits (FD)</strong></span>
                <span>{formatCurrency(fdTotal)}</span>
              </div>
              <div style={{ height: '8px', background: 'var(--color-bg)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', background: '#0284c7', width: `${totalDeposits > 0 ? (fdTotal / totalDeposits) * 100 : 0}%` }}></div>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
