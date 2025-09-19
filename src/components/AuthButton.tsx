import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, LogOut, Settings, ChevronDown, Building, LayoutDashboard } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Link, useNavigate } from 'react-router-dom';

export const AuthButton = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [userType, setUserType] = useState<'client' | 'vendor'>('client');

  useEffect(() => {
    if (user) {
      supabase
        .from('profiles')
        .select('user_type')
        .eq('user_id', user.id)
        .single()
        .then(({ data }) => {
          setUserType(data?.user_type || 'client');
        });
    }
  }, [user]);

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast({
        title: "Signed out successfully",
        description: "You have been logged out of your account.",
      });
      
      navigate('/');
    } catch (error: any) {
      toast({
        title: "Error signing out",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  const displayText = userType === 'vendor' ? 'Vendor Dashboard' : 'Account';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2" disabled={isLoading}>
          <User className="h-4 w-4" />
          {displayText}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {user.email}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {userType === 'vendor' ? 'Vendor Account' : 'Client Account'}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuItem asChild>
          <Link to={userType === 'vendor' ? '/vendor-dashboard' : '/tickets'} className="w-full cursor-pointer">
            <LayoutDashboard className="mr-2 h-4 w-4" />
            {userType === 'vendor' ? 'Vendor Dashboard' : 'Dashboard'}
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuItem asChild>
          <Link to="/profile" className="w-full cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            Profile Settings
          </Link>
        </DropdownMenuItem>

        {userType === 'vendor' && (
          <DropdownMenuItem asChild>
            <Link to="/business-information" className="w-full cursor-pointer">
              <Building className="mr-2 h-4 w-4" />
              Business Information
            </Link>
          </DropdownMenuItem>
        )}
        
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} disabled={isLoading}>
          <LogOut className="mr-2 h-4 w-4" />
          {isLoading ? 'Signing out...' : 'Sign out'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};