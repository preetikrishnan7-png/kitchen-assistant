import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from './firebase';
import {
  collection,
  onSnapshot,
  doc,
  updateDoc
} from 'firebase/firestore';
import { Shield, UserX, UserCheck, Mail, Clock, Search } from 'lucide-react';

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [confirmAction, setConfirmAction] = useState(null); // { uid, email, action }

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'userProfiles'), (snap) => {
      const data = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
      // Sort: revoked users last
      data.sort((a, b) => (a.revoked === b.revoked ? 0 : a.revoked ? 1 : -1));
      setUsers(data);
    });
    return unsub;
  }, []);

  const toggleRevoke = async (uid, currentRevoked) => {
    await updateDoc(doc(db, 'userProfiles', uid), { revoked: !currentRevoked });
    setConfirmAction(null);
  };

  const filtered = users.filter(u =>
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.displayName?.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = users.filter(u => !u.revoked).length;
  const revokedCount = users.filter(u => u.revoked).length;

  return (
    <motion.div
      key="admin"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem' }}>
          <Shield size={22} color="var(--primary)" />
          <h2 style={{ fontSize: '1.3rem' }}>Admin Panel</h2>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Manage user access to Smart Kitchen
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="glass-card" style={{ padding: '1rem', textAlign: 'center', marginBottom: 0 }}>
          <p style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--secondary)' }}>{activeCount}</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>Active Users</p>
        </div>
        <div className="glass-card" style={{ padding: '1rem', textAlign: 'center', marginBottom: 0 }}>
          <p style={{ fontSize: '1.8rem', fontWeight: '800', color: '#ff7675' }}>{revokedCount}</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>Revoked</p>
        </div>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '1rem' }}>
        <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#aaa' }} />
        <input
          className="input-field"
          placeholder="Search by name or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ paddingLeft: '2.5rem', marginBottom: 0 }}
        />
      </div>

      {/* User List */}
      <div className="glass-card" style={{ padding: '0.5rem' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            No users found.
          </div>
        ) : (
          filtered.map(user => (
            <div
              key={user.uid}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.9rem 1rem',
                borderBottom: '1px solid rgba(0,0,0,0.05)',
                opacity: user.revoked ? 0.6 : 1,
                transition: 'opacity 0.2s'
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Avatar + Name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    background: user.revoked ? '#dfe6e9' : 'linear-gradient(135deg, #ff6b6b, #ff8e8e)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontWeight: '800', fontSize: '1rem', flexShrink: 0
                  }}>
                    {(user.displayName || user.email || '?')[0].toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {user.displayName || 'Unknown'}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '0.15rem' }}>
                      <Mail size={11} color="#aaa" />
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {user.email}
                      </p>
                    </div>
                    {user.createdAt && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '0.1rem' }}>
                        <Clock size={11} color="#aaa" />
                        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          Joined {new Date(user.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Status + Action */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '1rem', flexShrink: 0 }}>
                <span style={{
                  padding: '0.25rem 0.65rem',
                  borderRadius: '20px',
                  fontSize: '0.72rem',
                  fontWeight: '700',
                  background: user.revoked ? '#fff0f0' : '#f0fff8',
                  color: user.revoked ? '#c0392b' : '#27ae60'
                }}>
                  {user.revoked ? 'Revoked' : 'Active'}
                </span>
                {user.email !== 'preetikrishnan7@gmail.com' && (
                  <button
                    onClick={() => setConfirmAction({ uid: user.uid, email: user.email, action: user.revoked ? 'restore' : 'revoke' })}
                    style={{
                      padding: '0.4rem 0.75rem',
                      border: 'none',
                      borderRadius: '0.6rem',
                      fontSize: '0.78rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      background: user.revoked ? 'rgba(78,205,196,0.12)' : 'rgba(255,118,117,0.12)',
                      color: user.revoked ? 'var(--secondary)' : '#ff7675',
                      display: 'flex', alignItems: 'center', gap: '4px',
                      fontFamily: "'Outfit', sans-serif"
                    }}
                  >
                    {user.revoked ? <><UserCheck size={14} /> Restore</> : <><UserX size={14} /> Revoke</>}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Confirm Dialog */}
      <AnimatePresence>
        {confirmAction && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', zIndex: 1000, padding: '1.5rem'
          }}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card"
              style={{ maxWidth: '380px', width: '100%', background: 'white', padding: '2rem', textAlign: 'center' }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
                {confirmAction.action === 'revoke' ? '⛔' : '✅'}
              </div>
              <h3 style={{ marginBottom: '0.5rem', fontSize: '1.1rem' }}>
                {confirmAction.action === 'revoke' ? 'Revoke Access?' : 'Restore Access?'}
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
                {confirmAction.action === 'revoke'
                  ? `${confirmAction.email} will be blocked from logging in.`
                  : `${confirmAction.email} will be able to log in again.`}
              </p>
              <div style={{ display: 'flex', gap: '0.8rem' }}>
                <button
                  onClick={() => toggleRevoke(confirmAction.uid, confirmAction.action === 'restore')}
                  style={{
                    flex: 2, padding: '0.8rem',
                    background: confirmAction.action === 'revoke' ? '#ff7675' : 'var(--secondary)',
                    color: 'white', border: 'none', borderRadius: '0.8rem',
                    fontWeight: '700', fontSize: '0.95rem', cursor: 'pointer',
                    fontFamily: "'Outfit', sans-serif"
                  }}
                >
                  {confirmAction.action === 'revoke' ? 'Yes, Revoke' : 'Yes, Restore'}
                </button>
                <button
                  onClick={() => setConfirmAction(null)}
                  style={{
                    flex: 1, padding: '0.8rem',
                    background: 'rgba(0,0,0,0.06)', color: 'var(--text-main)',
                    border: 'none', borderRadius: '0.8rem',
                    fontWeight: '700', fontSize: '0.95rem', cursor: 'pointer',
                    fontFamily: "'Outfit', sans-serif"
                  }}
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
