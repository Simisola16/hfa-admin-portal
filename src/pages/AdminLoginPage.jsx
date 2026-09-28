import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Shield, KeyRound, Mail, ArrowLeft, CheckCircle, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';

export default function AdminLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotInput, setForgotInput] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotMessage, setForgotMessage] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(username, password);
      toast.success('Welcome back, Admin!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!forgotInput.trim()) {
      return toast.error('Please enter your staff email or username');
    }
    setForgotLoading(true);
    try {
      const res = await api.post('/api/auth/forgot-password', {
        email: forgotInput.trim(),
        username: forgotInput.trim(),
        portal: 'admin'
      });
      setForgotSuccess(true);
      setForgotMessage(res.message || 'Password reset link sent to your registered email address.');
      toast.success('Password reset link sent!');
    } catch (err) {
      toast.error(err.message || 'Failed to dispatch reset link');
    } finally {
      setForgotLoading(false);
    }
  };

  const closeForgotModal = () => {
    setShowForgotModal(false);
    setForgotSuccess(false);
    setForgotInput('');
    setForgotMessage('');
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        {/* Left Sidebar */}
        <div className="auth-sidebar">
          <div className="auth-sidebar-content">
            <div className="auth-logo-section">
              <img src="/hfa-logo.png" alt="Logo" style={{ width: 40, height: 40, objectFit: 'contain' }} />
              <span className="auth-logo-text">Halal Food Authority</span>
            </div>

            <h1>HFA Admin Portal</h1>
            <p>This portal is restricted to authorised HFA staff only. Please sign in with your admin credentials to manage the certification process.</p>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255, 249, 195, 0.15)', border: '1px solid rgba(253, 230, 138, 0.3)', borderRadius: 12, padding: '16px 20px', marginTop: 'auto', backdropFilter: 'blur(10px)' }}>
              <Shield size={20} style={{ color: '#F9B000', flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: '#F9B000', fontWeight: 600 }}>Authorised Personnel Only</span>
            </div>
          </div>
        </div>

        {/* Main Auth Area */}
        <div className="auth-main">
          <div className="auth-tabs">
            <div className="auth-tab active">Staff Login</div>
          </div>

          <div className="auth-form-container">
            <div className="auth-form-header">
              <h2>Sign In to Admin</h2>
              <p>Enter your admin credentials to access the dashboard</p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="auth-input-group">
                <label>Email Address or Username <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  type="text"
                  className="auth-input"
                  placeholder="e.g. staff@halalfoodauthority.com"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>

              <div className="auth-input-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ margin: 0 }}>Password <span style={{ color: '#ef4444' }}>*</span></label>
                  <button
                    type="button"
                    onClick={() => { setShowForgotModal(true); setForgotInput(username || ''); }}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#059669',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <KeyRound size={12} /> Reset Password?
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="auth-input"
                    placeholder="••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)} 
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button type="submit" className="auth-btn-primary" disabled={loading} style={{ marginTop: 24 }}>
                {loading ? <span className="spinner-white" /> : <><Shield size={18} /> Sign In to Portal</>}
              </button>

              <div style={{ textAlign: 'center', marginTop: 18 }}>
                <button
                  type="button"
                  onClick={() => { setShowForgotModal(true); setForgotInput(username || ''); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    textUnderlineOffset: 3
                  }}
                >
                  Forgot your password? Click here to reset
                </button>
              </div>

              <p style={{ textAlign: 'center', fontSize: 11, color: '#94a3b8', marginTop: 36 }}>
                © {new Date().getFullYear()} Halal Food Authority UK. All rights reserved.
              </p>
            </form>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="modal-overlay" style={{ zIndex: 1200 }} onClick={closeForgotModal}>
          <div
            className="modal"
            style={{ maxWidth: 460, width: '92%', borderRadius: 16, overflow: 'hidden', padding: 0 }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #e2e8f0',
              background: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  boxShadow: '0 4px 10px rgba(16, 185, 129, 0.25)'
                }}>
                  <KeyRound size={20} />
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Reset Staff Password</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>Account recovery assistance</div>
                </div>
              </div>
              <button className="modal-close" onClick={closeForgotModal}><X size={18} /></button>
            </div>

            <div className="modal-body" style={{ padding: 24 }}>
              {forgotSuccess ? (
                <div style={{ textAlign: 'center', padding: '12px 0' }}>
                  <div style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    background: '#eff6ff',
                    color: '#2563eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                    boxShadow: '0 6px 16px rgba(37, 99, 235, 0.15)'
                  }}>
                    <Mail size={28} />
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>
                    Reset Link Dispatched!
                  </h3>
                  <p style={{ color: '#475569', fontSize: 13, lineHeight: 1.6, margin: '0 0 20px' }}>
                    {forgotMessage}
                  </p>
                  <p style={{ color: '#94a3b8', fontSize: 11.5, margin: 0 }}>
                    Please check your spam or junk folder if the email does not arrive within 2 minutes.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword}>
                  <p style={{ fontSize: 13, color: '#475569', marginTop: 0, marginBottom: 16, lineHeight: 1.5 }}>
                    Enter your registered staff email address or username. A secure one-hour password reset link will be dispatched immediately.
                  </p>
                  <div className="form-group" style={{ margin: '0 0 20px 0' }}>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: 12.5, color: '#334155', marginBottom: 6 }}>
                      Email Address or Username <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. staff@halalfoodauthority.com"
                      value={forgotInput}
                      onChange={e => setForgotInput(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>

                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <button type="button" className="btn btn-ghost" onClick={closeForgotModal} disabled={forgotLoading}>
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={forgotLoading}
                      style={{
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        borderColor: '#059669',
                        fontWeight: 700,
                        gap: 6
                      }}
                    >
                      {forgotLoading ? 'Sending Link...' : <><Mail size={15} /> Send Reset Link</>}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {forgotSuccess && (
              <div style={{
                padding: '14px 24px',
                borderTop: '1px solid #e2e8f0',
                background: '#f8fafc',
                display: 'flex',
                justifyContent: 'flex-end'
              }}>
                <button type="button" className="btn btn-primary" onClick={closeForgotModal} style={{ fontWeight: 700 }}>
                  Back to Sign In
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
