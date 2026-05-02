import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
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

type SignupResult = { ok: boolean; reason?: 'duplicate' | 'unknown' };

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  loginWithPhone: (phone: string) => Promise<boolean>;
  loginWithEmail: (email: string, password: string) => Promise<boolean>;
  verifyOtp: (phone: string, otp: string) => Promise<boolean>;
  signup: (phone: string, firstName: string, lastName: string, email?: string, password?: string) => Promise<SignupResult>;
  updateEmail: (newEmail: string) => Promise<boolean>;
  updatePassword: (newPassword: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  loginWithPhone: async () => false,
  loginWithEmail: async () => false,
  verifyOtp: async () => false,
  signup: async () => ({ ok: false }),
  updateEmail: async () => false,
  updatePassword: async () => false,
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

// Normalize a phone to "+digits" only (strip spaces, dashes, parens, etc.)
export function normalizePhone(phone: string): string {
  const digits = (phone || '').replace(/[^0-9]/g, '');
  return digits ? `+${digits}` : '';
}

function phoneToEmail(phone: string): string {
  const digits = (phone || '').replace(/[^0-9]/g, '');
  return `phone_${digits}@whathouse.app`;
}

const DEFAULT_PASSWORD = 'WhatHouse2026!SecureDefault';

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase.from('profiles').select('*').eq('user_id', userId).single();
  return data as Profile | null;
}

// Generates a unique token for this device session
function generateSessionToken(): string {
  let t = localStorage.getItem('whathouse_device_token');
  if (!t) {
    t = `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem('whathouse_device_token', t);
  }
  return t;
}

async function claimActiveSession(userId: string) {
  const token = generateSessionToken();
  await supabase.from('active_sessions' as any).upsert(
    { user_id: userId, session_token: token, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' }
  );
  return token;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const sessionChannelRef = useRef<any>(null);
  const myTokenRef = useRef<string>('');

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

  // Listen for session takeover + heartbeat presence
  useEffect(() => {
    if (!user?.id) return;
    if (sessionChannelRef.current) {
      supabase.removeChannel(sessionChannelRef.current);
      sessionChannelRef.current = null;
    }
    // Note: Auto-logout on session takeover disabled — only the user can log out
    // explicitly via the Profil/Paramètres "Se déconnecter" button.
    sessionChannelRef.current = null;

    // Ensure we own the session token (in case session was restored from storage)
    if (!myTokenRef.current) {
      claimActiveSession(user.id).then(t => { myTokenRef.current = t; });
    }

    // Heartbeat every 20s to keep online status responsive.
    const heartbeat = setInterval(() => {
      supabase.from('active_sessions' as any).update({ updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('session_token', myTokenRef.current || generateSessionToken())
        .then(() => {});
    }, 20_000);

    return () => {
      clearInterval(heartbeat);
      if (sessionChannelRef.current) {
        supabase.removeChannel(sessionChannelRef.current);
        sessionChannelRef.current = null;
      }
    };
  }, [user?.id]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      buildUser(session);
    });
    supabase.auth.getSession().then(({ data: { session } }) => buildUser(session));
    return () => subscription.unsubscribe();
  }, []);

  const loginWithPhone = async (phone: string) => {
    const normalized = normalizePhone(phone);
    if (!normalized) return false;
    const email = phoneToEmail(normalized);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: DEFAULT_PASSWORD });
    if (error || !data.user) return false;
    myTokenRef.current = await claimActiveSession(data.user.id);
    return true;
  };

  const verifyOtp = async (phone: string, _otp: string) => {
    return loginWithPhone(phone);
  };

  const signup = async (phone: string, firstName: string, lastName: string, userEmail?: string, userPassword?: string): Promise<SignupResult> => {
    // Pre-check: does a profile already exist for this normalized phone?
    const normalized = normalizePhone(phone);
    if (!normalized) return { ok: false, reason: 'unknown' };
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('phone', normalized)
      .maybeSingle();
    if (existing) return { ok: false, reason: 'duplicate' };

    const internalEmail = phoneToEmail(normalized);
    const { error } = await supabase.auth.signUp({
      email: internalEmail,
      password: DEFAULT_PASSWORD,
      options: {
        data: { first_name: firstName, last_name: lastName, phone: normalized },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) {
      const msg = (error.message || '').toLowerCase();
      if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
        return { ok: false, reason: 'duplicate' };
      }
      return { ok: false, reason: 'unknown' };
    }
    await new Promise(r => setTimeout(r, 500));
    const { data, error: loginError } = await supabase.auth.signInWithPassword({ email: internalEmail, password: DEFAULT_PASSWORD });
    if (loginError || !data.user) return { ok: false, reason: 'unknown' };
    myTokenRef.current = await claimActiveSession(data.user.id);

    // Optional: persist user's real email + password
    try {
      if (userEmail && userEmail.trim()) {
        await supabase.auth.updateUser({ email: userEmail.trim() });
      }
      if (userPassword && userPassword.trim().length >= 6) {
        await supabase.auth.updateUser({ password: userPassword.trim() });
      }
    } catch (e) {
      console.warn('updateUser email/password failed', e);
    }

    // Auto-create the WordPress / zwandako user in background.
    try {
      supabase.functions.invoke('wp-proxy', { body: { action: 'ensure_user', userId: data.user.id } }).then(({ error }) => {
        if (error) console.warn('ensure_user failed', error);
      });
    } catch (e) {
      console.warn('ensure_user invoke threw', e);
    }

    return { ok: true };
  };

  const updateEmail = async (newEmail: string) => {
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    return !error;
  };

  const updatePassword = async (newPassword: string) => {
    if (!newPassword || newPassword.length < 6) return false;
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return !error;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithPhone, verifyOtp, signup, updateEmail, updatePassword, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
