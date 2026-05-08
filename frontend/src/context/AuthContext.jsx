import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [role, setRoleState] = useState(() => localStorage.getItem('userRole') || null);

  const setRole = (r) => {
    setRoleState(r);
    if (r) localStorage.setItem('userRole', r);
    else localStorage.removeItem('userRole');
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) setRole(null);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const logout = async () => {
    try {
      await auth.signOut();
      setRole(null);
      // Clear all possible persistence layers completely
      sessionStorage.clear();
      localStorage.clear();
      // Force reload to clear in-memory state
      window.location.href = '/login';
    } catch (e) {
      console.error("Logout failed", e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, role, setRole, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
