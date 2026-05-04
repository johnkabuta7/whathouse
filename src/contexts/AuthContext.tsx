import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface Profile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email?: string | null;
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

function isSyntheticEmail(email: string) {
  return !email || email.startsWith('phone_') || email.endsWith('@whathouse.app');
}

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase.from('profiles').select('*').eq('user_id', userId).single();
  return data as Profile | null;
}

async function upsertProfile(input: { userId: string; firstName?: string; lastName?: string; phone?: string; email?: string; wpUserId?: number }) {
  await supabase.from('profiles').upsert({
    user_id: input.userId,
    first_name: input.firstName || '',
    last_name: input.lastName || '',
    phone: input.phone || null,
    email: input.email || null,
    wp_user_id: input.wpUserId || null,
  } as any, { onConflict: 'user_id' });
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

async function ensureWpUser(password?: string) {
  try {
    const { data, error } = await supabase.functions.invoke('wp-proxy', {
      body: { action: 'ensure_user', payload: { password } },
    });
    return !error && data?.ok !== false;
  } catch (e) {
    console.warn('ensure_user invoke threw', e);
    return false;
  }
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
        email: isSyntheticEmail(session.user.email || '') ? '' : (session.user.email || ''),
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

  // Login by real email + password. Used by:
  //   1. Existing zwandako.com users — we validate their creds against WP via
  //      the wp-proxy edge function, then sign them into Supabase (creating a
  //      mirror account silently if it doesn't exist yet).
  //   2. WhatHouse users who set an email + password during signup.
  const loginWithEmail = async (email: string, password: string) => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !password) return false;

    // 1. Try direct Supabase login first (works for users created with real email).
    const { data, error } = await supabase.auth.signInWithPassword({ email: trimmed, password });
    if (!error && data.user) {
      myTokenRef.current = await claimActiveSession(data.user.id);
      return true;
    }

    // 2. Fallback: validate against WordPress and migrate the account.
    try {
      const { data: wpData, error: wpError } = await supabase.functions.invoke('wp-proxy', {
        body: { action: 'wp_login_check', payload: { email: trimmed, password } },
      });
      if (wpError || !wpData?.ok || !wpData?.wp_user) return false;
      const wp = wpData.wp_user;
      // Try to sign up a Supabase user with these creds. If the email already
      // exists in Supabase but with a different password, we cannot recover
      // automatically and the user has to use phone-based login.
      const phone = wp.phone ? normalizePhone(wp.phone) : '';
      const { data: signupData, error: signupError } = await supabase.auth.signUp({
        email: trimmed,
        password,
        options: {
          data: {
            first_name: wp.first_name || '',
            last_name: wp.last_name || '',
            phone,
            wp_user_id: wp.id,
          },
          emailRedirectTo: window.location.origin,
        },
      });
      if (signupError || !signupData.user) return false;
      // Login with the freshly-created session.
      const { data: loginData } = await supabase.auth.signInWithPassword({ email: trimmed, password });
      if (!loginData?.user) return false;
      myTokenRef.current = await claimActiveSession(loginData.user.id);
      await upsertProfile({
        userId: loginData.user.id,
        firstName: wp.first_name || '',
        lastName: wp.last_name || '',
        phone,
        email: trimmed,
        wpUserId: wp.id,
      });
      await ensureWpUser(password);
      return true;
    } catch {
      return false;
    }
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

    const realEmail = userEmail?.trim().toLowerCase() || '';
    const realPassword = userPassword?.trim() || '';
    if (!realEmail) return { ok: false, reason: 'unknown' };
    if (realPassword.length < 6) return { ok: false, reason: 'unknown' };
    const { error } = await supabase.auth.signUp({
      email: realEmail,
      password: realPassword,
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
    const { data, error: loginError } = await supabase.auth.signInWithPassword({ email: realEmail, password: realPassword });
    if (loginError || !data.user) return { ok: false, reason: 'unknown' };
    myTokenRef.current = await claimActiveSession(data.user.id);
    await upsertProfile({ userId: data.user.id, firstName, lastName, phone: normalized, email: realEmail });

    // Auto-create the WordPress / zwandako user in background — pass the
    // user's real password so it gets mirrored on WP and they can log into
    // zwandako.com with the same credentials.
    await ensureWpUser(realPassword);

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
    <AuthContext.Provider value={{ user, loading, loginWithPhone, loginWithEmail, verifyOtp, signup, updateEmail, updatePassword, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
