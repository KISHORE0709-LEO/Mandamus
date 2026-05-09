import { useState } from 'react';

import { useNavigate } from 'react-router-dom';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { 
  Gavel, 
  Briefcase, 
  ShieldAlert, 
  User, 
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
  Settings
} from 'lucide-react';
import './AuthPage.css';

const ROLES = [
  { 
    value: 'judge',   
    label: 'Judicial Officer', 
    desc: 'Preside over digital hearings and access the Judiciary Vault.',
    icon: <Gavel size={40} strokeWidth={1.5} /> 
  },
  { 
    value: 'lawyer',  
    label: 'Legal Counsel', 
    desc: 'Research case precedents and generate AI-powered drafts.',
    icon: <Briefcase size={40} strokeWidth={1.5} /> 
  },
  { 
    value: 'custody', 
    label: 'Custody Node', 
    desc: 'Monitor prisoner status and manage institutional legal aid.',
    icon: <ShieldAlert size={40} strokeWidth={1.5} /> 
  },
  { 
    value: 'public',  
    label: 'Citizen Portal', 
    desc: 'Access public records and receive free AI legal guidance.',
    icon: <User size={40} strokeWidth={1.5} /> 
  },
  {
    value: 'admin',
    label: 'Admin Portal',
    desc: 'Manage users, assign cases, and monitor platform operations.',
    icon: <Settings size={40} strokeWidth={1.5} />
  }
];


const saveUserRole = (uid, role, displayName, email) => {
  setDoc(doc(db, 'users', uid), { displayName, email, role, updatedAt: new Date().toISOString() }, { merge: true })
    .catch(e => console.warn('Firestore write skipped:', e.message));
};

const AuthPage = () => {
  const [step, setStep] = useState('role-selection'); // 'role-selection', 'auth'
  const [authMode, setAuthMode] = useState('signin');
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({ fullName: '', email: '', password: '', role: '' });
  const [errors, setErrors] = useState({});
  const { setRole } = useAuth();
  const navigate = useNavigate();

  const toggleMode = () => {
    setAuthMode(authMode === 'signin' ? 'signup' : 'signin');
    setErrors({});
  };

  const handleRoleSelect = (roleValue) => {
    setFormData({ ...formData, role: roleValue });
    setStep('auth');
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
      const email = result.user.email;
      const role = formData.role || 'public';

      // Check role mapping
      const userDoc = await getDoc(doc(db, 'users_by_email', email.toLowerCase()));
      if (userDoc.exists()) {
        const registeredRole = userDoc.data().role;
        if (registeredRole !== role) {
          await auth.signOut();
          throw { code: 'custom/role-mismatch', message: `This email is already registered as a ${registeredRole.toUpperCase()} account.` };
        }
      }

      saveUserRole(result.user.uid, role, result.user.displayName, result.user.email);
      await setDoc(doc(db, 'users_by_email', email.toLowerCase()), { 
        role: role, 
        uid: result.user.uid 
      });

      setRole(role);
      window.dispatchEvent(new Event('roleChanged'));
      if (role === 'public') {
        navigate('/public-dashboard');
      } else if (role === 'admin') {
        navigate('/admin-dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Google Sign-In Error:', error);
      setErrors({ google: error.code === 'custom/role-mismatch' ? error.message : 'Failed to sign in with Google.' });
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
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }

    setIsLoading(true);
    setErrors({});

    try {
      if (authMode === 'signup') {
        // Check if email already exists with a different role before creating
        const userDoc = await getDoc(doc(db, 'users_by_email', formData.email.toLowerCase()));
        if (userDoc.exists()) {
          const existingRole = userDoc.data().role;
          throw { code: 'custom/role-mismatch', message: `This email is already registered as a ${existingRole.toUpperCase()} account.` };
        }

        const cred = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        await updateProfile(cred.user, { displayName: formData.fullName });
        saveUserRole(cred.user.uid, formData.role, formData.fullName, formData.email);
        
        // Save to email mapping for quick check
        await setDoc(doc(db, 'users_by_email', formData.email.toLowerCase()), { 
          role: formData.role, 
          uid: cred.user.uid 
        });
      } else {
        // Sign in first to get the UID, but we should actually check role BEFORE or AFTER
        // Check role mapping first for better UX
        const userDoc = await getDoc(doc(db, 'users_by_email', formData.email.toLowerCase()));
        if (userDoc.exists()) {
          const registeredRole = userDoc.data().role;
          if (registeredRole !== formData.role) {
            throw { code: 'custom/role-mismatch', message: `This email is already registered as a ${registeredRole.toUpperCase()} account.` };
          }
        }

        const cred = await signInWithEmailAndPassword(auth, formData.email, formData.password);
        
        // Double check Firestore for role if mapping didn't exist (legacy users)
        const profileDoc = await getDoc(doc(db, 'users', cred.user.uid));
        if (profileDoc.exists()) {
          const registeredRole = profileDoc.data().role;
          if (registeredRole !== formData.role) {
            // Log them back out if they tried to bypass
            await auth.signOut();
            throw { code: 'custom/role-mismatch', message: `This email is already registered as a ${registeredRole.toUpperCase()} account.` };
          }
        } else {
          // If profile doesn't exist, this is the first time they are logging in with this role
          saveUserRole(cred.user.uid, formData.role, cred.user.displayName, cred.user.email);
          await setDoc(doc(db, 'users_by_email', formData.email.toLowerCase()), { 
            role: formData.role, 
            uid: cred.user.uid 
          });
        }
      }
      
      setRole(formData.role);
      window.dispatchEvent(new Event('roleChanged'));
      if (formData.role === 'public') {
        navigate('/public-dashboard');
      } else if (formData.role === 'admin') {
        navigate('/admin-dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Auth Error:', error);
      const errs = {};
      if (error.code === 'custom/role-mismatch') {
        errs.auth = error.message;
      } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errs.auth = 'Invalid email or password';
      } else if (error.code === 'auth/email-already-in-use') {
        errs.email = 'Email already in use';
      } else {
        errs.auth = error.message || 'An error occurred. Please try again.';
      }
      setErrors(errs);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedRoleData = ROLES.find(r => r.value === formData.role);

  return (
    <div className="auth-page">
      {step === 'role-selection' ? (
        <div className="role-selection-container">
          <div className="role-selection-header">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '16px' }}>
              <img src="/Logo.png" alt="Mandamus Logo" style={{ height: '44px' }} />
              <span style={{ fontSize: '28px', fontWeight: '800', color: '#fff', letterSpacing: '3px' }}>MANDAMUS</span>
            </div>
            <h1 className="auth-title">Select Access Portal</h1>
            <p className="auth-subtitle">Secure gateway to the digital judicial infrastructure. Choose your specialized workspace.</p>
          </div>
          
          <div className="role-grid">
            {ROLES.map((role) => (
              <div 
                key={role.value} 
                className="role-card"
                onClick={() => handleRoleSelect(role.value)}
              >
                <div className="role-card-icon">
                  {role.icon}
                </div>
                <div className="role-card-content">
                  <h3>{role.label}</h3>
                  <p>{role.desc}</p>
                </div>
                <div className="role-card-arrow">
                  <ChevronRight size={20} />
                </div>
              </div>
            ))}
          </div>
          
          <button className="auth-back-link" onClick={() => navigate('/')}>
            <ArrowLeft size={16} /> Return to Home
          </button>
        </div>
      ) : (
        <div className="auth-centered-container">
          <div className="auth-card-large">
            <button className="auth-step-back" onClick={() => setStep('role-selection')}>
              <ArrowLeft size={14} /> Switch Portal
            </button>

            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <div className="secure-badge">
                <ShieldCheck size={12} />
                {formData.role.toUpperCase()} ENCLAVE
              </div>
              <h2 className="auth-title" style={{ fontSize: '28px', marginBottom: '8px' }}>
                {authMode === 'signin' ? 'Portal Login' : 'Register Account'}
              </h2>
              <p className="auth-subtitle" style={{ fontSize: '14px' }}>
                Securely connecting to {selectedRoleData?.label} systems
              </p>
            </div>

            <button className="google-btn" onClick={handleGoogleSignIn} disabled={isLoading}>
              <svg viewBox="0 0 48 48" className="google-icon" xmlns="http://www.w3.org/2000/svg">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                <path fill="none" d="M0 0h48v48H0z"/>
              </svg>
              {isLoading ? 'Connecting...' : 'Continue with Google'}
            </button>

            {errors.google && <div className="auth-error-main" style={{ marginBottom: '16px' }}>{errors.google}</div>}
            {errors.auth && <div className="auth-error-main" style={{ marginBottom: '16px' }}>{errors.auth}</div>}

            <div className="auth-divider">
              <span className="divider-line"></span>
              <span className="divider-text">OR EMAIL</span>
              <span className="divider-line"></span>
            </div>

            <form className="auth-form" onSubmit={handleSubmit}>
              {authMode === 'signup' && (
                <div className="input-group">
                  <input
                    type="text" name="fullName" placeholder="Full Name"
                    className={`auth-input ${errors.fullName ? 'input-error' : ''}`}
                    value={formData.fullName} onChange={handleChange}
                    autoComplete="name"
                  />
                  {errors.fullName && <div className="error-msg">{errors.fullName}</div>}
                </div>
              )}

              <div className="input-group">
                <input
                  type="email" name="email" placeholder="Email Address"
                  className={`auth-input ${errors.email ? 'input-error' : ''}`}
                  value={formData.email} onChange={handleChange}
                  autoComplete="email"
                />
                {errors.email && <div className="error-msg">{errors.email}</div>}
              </div>

              <div className="input-group">
                <input
                  type="password" name="password" placeholder="Password"
                  className={`auth-input ${errors.password ? 'input-error' : ''}`}
                  value={formData.password} onChange={handleChange}
                  autoComplete={authMode === 'signin' ? 'current-password' : 'new-password'}
                />
                {errors.password && <div className="error-msg">{errors.password}</div>}
                {authMode === 'signin' && (
                  <div className="forgot-password"><a href="#forgot">Forgot?</a></div>
                )}
              </div>

              <button type="submit" className="auth-submit-btn" disabled={isLoading}>
                {isLoading ? <span className="btn-spinner"></span> : (authMode === 'signin' ? 'Access Portal' : 'Establish Identity')}
              </button>
            </form>

            <div className="auth-toggle">
              {authMode === 'signin' ? (
                <>No identity? <span className="toggle-link" onClick={toggleMode}>Create Credentials</span></>
              ) : (
                <>Existing member? <span className="toggle-link" onClick={toggleMode}>Login here</span></>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


export default AuthPage;
