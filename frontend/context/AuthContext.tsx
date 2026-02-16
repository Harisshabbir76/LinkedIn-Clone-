'use client'

import { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  age?: number;
  profileImage?: string;
  skills?: any[];
  location?: string;
  phone?: string;
  linkedin?: string;
  portfolio?: string;
  bio?: string;
  education?: any[];
  experience?: any[];
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUserState] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      
      if (storedToken && userStr) {
        try {
          const userData = JSON.parse(userStr);
          
          // Verify the token is still valid by making a test request
          try {
            await axios.get('http://localhost:5000/api/auth/user', {
              headers: { Authorization: `Bearer ${storedToken}` }
            });
            
            // Token is valid
            setUserState(userData);
            setToken(storedToken);
          } catch (error) {
            console.error('Token validation failed:', error);
            // Clear invalid/stale data
            localStorage.removeItem('token');
            localStorage.removeItem('user');
          }
        } catch (error) {
          console.error('Failed to parse user data:', error);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const loadUser = async () => {
    try {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        const response = await axios.get('http://localhost:5000/api/auth/user', {
          headers: { Authorization: `Bearer ${storedToken}` }
        });
        setUserState(response.data);
        localStorage.setItem('user', JSON.stringify(response.data));
      }
    } catch (error) {
      console.error('Failed to load user:', error);
      // Don't clear tokens on network errors, only on auth errors
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUserState(null);
        setToken(null);
      }
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await axios.post('http://localhost:5000/api/auth/login', { email, password });
      const { token: newToken, user: userData } = response.data;
      
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(userData));
      setUserState(userData);
      setToken(newToken);
      
      return { success: true };
    } catch (error: any) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || 'Login failed' 
      };
    }
  };

  const logout = async () => {
    try {
      // Call backend logout if needed (for blacklisting tokens)
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        await axios.get('http://localhost:5000/api/auth/logout', {
          headers: { Authorization: `Bearer ${storedToken}` }
        }).catch(err => {
          // Logout might fail if token is invalid, but we still want to clear local storage
          console.error('Logout API call failed:', err);
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always clear local storage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUserState(null);
      setToken(null);
      router.push('/login');
    }
  };

  const setUser = (user: User | null) => {
    setUserState(user);
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      isAuthenticated: !!user,
      login,
      logout,
      loadUser,
      setUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};