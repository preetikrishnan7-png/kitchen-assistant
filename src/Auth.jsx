import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile
} from 'firebase/auth';
import { auth, googleProvider, db } from './firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { ChefHat, Mail, Lock, User, AlertCircle, Loader2 } from 'lucide-react';

const ADMIN_EMAIL = 'preetikrishnan7@gmail.com';

async function saveUserProfile(user, displayName) {
  const ref = doc(db, 'userProfiles', user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      uid: user.uid,
      email: user.email,
      displayName: displayName || user.displayName || user.email?.split('@')[0],
      createdAt: Date.now(),
      revoked: false
    });
  }
}

async function checkRevoked(user) {
  if (user.email === ADMIN_EMAIL) return false;
  const ref = doc(db, 'userProfiles', user.uid);
  const snap = await getDoc(ref);
  return snap.exists() && snap.data().revoked === true;
}

export default function Auth() {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const clearError = () => setError('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let userCred;
      if (mode === 'signup') {
        userCred = await createUserWithEmailAndPassword(auth, email, password);
        if (name) await updateProfile(userCred.user, { displayName: name });
        await saveUserProfile(userCred.user, name);
      } else {
        userCred = await signInWithEmailAndPassword(auth, email, password);
        await saveUserProfile(userCred.user);
        const revoked = await checkRevoked(userCred.user);
        if (revoked) {
          await signOut(auth);
          setError('Your access has been revoked. Please contact the admin.');
          setLoading(false);
          return;
        }
      }
    } catch (err) {
      setError(friendlyError(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      const userCred = await signInWithPopup(auth, googleProvider);
      await saveUserProfile(userCred.user);
      const revoked = await checkRevoked(userCred.user);
      if (revoked) {
        await signOut(auth);
        setError('Your access has been revoked. Please contact the admin.');
        return;
      }
    } catch (err) {
      setError(friendlyError(err.code));
    } finally {
      setLoading(false);
    }
  };

  function friendlyError(code) {
    switch (code) {
      case 'auth/email-already-in-use': return 'This email is already registered. Try logging in.';
      case 'auth/invalid-email': return 'Please enter a valid email address.';
      case 'auth/weak-password': return 'Password must be at least 6 characters.';
      case 'auth/user-not-found': return 'No account found with this email.';
      case 'auth/wrong-password': return 'Incorrect password. Please try again.';
      case 'auth/invalid-credential': return 'Invalid email or password.';
      case 'auth/popup-closed-by-user': return 'Google sign-in was cancelled.';
      default: return 'Something went wrong. Please try again.';
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #fff5f5 0%, #f0fff4 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      fontFamily: "'Outfit', sans-serif"
    }}>
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4 }}
        style={{
          width: '100%',
          maxWidth: '420px',
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(20px)',
          borderRadius: '2rem',
          border: '1px solid rgba(255,255,255,0.5)',
          boxShadow: '0 20px 60px rgba(31,38,135,0.1)',
          padding: '2.5rem 2rem',
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '64px', height: '64px',
            background: 'linear-gradient(135deg, #ff6b6b, #ff8e8e)',
            borderRadius: '1.2rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem',
            boxShadow: '0 8px 24px rgba(255,107,107,0.35)'
          }}>
            <ChefHat size={32} color="white" />
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#ff6b6b', marginBottom: '0.2rem' }}>
            Smart Kitchen
          </h1>
          <p style={{ color: '#636e72', fontSize: '0.9rem' }}>Helping Moms stay organized ✨</p>
        </div>

        {/* Tab Toggle */}
        <div style={{
          display: 'flex',
          background: 'rgba(0,0,0,0.05)',
          borderRadius: '1rem',
          padding: '4px',
          marginBottom: '1.8rem'
        }}>
          {['login', 'signup'].map(tab => (
            <button
              key={tab}
              onClick={() => { setMode(tab); clearError(); }}
              style={{
                flex: 1,
                padding: '0.6rem',
                border: 'none',
                borderRadius: '0.8rem',
                background: mode === tab ? 'white' : 'transparent',
                color: mode === tab ? '#ff6b6b' : '#636e72',
                fontWeight: '700',
                fontSize: '0.95rem',
                cursor: 'pointer',
                boxShadow: mode === tab ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.2s',
                textTransform: 'capitalize',
                fontFamily: "'Outfit', sans-serif"
              }}
            >
              {tab === 'login' ? 'Log In' : 'Sign Up'}
            </button>
          ))}
        </div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                background: '#fff5f5',
                border: '1px solid #fed7d7',
                borderRadius: '0.8rem',
                padding: '0.8rem 1rem',
                marginBottom: '1.2rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: '#c53030',
                fontSize: '0.88rem',
                fontWeight: '500'
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <AnimatePresence mode="wait">
            {mode === 'signup' && (
              <motion.div
                key="name"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{ marginBottom: '1rem' }}
              >
                <label style={labelStyle}>YOUR NAME</label>
                <div style={inputWrapStyle}>
                  <User size={18} color="#aaa" style={{ flexShrink: 0 }} />
                  <input
                    type="text"
                    placeholder="e.g. Priya Sharma"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>EMAIL</label>
            <div style={inputWrapStyle}>
              <Mail size={18} color="#aaa" style={{ flexShrink: 0 }} />
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ marginBottom: '1.8rem' }}>
            <label style={labelStyle}>PASSWORD</label>
            <div style={inputWrapStyle}>
              <Lock size={18} color="#aaa" style={{ flexShrink: 0 }} />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={inputStyle}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.95rem',
              background: loading ? '#ffb3b3' : 'linear-gradient(135deg, #ff6b6b, #ff8e8e)',
              color: 'white',
              border: 'none',
              borderRadius: '1rem',
              fontSize: '1rem',
              fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 6px 20px rgba(255,107,107,0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s',
              fontFamily: "'Outfit', sans-serif",
              marginBottom: '1rem'
            }}
          >
            {loading
              ? <><Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> Please wait...</>
              : mode === 'login' ? 'Log In' : 'Create Account'
            }
          </button>
        </form>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(0,0,0,0.08)' }} />
          <span style={{ color: '#aaa', fontSize: '0.85rem', fontWeight: '600' }}>OR</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(0,0,0,0.08)' }} />
        </div>

        {/* Google Sign-In */}
        <button
          onClick={handleGoogle}
          disabled={loading}
          style={{
            width: '100%',
            padding: '0.9rem',
            background: 'white',
            color: '#333',
            border: '1.5px solid rgba(0,0,0,0.1)',
            borderRadius: '1rem',
            fontSize: '0.95rem',
            fontWeight: '700',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.7rem',
            transition: 'all 0.2s',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            fontFamily: "'Outfit', sans-serif"
          }}
        >
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Continue with Google
        </button>

        <p style={{ textAlign: 'center', color: '#aaa', fontSize: '0.78rem', marginTop: '1.5rem' }}>
          By continuing, you agree to our Terms & Privacy Policy.
        </p>
      </motion.div>
    </div>
  );
}

const labelStyle = {
  fontSize: '0.75rem',
  fontWeight: '700',
  color: '#636e72',
  letterSpacing: '0.08em',
  display: 'block',
  marginBottom: '0.5rem'
};

const inputWrapStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.7rem',
  background: 'rgba(0,0,0,0.04)',
  border: '2px solid transparent',
  borderRadius: '1rem',
  padding: '0.85rem 1rem',
  transition: 'all 0.2s'
};

const inputStyle = {
  flex: 1,
  border: 'none',
  background: 'transparent',
  fontSize: '1rem',
  outline: 'none',
  color: '#2d3436',
  fontFamily: "'Outfit', sans-serif"
};
