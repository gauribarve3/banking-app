import { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Table from '../../components/ui/Table';
import { formatDate } from '../../utils/format';
import './ManageEmployees.css';

export default function BranchManagement() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', code: '', location: '' });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const fetchBranches = async () => {
    try {
      const res = await apiClient.get('/admin/branches');
      setBranches(res.data.branches);
    } catch (err) {
      console.error('Fetch branches error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  const handleCreateBranch = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);

    try {
      await apiClient.post('/admin/branches', formData);
      setShowModal(false);
      setFormData({ name: '', code: '', location: '' });
      await fetchBranches();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to create branch.');
    } finally {
      setFormLoading(false);
    }
  };

  const columns = [
    { key: 'name', label: 'Branch Name', render: (r) => <span style={{ fontWeight: 600 }}>{r.name}</span> },
    {
      key: 'code', label: 'Code', width: '120px',
      render: (r) => (
        <span style={{ fontFamily: 'monospace', fontWeight: 500, color: 'var(--color-accent)' }}>
          {r.code}
        </span>
      ),
    },
    { key: 'location', label: 'Location', render: (r) => <span style={{ color: 'var(--color-text-secondary)' }}>{r.location || '—'}</span> },
    { key: 'employees', label: 'Employees', width: '100px', render: (r) => r.employeeCount || 0 },
    {
      key: 'created', label: 'Created', width: '120px',
      render: (r) => <span style={{ color: 'var(--color-text-tertiary)' }}>{formatDate(r.createdAt)}</span>,
    },
  ];

  if (loading) {
    return <div className="page-loading"><div className="loading-screen__spinner" /></div>;
  }

  return (
    <div className="branch-management">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Branches</h1>
          <p className="page-subtitle">Manage branch locations</p>
        </div>
        <Button variant="primary" onClick={() => setShowModal(true)}>
          + Create Branch
        </Button>
      </div>

      <Table columns={columns} data={branches} emptyMessage="No branches found." />

      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setFormError(''); }}
        title="New Branch"
        maxWidth="480px"
      >
        <form onSubmit={handleCreateBranch} className="modal-form">
          {formError && (
            <div className="transfer-error">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M8 5v3M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              {formError}
            </div>
          )}

          <Input
            id="branch-name"
            label="Branch Name"
            placeholder="e.g. Downtown Main"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <Input
            id="branch-code"
            label="Branch Code"
            placeholder="e.g. DTM-001"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            required
          />

          <Input
            id="branch-location"
            label="Location"
            placeholder="e.g. 100 Financial District, New York"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          />

          <Button type="submit" variant="primary" fullWidth isLoading={formLoading}>
            Create Branch
          </Button>
        </form>
      </Modal>
    </div>
  );
}
