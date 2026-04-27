import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await login(email, password);
      if (data.profile?.role !== 'admin') {
        toast.error('Access denied. Admin credentials required.');
        return;
      }
      toast.success('Welcome back, Admin!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      {/* Left Sidebar */}
      <div className="auth-sidebar">
        <div className="auth-sidebar-content">
          <div className="auth-logo-section">
            <img src="/hfa-logo.png" alt="Logo" style={{ width: 40, height: 40, objectFit: 'contain' }} />
            <span className="auth-logo-text">Halal Food Authority</span>
          </div>

          <h1>HFA Admin Portal</h1>
          <p>This portal is restricted to authorised HFA staff only. Please sign in with your admin credentials to manage the certification process.</p>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255, 249, 195, 0.15)', border: '1px solid rgba(253, 230, 138, 0.3)', borderRadius: 12, padding: '16px 20px', marginBottom: 60, backdropFilter: 'blur(10px)' }}>
            <Shield size={20} style={{ color: '#F9B000', flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: '#F9B000', fontWeight: 600 }}>Authorised Personnel Only</span>
          </div>

          <div className="auth-sidebar-footer">
            Developed by TheYoungPioneers
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
              <label>Admin E-Mail <span style={{ color: '#ef4444' }}>*</span></label>
              <input
                type="email"
                className="auth-input"
                placeholder="admin@hfa.co.uk"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="auth-input-group">
              <label>Password <span style={{ color: '#ef4444' }}>*</span></label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="auth-input"
                  placeholder="••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
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

            <p style={{ textAlign: 'center', fontSize: 11, color: '#94a3b8', marginTop: 48 }}>
              © {new Date().getFullYear()} Halal Food Authority UK. All rights reserved.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
