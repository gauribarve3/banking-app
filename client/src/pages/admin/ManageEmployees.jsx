import { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Table from '../../components/ui/Table';
import { formatCurrency } from '../../utils/format';
import './ManageEmployees.css';

export default function ManageEmployees() {
  const [employees, setEmployees] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editModalEmployee, setEditModalEmployee] = useState(null); // Employee being edited
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', password: '', assignedBranchId: '', salary: '65000',
  });
  const [editFormData, setEditFormData] = useState({
    assignedBranchId: '', salary: '',
  });
  const [formError, setFormError] = useState('');
  const [editFormError, setEditFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const fetchData = async () => {
    try {
      const [empRes, brRes] = await Promise.all([
        apiClient.get('/admin/employees'),
        apiClient.get('/admin/branches'),
      ]);
      setEmployees(empRes.data.employees);
      setBranches(brRes.data.branches);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);

    try {
      await apiClient.post('/admin/employees', formData);
      setShowModal(false);
      setFormData({ firstName: '', lastName: '', email: '', password: '', assignedBranchId: '', salary: '65000' });
      await fetchData();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to create employee.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditEmployee = async (e) => {
    e.preventDefault();
    setEditFormError('');
    setFormLoading(true);

    try {
      await apiClient.patch(`/admin/employees/${editModalEmployee._id}`, editFormData);
      setEditModalEmployee(null);
      await fetchData();
    } catch (err) {
      setEditFormError(err.response?.data?.message || 'Failed to update employee.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeactivate = async (id) => {
    if (!confirm('Are you sure you want to deactivate this employee?')) return;
    try {
      await apiClient.delete(`/admin/employees/${id}`);
      await fetchData();
    } catch (err) {
      console.error('Deactivate error:', err);
    }
  };

  const openEditModal = (emp) => {
    setEditModalEmployee(emp);
    setEditFormData({
      assignedBranchId: emp.assignedBranchId?._id || '',
      salary: emp.salary || '65000',
    });
  };

  const columns = [
    {
      key: 'name',
      label: 'Name',
      render: (r) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '34px', height: '34px', borderRadius: '8px',
            background: 'var(--color-accent-light)', color: 'var(--color-accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: '12px', flexShrink: 0,
          }}>
            {r.firstName?.[0]}{r.lastName?.[0]}
          </div>
          <div>
            <div style={{ fontWeight: 600 }}>{r.firstName} {r.lastName}</div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>{r.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'branch',
      label: 'Branch Location',
      render: (r) => r.assignedBranchId?.name || '—',
    },
    {
      key: 'salary',
      label: 'Monthly Salary',
      render: (r) => formatCurrency(r.salary || 65000),
    },
    {
      key: 'status',
      label: 'Status',
      width: '100px',
      render: (r) => (
        <Badge variant={r.isActive ? 'success' : 'danger'}>
          {r.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      width: '200px',
      render: (r) => r.isActive ? (
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="secondary" size="sm" onClick={() => openEditModal(r)}>
            Edit Profile
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDeactivate(r._id)}>
            Deactivate
          </Button>
        </div>
      ) : null,
    },
  ];

  if (loading) {
    return <div className="page-loading"><div className="loading-screen__spinner" /></div>;
  }

  return (
    <div className="manage-employees">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Employees & Managers</h1>
          <p className="page-subtitle">Manage salaries, branch locations, and relationship managers</p>
        </div>
        <Button variant="primary" onClick={() => setShowModal(true)}>
          + Add Employee
        </Button>
      </div>

      <Table columns={columns} data={employees} emptyMessage="No employees found." />

      {/* Create Employee Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setFormError(''); }}
        title="New Employee"
        maxWidth="520px"
      >
        <form onSubmit={handleCreateEmployee} className="modal-form">
          {formError && (
            <div className="transfer-error">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M8 5v3M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              {formError}
            </div>
          )}

          <div className="modal-form__row">
            <Input
              id="emp-first"
              label="First Name"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              required
            />
            <Input
              id="emp-last"
              label="Last Name"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              required
            />
          </div>

          <Input
            id="emp-email"
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />

          <Input
            id="emp-password"
            label="Password"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
          />

          <Input
            id="emp-salary"
            label="Monthly Salary (INR)"
            type="number"
            value={formData.salary}
            onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
            required
          />

          <div className="input-group">
            <label className="input-group__label" htmlFor="emp-branch">Assign Branch</label>
            <select
              id="emp-branch"
              className="transfer-select"
              value={formData.assignedBranchId}
              onChange={(e) => setFormData({ ...formData, assignedBranchId: e.target.value })}
              style={{ width: '100%', padding: '10px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}
            >
              <option value="">— No branch —</option>
              {branches.map((b) => (
                <option key={b._id} value={b._id}>{b.name} ({b.code})</option>
              ))}
            </select>
          </div>

          <Button type="submit" variant="primary" fullWidth isLoading={formLoading}>
            Create Employee
          </Button>
        </form>
      </Modal>

      {/* Edit Employee Modal */}
      <Modal
        isOpen={!!editModalEmployee}
        onClose={() => { setEditModalEmployee(null); setEditFormError(''); }}
        title={editModalEmployee ? `Edit Profile: ${editModalEmployee.firstName} ${editModalEmployee.lastName}` : 'Edit Profile'}
        maxWidth="520px"
      >
        <form onSubmit={handleEditEmployee} className="modal-form">
          {editFormError && (
            <div className="transfer-error">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M8 5v3M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              {editFormError}
            </div>
          )}

          <Input
            id="edit-salary"
            label="Monthly Salary (INR)"
            type="number"
            value={editFormData.salary}
            onChange={(e) => setEditFormData({ ...editFormData, salary: e.target.value })}
            required
          />

          <div className="input-group">
            <label className="input-group__label" htmlFor="edit-branch">Transfer Branch Location</label>
            <select
              id="edit-branch"
              className="transfer-select"
              value={editFormData.assignedBranchId}
              onChange={(e) => setEditFormData({ ...editFormData, assignedBranchId: e.target.value })}
              style={{ width: '100%', padding: '10px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}
            >
              <option value="">— No branch —</option>
              {branches.map((b) => (
                <option key={b._id} value={b._id}>{b.name} ({b.code})</option>
              ))}
            </select>
          </div>

          <Button type="submit" variant="primary" fullWidth isLoading={formLoading}>
            Save Changes
          </Button>
        </form>
      </Modal>
    </div>
  );
}
