import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import apiClient from '../../api/client';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { formatDate } from '../../utils/format';
import './CustomerProfile.css';

export default function CustomerProfile() {
  const { user, refreshUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Password change
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' });

  // Data Consent States
  const [consents, setConsents] = useState([]);
  const [consentLoading, setConsentLoading] = useState(true);

  const fetchConsents = async () => {
    try {
      const res = await apiClient.get('/customer/consents');
      setConsents(res.data.consents || []);
    } catch (err) {
      console.error('Fetch consents error:', err);
    } finally {
      setConsentLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchConsents();
  }, []);

  const handleRevokeConsent = async (consentId) => {
    try {
      await apiClient.post(`/customer/consents/${consentId}/revoke`);
      fetchConsents();
    } catch (err) {
      console.error('Revoke consent error:', err);
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await apiClient.get('/customer/profile');
      setProfile(res.data.profile);
      setEditData({
        firstName: res.data.profile.firstName || '',
        lastName: res.data.profile.lastName || '',
        phone: res.data.profile.phone || '',
        address: res.data.profile.address || '',
        dateOfBirth: res.data.profile.dateOfBirth
          ? new Date(res.data.profile.dateOfBirth).toISOString().split('T')[0]
          : '',
      });
    } catch (err) {
      console.error('Fetch profile error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const res = await apiClient.patch('/customer/profile', editData);
      setProfile(res.data.profile);
      setEditing(false);
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      refreshUser();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to update profile.' });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordMsg({ type: '', text: '' });
    try {
      const res = await apiClient.patch('/auth/change-password', passwordData);
      setPasswordMsg({ type: 'success', text: res.data.message });
      setPasswordData({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
      setTimeout(() => setShowPasswordModal(false), 1500);
    } catch (err) {
      setPasswordMsg({ type: 'error', text: err.response?.data?.message || 'Failed to change password.' });
    } finally {
      setPasswordLoading(false);
    }
  };

  if (loading) {
    return <div className="page-loading"><div className="loading-screen__spinner" /></div>;
  }

  return (
    <div className="profile-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Profile</h1>
          <p className="page-subtitle">Manage your personal information and security settings</p>
        </div>
        <div className="page-header__actions">
          {editing ? (
            <>
              <Button variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
              <Button variant="primary" isLoading={saving} onClick={handleSave}>Save Changes</Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setShowPasswordModal(true)}>Change Password</Button>
              <Button variant="primary" onClick={() => setEditing(true)}>Edit Profile</Button>
            </>
          )}
        </div>
      </div>

      {message.text && (
        <div className={`profile-alert profile-alert--${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="profile-layout">
        {/* Profile Card */}
        <Card className="profile-card">
          <div className="profile-avatar-section">
            <div className="profile-avatar">
              {profile?.firstName?.[0]}{profile?.lastName?.[0]}
            </div>
            <div className="profile-name-section">
              <h2>{profile?.firstName} {profile?.lastName}</h2>
              <Badge variant="info" size="md">Customer</Badge>
              {profile?.googleId && (
                <Badge variant="success" size="sm" style={{ marginLeft: 8 }}>Google Linked</Badge>
              )}
            </div>
          </div>

          <div className="profile-details">
            <div className="profile-field">
              <label>Email Address</label>
              <span className="profile-field__value">{profile?.email}</span>
            </div>

            <div className="profile-field">
              <label>First Name</label>
              {editing ? (
                <input
                  value={editData.firstName}
                  onChange={(e) => setEditData(p => ({ ...p, firstName: e.target.value }))}
                />
              ) : (
                <span className="profile-field__value">{profile?.firstName || '—'}</span>
              )}
            </div>

            <div className="profile-field">
              <label>Last Name</label>
              {editing ? (
                <input
                  value={editData.lastName}
                  onChange={(e) => setEditData(p => ({ ...p, lastName: e.target.value }))}
                />
              ) : (
                <span className="profile-field__value">{profile?.lastName || '—'}</span>
              )}
            </div>

            <div className="profile-field">
              <label>Date of Birth</label>
              {editing ? (
                <input
                  type="date"
                  value={editData.dateOfBirth}
                  onChange={(e) => setEditData(p => ({ ...p, dateOfBirth: e.target.value }))}
                />
              ) : (
                <span className="profile-field__value">
                  {profile?.dateOfBirth ? formatDate(profile.dateOfBirth) : '—'}
                </span>
              )}
            </div>

            <div className="profile-field">
              <label>Phone Number</label>
              {editing ? (
                <input
                  type="tel"
                  value={editData.phone}
                  onChange={(e) => setEditData(p => ({ ...p, phone: e.target.value }))}
                  placeholder="+91 9876543210"
                />
              ) : (
                <span className="profile-field__value">{profile?.phone || '—'}</span>
              )}
            </div>

            <div className="profile-field profile-field--full">
              <label>Address</label>
              {editing ? (
                <textarea
                  value={editData.address}
                  onChange={(e) => setEditData(p => ({ ...p, address: e.target.value }))}
                  placeholder="Your residential address"
                  rows={2}
                />
              ) : (
                <span className="profile-field__value">{profile?.address || '—'}</span>
              )}
            </div>
          </div>
        </Card>

        {/* Account Info */}
        <Card className="profile-sidebar-card">
          <h3>Account Information</h3>
          <div className="profile-info-list">
            <div className="profile-info-row">
              <span className="profile-info-label">Member Since</span>
              <span className="profile-info-value">{profile?.createdAt ? formatDate(profile.createdAt) : '—'}</span>
            </div>
            <div className="profile-info-row">
              <span className="profile-info-label">Total Accounts</span>
              <span className="profile-info-value">{profile?.accounts?.length || 0}</span>
            </div>
            <div className="profile-info-row">
              <span className="profile-info-label">Branch</span>
              <span className="profile-info-value">{profile?.assignedBranchId?.name || '—'}</span>
            </div>
            <div className="profile-info-row">
              <span className="profile-info-label">Relationship Manager</span>
              <span className="profile-info-value">
                {profile?.assignedEmployeeId
                  ? `${profile.assignedEmployeeId.firstName} ${profile.assignedEmployeeId.lastName}`
                  : '—'}
              </span>
            </div>
            <div className="profile-info-row">
              <span className="profile-info-label">Account Status</span>
              <Badge variant={profile?.isActive ? 'success' : 'danger'} size="sm">
                {profile?.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>
        </Card>
      </div>

      {/* Account Aggregator Data Consent History Log */}
      <Card style={{ marginTop: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>RBI Account Aggregator - Data Consent History</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
              Manage permissions granted to managers and credit underwriters to review your financial logs.
            </p>
          </div>
          <Badge variant="info" size="md">RBI Consent-based Architecture</Badge>
        </div>

        {consentLoading ? (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>Loading consent history...</div>
        ) : consents.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-secondary)', fontStyle: 'italic', fontSize: '14px' }}>
            No data sharing consents logged.
          </div>
        ) : (
          <div className="consent-table-container" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-secondary)', fontWeight: '600' }}>
                  <th style={{ padding: '10px 8px' }}>Requester</th>
                  <th style={{ padding: '10px 8px' }}>Purpose</th>
                  <th style={{ padding: '10px 8px' }}>Data Scope</th>
                  <th style={{ padding: '10px 8px' }}>Status</th>
                  <th style={{ padding: '10px 8px' }}>Access Period</th>
                  <th style={{ padding: '10px 8px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {consents.map(consent => {
                  const requesterName = consent.requestedBy 
                    ? `${consent.requestedBy.firstName} ${consent.requestedBy.lastName} (${consent.requestedBy.role})`
                    : 'System / Customer Init';
                  
                  const scopeLabels = consent.dataScope.map(s => {
                    if (s === 'transactions_6m') return '6-Month History';
                    if (s === 'account_summary') return 'Account Summary';
                    return s;
                  }).join(', ');

                  let statusVariant = 'info';
                  if (consent.status === 'granted') statusVariant = 'success';
                  if (consent.status === 'denied') statusVariant = 'danger';
                  if (consent.status === 'revoked') statusVariant = 'warning';
                  if (consent.status === 'expired') statusVariant = 'secondary';

                  return (
                    <tr key={consent._id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '12px 8px', fontWeight: '500' }}>{requesterName}</td>
                      <td style={{ padding: '12px 8px' }}>{consent.purpose}</td>
                      <td style={{ padding: '12px 8px', color: 'var(--color-text-secondary)', fontSize: '12.5px' }}>{scopeLabels}</td>
                      <td style={{ padding: '12px 8px' }}>
                        <Badge variant={statusVariant} size="sm">{consent.status.toUpperCase()}</Badge>
                      </td>
                      <td style={{ padding: '12px 8px', fontSize: '12.5px', color: 'var(--color-text-secondary)' }}>
                        {consent.status === 'granted' ? (
                          <>Until {new Date(consent.expiresAt).toLocaleDateString('en-IN')}</>
                        ) : consent.grantedAt ? (
                          <>Granted {new Date(consent.grantedAt).toLocaleDateString('en-IN')}</>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                        {consent.status === 'granted' && (
                          <Button 
                            variant="danger" 
                            size="sm" 
                            onClick={() => handleRevokeConsent(consent._id)}
                          >
                            Revoke
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Password Change Modal */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => { setShowPasswordModal(false); setPasswordMsg({ type: '', text: '' }); }}
        title="Change Password"
      >
        <form onSubmit={handlePasswordChange} className="password-form">
          {passwordMsg.text && (
            <div className={`profile-alert profile-alert--${passwordMsg.type}`}>
              {passwordMsg.text}
            </div>
          )}
          <div className="password-field">
            <label htmlFor="current-password">Current Password</label>
            <input
              id="current-password"
              type="password"
              value={passwordData.currentPassword}
              onChange={(e) => setPasswordData(p => ({ ...p, currentPassword: e.target.value }))}
              required
            />
          </div>
          <div className="password-field">
            <label htmlFor="new-password">New Password</label>
            <input
              id="new-password"
              type="password"
              value={passwordData.newPassword}
              onChange={(e) => setPasswordData(p => ({ ...p, newPassword: e.target.value }))}
              required
              minLength={6}
            />
          </div>
          <div className="password-field">
            <label htmlFor="confirm-new-password">Confirm New Password</label>
            <input
              id="confirm-new-password"
              type="password"
              value={passwordData.confirmNewPassword}
              onChange={(e) => setPasswordData(p => ({ ...p, confirmNewPassword: e.target.value }))}
              required
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
            <Button type="button" variant="secondary" onClick={() => setShowPasswordModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary" isLoading={passwordLoading}>Update Password</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
