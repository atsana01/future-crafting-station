import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { EyeIcon, EyeOffIcon, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showResendOption, setShowResendOption] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const handlePasswordReset = async () => {
      try {
        // Check for password reset tokens
        const accessToken = searchParams.get('access_token');
        const refreshToken = searchParams.get('refresh_token');
        const type = searchParams.get('type');
        
        // Handle different auth scenarios
        if (type === 'recovery' && accessToken && refreshToken) {
          console.log('Processing password reset with tokens...');
          
          // Set the session with the tokens from the URL
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });

          if (error) {
            console.error('Session set error:', error);
            setError('Failed to authenticate reset link. The link may be expired or invalid.');
            setShowResendOption(true);
          } else {
            console.log('Password reset session established successfully');
            setIsValidSession(true);
            // Session is valid, user can proceed to reset password
          }
        } else {
          // Check if user is already authenticated (direct access)
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            setIsValidSession(true);
          } else {
            // No valid reset tokens found
            setError('Invalid or expired password reset link. Please request a new password reset email.');
            setShowResendOption(true);
          }
        }
      } catch (error) {
        console.error('Error in password reset flow:', error);
        setError('An error occurred while processing the reset link.');
        setShowResendOption(true);
      }
    };

    handlePasswordReset();
  }, [searchParams]);

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!/(?=.*[a-z])/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/(?=.*\d)/.test(password)) {
      return 'Password must contain at least one number';
    }
    return null;
  };

  const handleResendReset = async () => {
    const email = prompt('Please enter your email address to receive a new password reset link:');
    if (!email) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) throw error;

      toast.success('Password reset email sent! Please check your inbox.');
      setShowResendOption(false);
      setError('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) {
        setError(updateError.message);
        setIsLoading(false);
        return;
      }

      toast.success('Password updated successfully! You are now logged in.');
      
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Redirect to appropriate dashboard based on user type
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_type')
          .single();
        
        if (profile?.user_type === 'vendor') {
          navigate('/tickets'); // Vendor dashboard
        } else {
          navigate('/tickets'); // Client dashboard
        }
      } catch {
        navigate('/tickets'); // Default fallback
      }
      
    } catch (error) {
      console.error('Error updating password:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center space-x-2 mb-8">
          <img src="/buildeasy-logo.png" alt="BuildEasy Logo" className="h-32 w-auto object-contain" />
        </div>

        <Card className="shadow-elegant bg-white/90 backdrop-blur-sm border border-white/20">
          <CardHeader className="text-center space-y-2">
            <CardTitle className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Reset Your Password
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {isValidSession ? 'Enter your new password below' : 'Validating reset link...'}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {error}
                  {showResendOption && (
                    <div className="mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleResendReset}
                        disabled={isLoading}
                        className="w-full"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Request New Reset Link
                      </Button>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {isValidSession && !showResendOption && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your new password"
                      className="pr-10"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOffIcon className="h-4 w-4" />
                      ) : (
                        <EyeIcon className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm your new password"
                      className="pr-10"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOffIcon className="h-4 w-4" />
                      ) : (
                        <EyeIcon className="h-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Password Requirements */}
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p className="font-medium">Password requirements:</p>
                  <div className="grid grid-cols-1 gap-1">
                    <div className={`flex items-center space-x-2 ${password.length >= 8 ? 'text-green-600' : ''}`}>
                      {password.length >= 8 ? <CheckCircle2 className="h-3 w-3" /> : <div className="h-3 w-3 rounded-full border border-muted-foreground/30" />}
                      <span>At least 8 characters</span>
                    </div>
                    <div className={`flex items-center space-x-2 ${/(?=.*[a-z])/.test(password) ? 'text-green-600' : ''}`}>
                      {/(?=.*[a-z])/.test(password) ? <CheckCircle2 className="h-3 w-3" /> : <div className="h-3 w-3 rounded-full border border-muted-foreground/30" />}
                      <span>One lowercase letter</span>
                    </div>
                    <div className={`flex items-center space-x-2 ${/(?=.*[A-Z])/.test(password) ? 'text-green-600' : ''}`}>
                      {/(?=.*[A-Z])/.test(password) ? <CheckCircle2 className="h-3 w-3" /> : <div className="h-3 w-3 rounded-full border border-muted-foreground/30" />}
                      <span>One uppercase letter</span>
                    </div>
                    <div className={`flex items-center space-x-2 ${/(?=.*\d)/.test(password) ? 'text-green-600' : ''}`}>
                      {/(?=.*\d)/.test(password) ? <CheckCircle2 className="h-3 w-3" /> : <div className="h-3 w-3 rounded-full border border-muted-foreground/30" />}
                      <span>One number</span>
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-primary border-0 hover:opacity-90"
                  disabled={isLoading || !password || !confirmPassword}
                >
                  {isLoading ? 'Updating Password...' : 'Update Password'}
                </Button>
              </form>
            )}

            {!isValidSession && !showResendOption && (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Processing reset link...</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;