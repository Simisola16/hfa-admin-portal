import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Shield, KeyRound, CheckCircle } from 'lucide-react';

export default function AdminResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) return toast.error('Passwords do not match');
    if (password.length < 6) return toast.error('Password must be at least 6 characters');
    setLoading(true);
    try {
      await api.post('/api/auth/reset-password', { token, password });
      setSuccess(true);
      toast.success('Password reset successfully!');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}>
        <div style={{ background: 'white', borderRadius: 20, padding: 48, textAlign: 'center', maxWidth: 420, width: '92%' }}>
          <h2 style={{ color: '#ef4444', marginBottom: 8 }}>Invalid Reset Link</h2>
          <p style={{ color: '#64748b', fontSize: 13, marginBottom: 24 }}>The reset link is missing or invalid. Please request a new one from the login page.</p>
          <button onClick={() => navigate('/login')} className="btn btn-primary" style={{ fontWeight: 700 }}>Back to Admin Login</button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-sidebar">
          <div className="auth-sidebar-content">
            <div className="auth-logo-section">
              <img src="/hfa-logo.png" alt="Logo" style={{ width: 40, height: 40, objectFit: 'contain' }} />
              <span className="auth-logo-text">Halal Food Authority</span>
            </div>
            <h1>HFA Admin Portal</h1>
            <p>Set your new password to regain secure access to the HFA Admin Portal.</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,249,195,0.15)', border: '1px solid rgba(253,230,138,0.3)', borderRadius: 12, padding: '16px 20px', marginTop: 'auto', backdropFilter: 'blur(10px)' }}>
              <Shield size={20} style={{ color: '#F9B000', flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: '#F9B000', fontWeight: 600 }}>Authorised Personnel Only</span>
            </div>
          </div>
        </div>

        <div className="auth-main">
          <div className="auth-tabs">
            <div className="auth-tab active">Reset Password</div>
          </div>
          <div className="auth-form-container">
            <div className="auth-form-header">
              <h2>Set New Password</h2>
              <p>Enter and confirm your new admin portal password</p>
            </div>

            {success ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <CheckCircle size={52} style={{ color: '#10b981', marginBottom: 16 }} />
                <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>Password Reset Successful!</h3>
                <p style={{ color: '#64748b', fontSize: 13, lineHeight: 1.6, marginBottom: 24 }}>Your password has been updated. Redirecting to login...</p>
                <button onClick={() => navigate('/login')} className="btn btn-primary" style={{ fontWeight: 700 }}>Back to Admin Login</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="auth-input-group">
                  <label>New Password <span style={{ color: '#ef4444' }}>*</span></label>
                  <div style={{ position: 'relative' }}>
                    <input type={showPassword ? 'text' : 'password'} className="auth-input" placeholder="Min. 6 characters"
                      value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="auth-input-group">
                  <label>Confirm Password <span style={{ color: '#ef4444' }}>*</span></label>
                  <div style={{ position: 'relative' }}>
                    <input type={showConfirm ? 'text' : 'password'} className="auth-input" placeholder="Repeat your new password"
                      value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} autoComplete="new-password" required />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                      {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {confirmPassword && password !== confirmPassword && (
                    <p style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>Passwords do not match</p>
                  )}
                </div>

                <button type="submit" className="auth-btn-primary" disabled={loading} style={{ marginTop: 24 }}>
                  {loading ? <span className="spinner-white" /> : <><KeyRound size={18} /> Reset Password</>}
                </button>

                <div style={{ textAlign: 'center', marginTop: 18 }}>
                  <button type="button" onClick={() => navigate('/login')}
                    style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}>
                    Back to Admin Login
                  </button>
                </div>
                <p style={{ textAlign: 'center', fontSize: 11, color: '#94a3b8', marginTop: 36 }}>
                  &copy; {new Date().getFullYear()} Halal Food Authority UK. All rights reserved.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
