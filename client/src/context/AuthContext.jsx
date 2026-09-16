import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../services/api';
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); const [loading, setLoading] = useState(true);
  useEffect(() => { if (!localStorage.getItem('daymark_token')) return setLoading(false); api.me().then((result) => setUser(result.user)).catch(() => localStorage.removeItem('daymark_token')).finally(() => setLoading(false)); }, []);
  async function authenticate(action, payload) { const result = await api[action](payload); localStorage.setItem('daymark_token', result.token); setUser(result.user); }
  function logout() { localStorage.removeItem('daymark_token'); setUser(null); }
  return <AuthContext.Provider value={{ user, loading, login: (payload) => authenticate('login', payload), register: (payload) => authenticate('register', payload), logout }}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
