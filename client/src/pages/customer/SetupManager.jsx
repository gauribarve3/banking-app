import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import apiClient from '../../api/client';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import './SetupManager.css';

export default function SetupManager() {
  const { refreshUser } = useAuth();
  const navigate = useNavigate();
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchManagers = async () => {
      try {
        const res = await apiClient.get('/customer/managers');
        setManagers(res.data.managers || []);
      } catch (err) {
        console.error('Fetch managers error:', err);
        setError('Failed to load bank branch managers. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchManagers();
  }, []);

  const handleSelectManager = async (managerId) => {
    setSelecting(managerId);
    setError('');
    try {
      await apiClient.patch('/customer/assign-manager', { employeeId: managerId });
      await refreshUser(); // Update client auth context user object
      navigate('/customer/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to select manager. Please try again.');
    } finally {
      setSelecting('');
    }
  };

  if (loading) {
    return (
      <div className="setup-manager-loading">
        <div className="loading-screen__spinner" />
        <p>Loading active branch managers...</p>
      </div>
    );
  }

  return (
    <div className="setup-manager-page">
      <div className="setup-manager-container">
        <header className="setup-header">
          <div className="setup-logo">🏦 VaultBank</div>
          <h1>Select Your Relationship Officer</h1>
          <p>Choose the branch manager who invited you or recommended VaultBank to activate your account profile.</p>
        </header>

        {error && <div className="setup-error">{error}</div>}

        <div className="manager-cards-grid">
          {managers.map((manager) => (
            <Card key={manager._id} className="manager-select-card">
              <div className="manager-card-avatar">
                {manager.firstName[0]}{manager.lastName[0]}
              </div>
              <div className="manager-card-info">
                <h3>{manager.firstName} {manager.lastName}</h3>
                <span className="manager-badge">Branch Manager</span>
                <p className="manager-email">📧 {manager.email}</p>
                <div className="manager-branch-details">
                  <strong>📍 {manager.assignedBranchId?.name || 'Local Branch'}</strong>
                  <p>{manager.assignedBranchId?.location || 'Branch Location Info'}</p>
                </div>
              </div>
              <div className="manager-card-action">
                <Button
                  variant="primary"
                  fullWidth
                  onClick={() => handleSelectManager(manager._id)}
                  isLoading={selecting === manager._id}
                >
                  Select & Activate Account
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
