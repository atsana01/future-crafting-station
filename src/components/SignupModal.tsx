import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UserCheck, Eye, EyeOff, User, Building } from 'lucide-react';
import { validateInput, sanitizeInput, logSecurityEvent, authRateLimiter } from '@/utils/security';

interface SignupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

export const SignupModal: React.FC<SignupModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess,
  onSwitchToLogin
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedUserType, setSelectedUserType] = useState<'client' | 'vendor'>('client');
  const [businessName, setBusinessName] = useState('');
  const [vatId, setVatId] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!authRateLimiter.isAllowed(`signup_${email}`)) {
      toast.error('Too many attempts. Please wait before trying again.');
      return;
    }

    if (!validateInput(email, 254) || !validateInput(fullName, 100) || !validateInput(password, 128)) {
      toast.error('Please check all fields for valid input.');
      return;
    }

    if (businessName && !validateInput(businessName, 200)) {
      toast.error('Business name contains invalid characters.');
      return;
    }

    if (vatId && !validateInput(vatId, 50)) {
      toast.error('VAT ID contains invalid characters.');
      return;
    }

    if (businessAddress && !validateInput(businessAddress, 500)) {
      toast.error('Business address contains invalid characters.');
      return;
    }
    
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }

    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
    if (!strongPasswordRegex.test(password)) {
      toast.error('Password must contain uppercase, lowercase, number, and special character');
      return;
    }

    if (selectedUserType === 'vendor' && (!businessName || !vatId || !businessAddress)) {
      toast.error('Business name, VAT ID, and business address are required for vendors');
      return;
    }

    setLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const userData: any = {
        full_name: sanitizeInput(fullName),
        user_type: selectedUserType,
        phone_number: phoneNumber ? sanitizeInput(phoneNumber) : null,
      };

      if (selectedUserType === 'vendor') {
        userData.business_name = sanitizeInput(businessName);
        userData.vat_id = sanitizeInput(vatId);
        userData.business_address = sanitizeInput(businessAddress);
      }
      
      const { error } = await supabase.auth.signUp({
        email: sanitizeInput(email),
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: userData
        }
      });

      if (error) {
        await logSecurityEvent('signup_failed', 'auth', undefined, {
          error: error.message,
          email: sanitizeInput(email),
          user_type: selectedUserType
        });
        throw error;
      }

      await logSecurityEvent('signup_success', 'auth', undefined, {
        email: sanitizeInput(email),
        user_type: selectedUserType
      });

      toast.success('Please check your email to verify your account.');
      onClose();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async (userType: 'client' | 'vendor') => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
          queryParams: {
            user_type: userType
          }
        }
      });
      if (error) throw error;
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setFullName('');
    setBusinessName('');
    setVatId('');
    setBusinessAddress('');
    setPhoneNumber('');
    setSelectedUserType('client');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setLoading(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl bg-gradient-primary bg-clip-text text-transparent">Join BuildEasy</DialogTitle>
        </DialogHeader>

        <Card className="border-0 shadow-none">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2 justify-center">
              <UserCheck className="w-5 h-5 text-primary" />
              Create Your Account
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-fullname">Full Name</Label>
                <Input
                  id="signup-fullname"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  className="h-12"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="h-12"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <div className="relative">
                  <Input
                    id="signup-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="h-12 pr-12"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-12 px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    className="h-12 pr-12"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-12 px-3 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <Label>Account Type</Label>
                <RadioGroup
                  value={selectedUserType}
                  onValueChange={(value: 'client' | 'vendor') => setSelectedUserType(value)}
                  className="flex space-x-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="client" id="client" />
                    <Label htmlFor="client" className="font-medium">Client</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="vendor" id="vendor" />
                    <Label htmlFor="vendor" className="font-medium">Vendor</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number (Optional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Enter your phone number"
                  className="h-12"
                />
              </div>

              {selectedUserType === 'vendor' && (
                <div className="space-y-4 border-t pt-4">
                  <h4 className="font-semibold text-primary">Business Information</h4>
                  
                  <div className="space-y-2">
                    <Label htmlFor="business-name">Business Name *</Label>
                    <Input
                      id="business-name"
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="Enter your business name"
                      className="h-12"
                      required={selectedUserType === 'vendor'}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="vat-id">VAT ID *</Label>
                    <Input
                      id="vat-id"
                      type="text"
                      value={vatId}
                      onChange={(e) => setVatId(e.target.value)}
                      placeholder="Enter your VAT ID"
                      className="h-12"
                      required={selectedUserType === 'vendor'}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="business-address">Business Address *</Label>
                    <Input
                      id="business-address"
                      type="text"
                      value={businessAddress}
                      onChange={(e) => setBusinessAddress(e.target.value)}
                      placeholder="Enter your business address"
                      className="h-12"
                      required={selectedUserType === 'vendor'}
                    />
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading} variant="modern" size="lg">
                {loading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-4 text-muted-foreground font-medium">Or sign up with</span>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full h-12"
                onClick={() => handleGoogleSignUp('client')}
                disabled={loading}
              >
                <User className="w-5 h-5 mr-3" />
                Signup as Client with Google
              </Button>
              
              <Button
                variant="outline"
                className="w-full h-12"
                onClick={() => handleGoogleSignUp('vendor')}
                disabled={loading}
              >
                <Building className="w-5 h-5 mr-3" />
                Signup as Vendor with Google
              </Button>
            </div>

            <div className="text-center text-sm mt-6">
              <span className="text-muted-foreground">Already have an account? </span>
              <Button 
                variant="link" 
                onClick={onSwitchToLogin}
                className="p-0 h-auto text-primary hover:text-primary/80 font-medium"
              >
                Sign in here
              </Button>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
};