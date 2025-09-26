-- Fix security audit logs access policy
-- Drop the overly restrictive policy that blocks all access
DROP POLICY IF EXISTS "System admins can view audit logs" ON public.security_audit_logs;

-- Create a policy that allows users to view their own security events
CREATE POLICY "Users can view their own security events"
ON public.security_audit_logs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Create a security definer function to check for admin role (for future use)
CREATE OR REPLACE FUNCTION public.is_security_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- For now, return false until proper admin role system is implemented
  -- This can be updated later to check against a user_roles table
  SELECT false;
$$;

-- Create admin policy for future admin access (currently inactive)
CREATE POLICY "Security admins can view all audit logs"
ON public.security_audit_logs
FOR SELECT
TO authenticated
USING (public.is_security_admin(auth.uid()));

-- Grant necessary permissions for the security logging function
GRANT INSERT ON public.security_audit_logs TO authenticated;

-- Create a policy to allow the logging function to insert security events
CREATE POLICY "System can insert security audit logs"
ON public.security_audit_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);