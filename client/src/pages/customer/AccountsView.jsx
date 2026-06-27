import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import apiClient from '../../api/client';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Table from '../../components/ui/Table';
import { formatCurrency, formatDate } from '../../utils/format';
import './AccountsView.css';

export default function AccountsView() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [loading, setLoading] = useState(true);

  // Statement date filtering states
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');
  const [filterLoading, setFilterLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [accRes, txRes] = await Promise.all([
          apiClient.get('/customer/accounts'),
          apiClient.get('/customer/transactions'),
        ]);
        setAccounts(accRes.data.accounts);
        setTransactions(txRes.data.transactions);
        if (accRes.data.accounts.length > 0) {
          setSelectedAccount(accRes.data.accounts[0].accountNumber);
        }
      } catch (err) {
        console.error('Accounts fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const currentAccount = accounts.find((a) => a.accountNumber === selectedAccount);
  const filteredTx = transactions.filter(
    (tx) =>
      tx.senderAccountNum === selectedAccount ||
      tx.receiverAccountNum === selectedAccount
  );

  const fetchTransactions = async (start = '', end = '') => {
    setFilterLoading(true);
    try {
      const res = await apiClient.get('/customer/transactions', {
        params: { startDate: start, endDate: end }
      });
      setTransactions(res.data.transactions);
    } catch (err) {
      console.error('Transactions fetch error:', err);
    } finally {
      setFilterLoading(false);
    }
  };

  const handleApplyFilter = () => {
    fetchTransactions(filterStart, filterEnd);
  };

  const handleClearFilter = () => {
    setFilterStart('');
    setFilterEnd('');
    fetchTransactions('', '');
  };

  const handleExportCSV = () => {
    const headers = ['Date', 'Type', 'Counterparty', 'Description', 'Amount', 'Status'];
    const rows = filteredTx.map(tx => {
      const isSender = tx.senderUserId?._id === user?._id;
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
    link.setAttribute("download", `statement_${selectedAccount}_${filterStart || 'all'}_to_${filterEnd || 'all'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const txColumns = [
    {
      key: 'date',
      label: 'Date',
      width: '120px',
      render: (row) => formatDate(row.createdAt),
    },
    {
      key: 'type',
      label: 'Type',
      width: '100px',
      render: (row) => {
        const isSender = row.senderUserId?._id === user?._id;
        return (
          <span style={{ fontWeight: 500, color: isSender ? 'var(--color-danger)' : 'var(--color-accent)' }}>
            {isSender ? 'Sent' : 'Received'}
          </span>
        );
      },
    },
    {
      key: 'counterparty',
      label: 'Counterparty',
      render: (row) => {
        const isSender = row.senderUserId?._id === user?._id;
        const cp = isSender ? row.receiverUserId : row.senderUserId;
        return cp ? `${cp.firstName} ${cp.lastName}` : '—';
      },
    },
    {
      key: 'description',
      label: 'Description',
      render: (row) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ color: 'var(--color-text-secondary)' }}>
            {row.description || '—'}
          </span>
          {row.status === 'rejected' && row.rejectionReason && (
            <span style={{ fontSize: '11px', color: 'var(--color-danger)', fontWeight: '500', marginTop: '2px' }}>
              Reason: {row.rejectionReason}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'amount',
      label: 'Amount',
      width: '130px',
      render: (row) => {
        const isSender = row.senderUserId?._id === user?._id;
        return (
          <span style={{ fontWeight: 700, color: isSender ? 'var(--color-text-primary)' : 'var(--color-accent)' }}>
            {isSender ? '-' : '+'}{formatCurrency(row.amount)}
          </span>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      width: '100px',
      render: (row) => (
        <Badge
          variant={
            row.status === 'completed' ? 'success' :
            row.status === 'pending' ? 'warning' : 'danger'
          }
        >
          {row.status}
        </Badge>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="page-loading">
        <div className="loading-screen__spinner" />
      </div>
    );
  }

  return (
    <div className="accounts-view">
      <div className="page-header">
        <h1 className="page-title">Accounts</h1>
        <p className="page-subtitle">Manage your checking and savings accounts</p>
      </div>

      {/* Account Selector Tabs */}
      <div className="account-tabs">
        {accounts.map((acc) => (
          <button
            key={acc._id}
            className={`account-tab ${selectedAccount === acc.accountNumber ? 'account-tab--active' : ''}`}
            onClick={() => setSelectedAccount(acc.accountNumber)}
          >
            <span className="account-tab__type">
              {acc.accountType.charAt(0).toUpperCase() + acc.accountType.slice(1)}
            </span>
            <span className="account-tab__balance">{formatCurrency(acc.balance)}</span>
            <span className="account-tab__num">{acc.accountNumber}</span>
            {acc.isFrozen && <Badge variant="danger" size="sm">Frozen</Badge>}
          </button>
        ))}
      </div>

      {/* Selected Account Detail */}
      {currentAccount && (
        <Card className="account-detail">
          <div className="account-detail__header">
            <div>
              <span className="account-detail__label">
                {currentAccount.accountType.charAt(0).toUpperCase() + currentAccount.accountType.slice(1)} Account
              </span>
              <div className="account-detail__balance">
                {formatCurrency(currentAccount.balance)}
              </div>
            </div>
            <div className="account-detail__meta">
              <span className="account-detail__num-label">Account Number</span>
              <span className="account-detail__num">{currentAccount.accountNumber}</span>
              <div style={{ marginTop: '8px' }}>
                {currentAccount.isFrozen ? (
                  <Badge variant="danger">Frozen</Badge>
                ) : (
                  <Badge variant="success">Active</Badge>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Transaction History */}
      <section className="section">
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 'var(--space-4)',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <h2 className="section-title" style={{ margin: 0 }}>Transaction History</h2>
          
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
              disabled={filteredTx.length === 0}
            >
              📥 Download Statement
            </Button>
          </div>
        </div>

        <Table
          columns={txColumns}
          data={filteredTx}
          emptyMessage="No transactions matching selection criteria."
        />
      </section>
    </div>
  );
}
