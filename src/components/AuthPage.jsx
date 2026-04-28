import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import './AuthPage.css';

const ROLES = [
  { value: 'judge',   label: 'Judge — Host' },
  { value: 'lawyer',  label: 'Lawyer — Participant' },
  { value: 'custody', label: 'Custody Node — Accused (Jail / Police)' },
  { value: 'clerk',   label: 'Clerk — Observer' },
];

// Fire-and-forget — never awaited, never blocks navigation
const saveUserRole = (uid, role, displayName, email) => {
  setDoc(doc(db, 'users', uid), { displayName, email, role, updatedAt: new Date().toISOString() }, { merge: true })
    .catch(e => console.warn('Firestore write skipped:', e.message));
};

const AuthPage = () => {
  const [authMode, setAuthMode] = useState('signin');
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({ fullName: '', email: '', password: '', role: '' });
  const [errors, setErrors] = useState({});
  const { setRole } = useAuth();
  const navigate = useNavigate();

  const toggleMode = () => {
    setAuthMode(authMode === 'signin' ? 'signup' : 'signin');
    setErrors({});
    setFormData({ fullName: '', email: '', password: '', role: '' });
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: '' });
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrors({});
    try {
      const result = await signInWithPopup(auth, googleProvider);
      saveUserRole(result.user.uid, formData.role || 'clerk', result.user.displayName, result.user.email);
      setRole(formData.role || 'clerk');
      navigate('/dashboard');
    } catch (error) {
      console.error('Google Sign-In Error:', error);
      setErrors({ google: 'Failed to sign in with Google. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (authMode === 'signup' && !formData.fullName.trim()) newErrors.fullName = 'Full Name is required';
    if (!formData.email.trim()) newErrors.email = 'Email Address is required';
    if (!formData.password) newErrors.password = 'Password is required';
    if (!formData.role) newErrors.role = 'Please select your role.';
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }

    setIsLoading(true);
    setErrors({});

    try {
      if (authMode === 'signup') {
        const cred = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        await updateProfile(cred.user, { displayName: formData.fullName });
        saveUserRole(cred.user.uid, formData.role, formData.fullName, formData.email);
      } else {
        const cred = await signInWithEmailAndPassword(auth, formData.email, formData.password);
        saveUserRole(cred.user.uid, formData.role, cred.user.displayName, cred.user.email);
      }
      setRole(formData.role);
      navigate('/dashboard');
    } catch (error) {
      console.error('Auth Error:', error);
      const errs = {};
      if (['auth/user-not-found', 'auth/wrong-password', 'auth/invalid-credential'].includes(error.code)) {
        errs.auth = 'Invalid email or password';
      } else if (error.code === 'auth/email-already-in-use') {
        errs.email = 'Email already in use';
      } else if (error.code === 'auth/weak-password') {
        errs.password = 'Password should be at least 6 characters';
      } else {
        errs.auth = 'An error occurred. Please try again.';
      }
      setErrors(errs);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="secure-bg-grid"></div>
      <button className="auth-back-btn" onClick={() => navigate('/')}>&larr; Back to Platform</button>

      <div className="auth-centered-container">
        <div className="auth-card-large">
          <div className="secure-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lock-icon">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            SECURE PORTAL
          </div>

          <h2 className="auth-title">{authMode === 'signin' ? 'Welcome Back' : 'Create an Account'}</h2>
          <p className="auth-subtitle">
            {authMode === 'signin' ? 'Sign in to access your Mandamus judicial workspace' : 'Join the secure AI judicial framework'}
          </p>

          <button className="google-btn" onClick={handleGoogleSignIn} disabled={isLoading}>
            <svg viewBox="0 0 48 48" className="google-icon" xmlns="http://www.w3.org/2000/svg">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              <path fill="none" d="M0 0h48v48H0z"/>
            </svg>
            Continue with Google
          </button>

          {errors.google && <div className="auth-error-main">{errors.google}</div>}
          {errors.auth && <div className="auth-error-main">{errors.auth}</div>}

          <div className="auth-divider">
            <span className="divider-line"></span>
            <span className="divider-text">or securely sign in with email</span>
            <span className="divider-line"></span>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {authMode === 'signup' && (
              <div className="input-group">
                <input
                  type="text" name="fullName" placeholder="Full Name"
                  className={`auth-input ${errors.fullName ? 'input-error' : ''}`}
                  value={formData.fullName} onChange={handleChange}
                />
                {errors.fullName && <div className="error-msg">{errors.fullName}</div>}
              </div>
            )}

            <div className="input-group">
              <input
                type="email" name="email" placeholder="Email Address"
                className={`auth-input ${errors.email ? 'input-error' : ''}`}
                value={formData.email} onChange={handleChange}
              />
              {errors.email && <div className="error-msg">{errors.email}</div>}
            </div>

            <div className="input-group password-group">
              <input
                type="password" name="password" placeholder="Password"
                className={`auth-input ${errors.password ? 'input-error' : ''}`}
                value={formData.password} onChange={handleChange}
              />
              {errors.password && <div className="error-msg">{errors.password}</div>}
              {authMode === 'signin' && (
                <div className="forgot-password"><a href="#forgot">Forgot password?</a></div>
              )}
            </div>

            <div className="input-group">
              <select
                name="role"
                className={`auth-input auth-select ${errors.role ? 'input-error' : ''}`}
                value={formData.role}
                onChange={handleChange}
              >
                <option value="" disabled>Select your role…</option>
                {ROLES.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              {errors.role && <div className="error-msg">{errors.role}</div>}
            </div>

            <button type="submit" className="auth-submit-btn" disabled={isLoading}>
              {isLoading ? <span className="btn-spinner"></span> : (authMode === 'signin' ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          <div className="auth-toggle">
            {authMode === 'signin' ? (
              <>Don't have an account? <span className="toggle-link" onClick={toggleMode}>Sign up</span></>
            ) : (
              <>Already have an account? <span className="toggle-link" onClick={toggleMode}>Sign in</span></>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
