import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logSecurityEvent, authRateLimiter, validatePassword } from '@/utils/security';
import { toast } from 'sonner';

export const useSecureAuth = () => {
  const [loading, setLoading] = useState(false);

  const signIn = async (email: string, password: string) => {
    // Rate limiting check
    if (!authRateLimiter.isAllowed(`signin_${email}`)) {
      const error = new Error('Too many sign-in attempts. Please try again later.');
      await logSecurityEvent('signin_rate_limited', 'authentication', undefined, { email });
      toast.error('Too many sign-in attempts. Please try again later.');
      return { error };
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        await logSecurityEvent('signin_failed', 'authentication', undefined, { 
          email, 
          error: error.message 
        });
        toast.error(error.message);
      } else {
        await logSecurityEvent('signin_success', 'authentication');
        toast.success('Sign in successful!');
      }

      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, userData?: any) => {
    // Rate limiting check
    if (!authRateLimiter.isAllowed(`signup_${email}`)) {
      const error = new Error('Too many sign-up attempts. Please try again later.');
      await logSecurityEvent('signup_rate_limited', 'authentication', undefined, { email });
      toast.error('Too many sign-up attempts. Please try again later.');
      return { error };
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      const error = new Error(passwordValidation.errors.join(', '));
      toast.error('Password does not meet security requirements');
      return { error };
    }

    setLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: userData
        }
      });

      if (error) {
        await logSecurityEvent('signup_failed', 'authentication', undefined, { 
          email, 
          error: error.message 
        });
        toast.error(error.message);
      } else {
        await logSecurityEvent('signup_success', 'authentication');
        toast.success('Sign up successful! Please check your email for verification.');
      }

      return { error };
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        await logSecurityEvent('password_reset_failed', 'authentication', undefined, { 
          email, 
          error: error.message 
        });
        toast.error(error.message);
      } else {
        await logSecurityEvent('password_reset_requested', 'authentication', undefined, { email });
        toast.success('Password reset email sent!');
      }

      return { error };
    } finally {
      setLoading(false);
    }
  };

  return {
    signIn,
    signUp,
    resetPassword,
    loading
  };
};