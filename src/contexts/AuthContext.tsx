import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface Profile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  avatar_url: string | null;
}

interface AuthUser {
  id: string;
  email: string;
  profile: Profile | null;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  loginWithPhone: (phone: string) => Promise<boolean>;
  verifyOtp: (phone: string, otp: string) => Promise<boolean>;
  signup: (phone: string, firstName: string, lastName: string) => Promise<boolean>;
  updateEmail: (newEmail: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  loginWithPhone: async () => false,
  verifyOtp: async () => false,
  signup: async () => false,
  updateEmail: async () => false,
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

function phoneToEmail(phone: string): string {
  const cleaned = phone.replace(/[^0-9]/g, '');
  return `phone_${cleaned}@proimmobilier.app`;
}

const DEFAULT_PASSWORD = 'ProImmo2026!SecureDefault';

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase.from('profiles').select('*').eq('user_id', userId).single();
  return data as Profile | null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const buildUser = async (session: Session | null) => {
    if (!session?.user) {
      setUser(null);
      setLoading(false);
      return;
    }
    const profile = await fetchProfile(session.user.id);
    setUser({
      id: session.user.id,
      email: session.user.email || '',
      profile,
    });
    setLoading(false);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      buildUser(session);
    });
    supabase.auth.getSession().then(({ data: { session } }) => buildUser(session));
    return () => subscription.unsubscribe();
  }, []);

  const loginWithPhone = async (phone: string) => {
    const email = phoneToEmail(phone);
    const { error } = await supabase.auth.signInWithPassword({ email, password: DEFAULT_PASSWORD });
    return !error;
  };

  const verifyOtp = async (phone: string, _otp: string) => {
    // Simulated OTP - just login
    return loginWithPhone(phone);
  };

  const signup = async (phone: string, firstName: string, lastName: string) => {
    const email = phoneToEmail(phone);
    const { error } = await supabase.auth.signUp({
      email,
      password: DEFAULT_PASSWORD,
      options: {
        data: { first_name: firstName, last_name: lastName, phone },
      },
    });
    if (error) return false;
    // Auto-login after signup
    await new Promise(r => setTimeout(r, 500));
    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password: DEFAULT_PASSWORD });
    return !loginError;
  };

  const updateEmail = async (newEmail: string) => {
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    return !error;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithPhone, verifyOtp, signup, updateEmail, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
