import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { api, setAuthToken, BASE_URL } from '../services/api';

interface User {
  id: string;
  email: string;
  name?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const storedToken = await SecureStore.getItemAsync('jwt_token');
        if (storedToken) {
          setTokenState(storedToken);
          setAuthToken(storedToken);
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 segundos max
            const data = await fetch(`${BASE_URL}/auth/me`, {
              headers: { 'Authorization': `Bearer ${storedToken}` },
              signal: controller.signal
            }).then(r => r.json());
            
            clearTimeout(timeoutId);
            if (data?.user) {
              setUser(data.user);
            } else {
              // Token inválido
              await SecureStore.deleteItemAsync('jwt_token');
              setTokenState(null);
              setAuthToken(null);
            }
          } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            console.warn('[FlowPlan] No se pudo validar sesión:', msg);
          }
        }
      } catch (e) {
        console.error('Error restaurando el token', e);
      } finally {
        setIsLoading(false);
      }
    };
    bootstrapAsync();
  }, []);

  const saveToken = async (newToken: string) => {
    await SecureStore.setItemAsync('jwt_token', newToken);
    setTokenState(newToken);
    setAuthToken(newToken);
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password });
      saveToken(response.token);
      setUser(response.user);
    } catch (error) {
      console.error("Login failed", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, name: string) => {
    setIsLoading(true);
    try {
      const response = await api.post('/auth/register', { email, password, name });
      saveToken(response.token);
      setUser(response.user);
    } catch (error) {
      console.error("Register failed", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync('jwt_token');
    setTokenState(null);
    setAuthToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

