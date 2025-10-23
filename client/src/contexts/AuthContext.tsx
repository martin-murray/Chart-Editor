import { createContext, useContext, useState, useEffect } from 'react';
import { setLogoutHandler } from '@/lib/queryClient';

interface AuthContextType {
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  validateSession: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('authToken');
  };

  useEffect(() => {
    const authStatus = localStorage.getItem('isAuthenticated');
    const authToken = localStorage.getItem('authToken');
    if (authStatus === 'true' && authToken) {
      setIsAuthenticated(true);
    }
    
    // Register global logout handler for 401 responses
    setLogoutHandler(logout);
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (data.success && data.token) {
        setIsAuthenticated(true);
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('authToken', data.token);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const validateSession = async (): Promise<boolean> => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      logout();
      return false;
    }

    try {
      const response = await fetch('/api/session', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        return true;
      } else {
        // Token is invalid or expired
        logout();
        return false;
      }
    } catch (error) {
      console.error('Session validation error:', error);
      logout();
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, validateSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
