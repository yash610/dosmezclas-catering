import { createContext, useContext, useEffect, useState } from 'react';
import { api, getAdminToken, setAdminToken } from '../api.js';

const AdminAuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAdminToken();
    if (!token) { setLoading(false); return; }
    api.get('/api/admin/me')
      .then(setAdmin)
      .catch(() => setAdminToken(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const { token, user } = await api.post('/api/admin/login', { email, password });
    setAdminToken(token);
    setAdmin(user);
    return user;
  }

  function logout() {
    setAdminToken(null);
    setAdmin(null);
  }

  return (
    <AdminAuthContext.Provider value={{ admin, loading, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  return useContext(AdminAuthContext);
}
