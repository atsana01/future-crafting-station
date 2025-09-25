import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logSecurityEvent, validateSession } from '@/utils/security';
import { useAuth } from '@/contexts/AuthContext';

interface SecurityContextType {
  sessionValid: boolean;
  checkSession: () => Promise<void>;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

export const useSecurityContext = () => {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error('useSecurityContext must be used within SecurityProvider');
  }
  return context;
};

interface SecurityProviderProps {
  children: React.ReactNode;
}

export const SecurityProvider: React.FC<SecurityProviderProps> = ({ children }) => {
  const [sessionValid, setSessionValid] = useState(false);
  const { user } = useAuth();

  const checkSession = async () => {
    const result = await validateSession();
    setSessionValid(result.valid);
    
    if (!result.valid && user) {
      // Force logout on invalid session
      await supabase.auth.signOut();
      await logSecurityEvent('forced_logout_invalid_session', 'authentication');
    }
  };

  useEffect(() => {
    if (user) {
      checkSession();
      
      // Set up session monitoring
      const interval = setInterval(checkSession, 5 * 60 * 1000); // Check every 5 minutes
      
      return () => clearInterval(interval);
    } else {
      setSessionValid(false);
    }
  }, [user]);

  // Monitor for suspicious activity
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        logSecurityEvent('user_tab_hidden', 'user_activity');
      } else {
        logSecurityEvent('user_tab_visible', 'user_activity');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const value: SecurityContextType = {
    sessionValid,
    checkSession
  };

  return (
    <SecurityContext.Provider value={value}>
      {children}
    </SecurityContext.Provider>
  );
};