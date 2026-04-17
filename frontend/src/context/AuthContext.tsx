// @refresh reset
import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '~/services/api';

interface User {
  id: string;
  email: string;
  fullName: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (userData: User, token: string) => void;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  login: () => {},
  logout: async () => {},
  isAuthenticated: false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('access_token'));
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('user_info');
    return stored ? JSON.parse(stored) : null;
  });

  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }

    const handleTokenRefresh = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      setToken(customEvent.detail);
    };
    window.addEventListener('tokenRefreshed', handleTokenRefresh);

    return () => {
      window.removeEventListener('tokenRefreshed', handleTokenRefresh);
    };
  }, [token]);

  const login = (userData: User, jwtToken: string) => {
    setUser(userData);
    setToken(jwtToken);
    localStorage.setItem('access_token', jwtToken);
    localStorage.setItem('user_info', JSON.stringify(userData));
    api.defaults.headers.common['Authorization'] = `Bearer ${jwtToken}`;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // Bỏ qua lỗi nếu server không phản hồi — vẫn xoá client
    }
    setUser(null);
    setToken(null);
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_info');
    delete api.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
