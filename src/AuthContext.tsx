import React, { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { User, AuthError } from '@supabase/supabase-js';
import { signIn as doSignIn, signUp as doSignUp, signOut as doSignOut, onAuthStateChange, getSession } from './supabaseClient';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<AuthError | null>;
  signUp: (email: string, password: string) => Promise<AuthError | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  error: null,
  signIn: async () => null,
  signUp: async () => null,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSession().then(({ user }) => {
      setUser(user);
      setLoading(false);
    });
    const unsubscribe = onAuthStateChange((u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<AuthError | null> => {
    setError(null);
    const { user, error } = await doSignIn(email, password);
    if (error) {
      setError(error.message);
      return error;
    }
    return null;
  }, []);

  const signUp = useCallback(async (email: string, password: string): Promise<AuthError | null> => {
    setError(null);
    const { user, error } = await doSignUp(email, password);
    if (error) {
      setError(error.message);
      return error;
    }
    return null;
  }, []);

  const signOut = useCallback(async () => {
    await doSignOut();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, error, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
