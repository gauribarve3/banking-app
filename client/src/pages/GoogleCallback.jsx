import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function GoogleCallback() {
  const [searchParams] = useSearchParams();
  const { loginWithToken } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    const processCallback = async () => {
      const token = searchParams.get('token');
      if (!token) {
        setError('No authentication token found in callback URL.');
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      try {
        const user = await loginWithToken(token);
        const roleHome = {
          customer: '/customer/dashboard',
          employee: '/employee/dashboard',
          admin: '/admin/dashboard',
        };
        navigate(roleHome[user.role] || '/');
      } catch (err) {
        console.error('Google login processing failed:', err);
        setError('Failed to complete Google authentication. Redirecting...');
        setTimeout(() => navigate('/login'), 3000);
      }
    };

    processCallback();
  }, [searchParams, loginWithToken, navigate]);

  return (
    <div className="loading-screen" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'var(--color-bg-primary)',
      gap: '16px'
    }}>
      <div className="loading-screen__spinner" />
      <h2 style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>Completing secure sign-in...</h2>
      {error && <p style={{ color: 'var(--color-danger)', fontWeight: 500 }}>{error}</p>}
    </div>
  );
}
