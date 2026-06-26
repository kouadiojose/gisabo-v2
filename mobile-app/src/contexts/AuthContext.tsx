import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import apiService from '../services/api';

interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

interface RegisterData {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
  phone?: string;
}

export interface AuthResult {
  ok: boolean;
  error?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<AuthResult>;
  register: (data: RegisterData) => Promise<AuthResult>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      if (token) {
        const userData = await apiService.getUser();
        setUser(userData.user);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      await SecureStore.deleteItemAsync('authToken');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string): Promise<AuthResult> => {
    try {
      const data = await apiService.login(username, password);
      await SecureStore.setItemAsync('authToken', data.token);
      setUser(data.user);
      return { ok: true };
    } catch (error: any) {
      console.error('Login failed:', error);
      return { ok: false, error: error?.message || 'Connexion impossible' };
    }
  };

  const register = async (data: RegisterData): Promise<AuthResult> => {
    try {
      const result = await apiService.register(data);
      await SecureStore.setItemAsync('authToken', result.token);
      setUser(result.user);
      return { ok: true };
    } catch (error: any) {
      console.error('Register failed:', error);
      return { ok: false, error: error?.message || 'Inscription impossible' };
    }
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync('authToken');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
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