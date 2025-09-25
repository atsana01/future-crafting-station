import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { logSecurityEvent } from '@/utils/security';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  rememberMe: boolean;
  setRememberMe: (remember: boolean) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem('rememberMe') !== 'false';
  });

  useEffect(() => {
    // Update localStorage when rememberMe changes
    localStorage.setItem('rememberMe', rememberMe.toString());
  }, [rememberMe]);

  useEffect(() => {
    // Set up auth state listener first with security logging
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Log auth state changes for security monitoring
        if (event === 'SIGNED_IN') {
          setTimeout(() => {
            logSecurityEvent('auth_state_signed_in', 'authentication');
          }, 0);
        } else if (event === 'SIGNED_OUT') {
          setTimeout(() => {
            logSecurityEvent('auth_state_signed_out', 'authentication');
          }, 0);
        } else if (event === 'TOKEN_REFRESHED') {
          setTimeout(() => {
            logSecurityEvent('auth_token_refreshed', 'authentication');
          }, 0);
        }

        // Handle redirect after login based on user type
        if (event === 'SIGNED_IN' && session?.user) {
          setTimeout(() => {
            supabase
              .from('profiles')
              .select('user_type')
              .eq('user_id', session.user.id)
              .single()
              .then(({ data: profile }) => {
                const currentPath = window.location.pathname;
                if (profile?.user_type === 'vendor') {
                  // Vendors should go to vendor dashboard unless already there
                  if (currentPath === '/auth' || currentPath === '/') {
                    window.location.href = '/vendor-dashboard';
                  }
                } else {
                  // Clients can access any page they were trying to reach
                  if (currentPath === '/auth') {
                    window.location.href = '/';
                  }
                }
              });
          }, 0);
        }
      }
    );

    // Then check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await logSecurityEvent('user_logout', 'authentication');
    await supabase.auth.signOut();
    // Clear remember me preference on logout
    localStorage.removeItem('rememberMe');
    setRememberMe(true); // Reset to default
    // Redirect to landing page after logout
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading, 
      rememberMe, 
      setRememberMe, 
      signOut 
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