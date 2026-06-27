import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Table from '../../components/ui/Table';
import { formatCurrency, formatDate } from '../../utils/format';
import './CustomerLedger.css';

export default function CustomerLedger() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [freezeLoading, setFreezeLoading] = useState('');

  // Statement date filtering states
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');
  const [filterLoading, setFilterLoading] = useState(false);

  const fetchData = async (start = '', end = '') => {
    if (start || end) {
      setFilterLoading(true);
    }
    try {
      const res = await apiClient.get(`/employee/customers/${id}/ledger`, {
        params: { startDate: start, endDate: end }
      });
      setCustomer(res.data.customer);
      setTransactions(res.data.transactions);
    } catch (err) {
      console.error('Ledger fetch error:', err);
    } finally {
      setLoading(false);
      setFilterLoading(false);
    }
  };

  const handleApplyFilter = () => {
    fetchData(filterStart, filterEnd);
  };

  const handleClearFilter = () => {
    setFilterStart('');
    setFilterEnd('');
    fetchData('', '');
  };

  const handleExportCSV = () => {
    const headers = ['Date', 'Type', 'Counterparty', 'Note', 'Amount', 'Status'];
    const rows = transactions.map(tx => {
      const isSender = tx.senderUserId?._id === id;
      const type = isSender ? 'Debit/Sent' : 'Credit/Received';
      const cp = isSender ? tx.receiverUserId : tx.senderUserId;
      const counterparty = cp ? `${cp.firstName} ${cp.lastName}` : '—';
      const date = new Date(tx.createdAt).toLocaleDateString('en-IN');
      const amount = (isSender ? '-' : '+') + tx.amount;
      return [date, type, counterparty, tx.description || '—', amount, tx.status];
    });

    const csvString = [headers.join(','), ...rows.map(e => e.map(val => `"${val.toString().replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `ledger_${customer?.firstName || 'customer'}_${customer?.lastName || 'ledger'}_${filterStart || 'all'}_to_${filterEnd || 'all'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleToggleFreeze = async (accountNumber, currentlyFrozen) => {
    setFreezeLoading(accountNumber);
    try {
      await apiClient.patch(`/employee/customers/${id}/freeze`, {
        accountNumber,
        frozen: !currentlyFrozen,
      });
      await fetchData();
    } catch (err) {
      console.error('Toggle freeze error:', err);
    } finally {
      setFreezeLoading('');
    }
  };

  const txColumns = [
    { key: 'date', label: 'Date', width: '120px', render: (r) => formatDate(r.createdAt) },
    {
      key: 'direction', label: 'Direction', width: '90px',
      render: (r) => {
        const isSender = r.senderUserId?._id === id;
        return (
          <span style={{ fontWeight: 500, color: isSender ? 'var(--color-danger)' : 'var(--color-accent)' }}>
            {isSender ? 'Sent' : 'Received'}
          </span>
        );
      },
    },
    {
      key: 'counterparty', label: 'Counterparty',
      render: (r) => {
        const isSender = r.senderUserId?._id === id;
        const cp = isSender ? r.receiverUserId : r.senderUserId;
        return cp ? `${cp.firstName} ${cp.lastName}` : '—';
      },
    },
    { key: 'description', label: 'Note', render: (r) => <span style={{ color: 'var(--color-text-secondary)' }}>{r.description || '—'}</span> },
    {
      key: 'amount', label: 'Amount', width: '130px',
      render: (r) => <span style={{ fontWeight: 700 }}>{formatCurrency(r.amount)}</span>,
    },
    {
      key: 'status', label: 'Status', width: '100px',
      render: (r) => (
        <Badge variant={r.status === 'completed' ? 'success' : r.status === 'pending' ? 'warning' : 'danger'}>
          {r.status}
        </Badge>
      ),
    },
  ];

  if (loading) {
    return <div className="page-loading"><div className="loading-screen__spinner" /></div>;
  }

  if (!customer) {
    return <div className="page-loading">Customer not found.</div>;
  }

  return (
    <div className="customer-ledger">
      <button className="back-link" onClick={() => navigate('/employee/dashboard')}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Back to Dashboard
      </button>

      {/* Customer Profile */}
      <Card className="ledger-profile">
        <div className="ledger-profile__header">
          <div className="ledger-profile__avatar">
            {customer.firstName?.[0]}{customer.lastName?.[0]}
          </div>
          <div className="ledger-profile__info">
            <h1 className="ledger-profile__name">{customer.firstName} {customer.lastName}</h1>
            <p className="ledger-profile__email">{customer.email}</p>
          </div>
        </div>

        <div className="ledger-accounts">
          {customer.accounts.map((acc) => (
            <div key={acc._id} className="ledger-account">
              <div className="ledger-account__info">
                <span className="ledger-account__type">
                  {acc.accountType.charAt(0).toUpperCase() + acc.accountType.slice(1)}
                </span>
                <span className="ledger-account__num">{acc.accountNumber}</span>
              </div>
              <div className="ledger-account__balance">{formatCurrency(acc.balance)}</div>
              <div className="ledger-account__actions">
                <Badge variant={acc.isFrozen ? 'danger' : 'success'}>
                  {acc.isFrozen ? 'Frozen' : 'Active'}
                </Badge>
                <Button
                  variant={acc.isFrozen ? 'primary' : 'danger'}
                  size="sm"
                  isLoading={freezeLoading === acc.accountNumber}
                  onClick={() => handleToggleFreeze(acc.accountNumber, acc.isFrozen)}
                >
                  {acc.isFrozen ? 'Unfreeze' : 'Freeze'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Transaction Ledger */}
      <section className="section">
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 'var(--space-4)',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <h2 className="section-title" style={{ margin: 0 }}>Transaction Ledger</h2>
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
            background: 'var(--color-bg-card)',
            padding: '8px 16px',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border-light)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>From:</span>
              <input
                type="date"
                value={filterStart}
                onChange={(e) => setFilterStart(e.target.value)}
                style={{
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-bg-primary)',
                  color: 'var(--color-text-primary)',
                  fontSize: '12px',
                  outline: 'none'
                }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>To:</span>
              <input
                type="date"
                value={filterEnd}
                onChange={(e) => setFilterEnd(e.target.value)}
                style={{
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-bg-primary)',
                  color: 'var(--color-text-primary)',
                  fontSize: '12px',
                  outline: 'none'
                }}
              />
            </div>
            <Button
              size="sm"
              onClick={handleApplyFilter}
              isLoading={filterLoading}
            >
              Filter
            </Button>
            {(filterStart || filterEnd) && (
              <Button
                size="sm"
                variant="secondary"
                onClick={handleClearFilter}
              >
                Clear
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportCSV}
              disabled={transactions.length === 0}
            >
              📥 Download Statement
            </Button>
          </div>
        </div>

        <Table columns={txColumns} data={transactions} emptyMessage="No transactions matching selection criteria." />
      </section>
    </div>
  );
}
