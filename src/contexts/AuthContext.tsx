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
  loginWithPhone: (phone: string, password?: string) => Promise<boolean>;
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

function isSyntheticEmail(email: string) {
  return !email || email.startsWith('phone_') || email.endsWith('@whathouse.app');
}

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('id, user_id, first_name, last_name, phone, avatar_url, background_url, wp_user_id, account_type, ghost_mode, created_at, updated_at')
    .eq('user_id', userId)
    .single();
  if (!data) return null;
  // email column is column-revoked from authenticated for privacy;
  // owners fetch their own email via SECURITY DEFINER rpc.
  const { data: myEmail } = await supabase.rpc('get_my_email' as any);
  return { ...(data as any), email: (myEmail as any) || null } as Profile | null;
}

async function upsertProfile(input: { userId: string; firstName?: string; lastName?: string; phone?: string; email?: string; wpUserId?: number }) {
  const row: Record<string, unknown> = { user_id: input.userId };
  if (input.firstName !== undefined) row.first_name = input.firstName;
  if (input.lastName !== undefined) row.last_name = input.lastName;
  if (input.phone !== undefined) row.phone = input.phone || null;
  if (input.email !== undefined) row.email = input.email || null;
  if (input.wpUserId !== undefined) row.wp_user_id = input.wpUserId || null;
  await supabase.from('profiles').upsert(row as any, { onConflict: 'user_id' });
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
        email: isSyntheticEmail(session.user.email || '') ? (profile?.email || '') : (session.user.email || profile?.email || ''),
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

  const loginWithPhone = async (phone: string, password?: string) => {
    const normalized = normalizePhone(phone);
    if (!normalized) return false;
    if (!password) return false;
    const { data: phoneData, error: phoneError } = await supabase.functions.invoke('wp-proxy', {
      body: { action: 'phone_login_check', payload: { phone: normalized, password } },
    });
    if (phoneError || !phoneData?.ok || !phoneData?.email) return false;
    const loginEmail = String(phoneData.email).trim().toLowerCase();
    const { data, error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
    if (error || !data.user) return false;
    await upsertProfile({ userId: data.user.id, phone: normalized, email: loginEmail });
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
      await upsertProfile({ userId: data.user.id, email: trimmed });
      myTokenRef.current = await claimActiveSession(data.user.id);
      return true;
    }

    // 2. Fallback: validate against Zwandako, mirror/update the local auth user,
    //    then sign in normally so WhatHouse and Zwandako remain one account.
    try {
      const { data: wpData, error: wpError } = await supabase.functions.invoke('wp-proxy', {
        body: { action: 'wp_login_check', payload: { email: trimmed, password } },
      });
      if (wpError || !wpData?.ok || !wpData?.wp_user) return false;
      await new Promise(r => setTimeout(r, 300));
      const { data: loginData } = await supabase.auth.signInWithPassword({ email: trimmed, password });
      if (!loginData?.user) return false;
      await upsertProfile({ userId: loginData.user.id, email: trimmed });
      myTokenRef.current = await claimActiveSession(loginData.user.id);
      return true;
    } catch {
      return false;
    }
  };

  const verifyOtp = async (phone: string, _otp: string) => {
    return loginWithPhone(phone, _otp);
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

    const { data: mirrorData, error: mirrorError } = await supabase.functions.invoke('wp-proxy', {
      body: {
        action: 'signup_mirror',
        payload: { email: realEmail, password: realPassword, phone: normalized, first_name: firstName, last_name: lastName },
      },
    });
    if (mirrorError || !mirrorData?.ok) {
      if (mirrorData?.reason === 'duplicate' || mirrorData?.error === 'duplicate') return { ok: false, reason: 'duplicate' };
      return { ok: false, reason: 'unknown' };
    }

    await new Promise(r => setTimeout(r, 300));
    const { data, error: loginError } = await supabase.auth.signInWithPassword({ email: realEmail, password: realPassword });
    if (loginError || !data.user) return { ok: false, reason: 'unknown' };
    myTokenRef.current = await claimActiveSession(data.user.id);

    return { ok: true };
  };

  const updateEmail = async (newEmail: string) => {
    const clean = newEmail.trim().toLowerCase();
    const { error } = await supabase.auth.updateUser({ email: clean });
    if (!error && user?.id) await supabase.from('profiles').update({ email: clean } as any).eq('user_id', user.id);
    return !error;
  };

  const updatePassword = async (newPassword: string) => {
    if (!newPassword || newPassword.length < 6) return false;
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (!error) await ensureWpUser(newPassword);
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
