import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from './api';
import type { RegisterPayload, Role, User } from './types';

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (account: string, password: string, role: Role) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<User>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ user: User }>('/auth/me')
      .then((d) => setUser(d.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (account: string, password: string, role: Role) => {
    const d = await api<{ user: User }>('/auth/login', { method: 'POST', body: { account, password, role } });
    setUser(d.user);
    return d.user;
  };

  const register = async (payload: RegisterPayload) => {
    const d = await api<{ user: User }>('/auth/register', { method: 'POST', body: payload });
    setUser(d.user);
    return d.user;
  };

  const logout = async () => {
    try {
      await api('/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth 必须在 AuthProvider 内使用');
  return ctx;
}
