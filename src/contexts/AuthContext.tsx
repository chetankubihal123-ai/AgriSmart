import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  isAdmin: false,
  loading: true,
  signOut: async () => { },
});

export const useAuth = () => {
  return useContext(AuthContext);
};

function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null;
  const phone = localStorage.getItem('agrismart_user_phone');
  const email = localStorage.getItem('agrismart_user_email');
  if (!phone && !email) return null;

  const isAdminUser = phone === '9739623988' || localStorage.getItem('agrismart_is_admin') === 'true';

  return {
    id: phone ? `phone_${phone}` : `email_${email}`,
    app_metadata: { provider: phone ? 'phone' : 'email' },
    user_metadata: {
      phone: phone || '',
      email: email || '',
      full_name: isAdminUser ? 'Chetan Kubihal (Admin)' : (phone ? `Farmer (+91 ${phone})` : (email?.split('@')[0] || 'Farmer')),
      role: isAdminUser ? 'admin' : 'farmer'
    },
    aud: 'authenticated',
    created_at: new Date().toISOString(),
    email: email || (phone ? `${phone}@agrismart.local` : ''),
    phone: phone ? `+91${phone}` : '',
  } as User;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(() => getStoredUser());
  const [loading, setLoading] = useState(true);

  const syncAuth = () => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        setUser(session.user);
      } else {
        setUser(getStoredUser());
      }
      setLoading(false);
    }).catch(() => {
      setUser(getStoredUser());
      setLoading(false);
    });
  };

  useEffect(() => {
    syncAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        setUser(session.user);
      } else {
        setUser(getStoredUser());
      }
      setLoading(false);
    });

    const handleCustomChange = () => {
      syncAuth();
    };

    window.addEventListener('agrismart_auth_state_changed', handleCustomChange);
    window.addEventListener('storage', handleCustomChange);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('agrismart_auth_state_changed', handleCustomChange);
      window.removeEventListener('storage', handleCustomChange);
    };
  }, []);

  const signOut = async () => {
    try {
      localStorage.removeItem('agrismart_user_phone');
      localStorage.removeItem('agrismart_user_email');
      localStorage.removeItem('agrismart_auth_method');
      localStorage.removeItem('agrismart_is_admin');
      localStorage.removeItem('user_role');
      await supabase.auth.signOut().catch(() => {});
    } finally {
      setSession(null);
      setUser(null);
      window.dispatchEvent(new Event('agrismart_auth_state_changed'));
    }
  };

  const storedPhone = typeof window !== 'undefined' ? localStorage.getItem('agrismart_user_phone') : null;
  const isAdminFlag = typeof window !== 'undefined' ? localStorage.getItem('agrismart_is_admin') === 'true' : false;

  const isAdmin = Boolean(
    storedPhone === '9739623988' ||
    isAdminFlag ||
    user?.phone?.includes('9739623988') ||
    user?.email?.includes('9739623988') ||
    user?.user_metadata?.phone?.includes('9739623988')
  );

  const value = {
    session,
    user,
    isAdmin,
    loading,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
