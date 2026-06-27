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

  useEffect(() => {
    fetchProfile();
  }, []);

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
