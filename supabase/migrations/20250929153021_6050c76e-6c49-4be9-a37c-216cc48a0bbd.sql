-- Fix critical security issues identified in security review

-- 1. Fix Password Reset Token Security
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view their own reset tokens" ON public.password_reset_tokens;

-- Create restricted policies for password reset tokens
CREATE POLICY "Users can view their own reset tokens" 
ON public.password_reset_tokens 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own reset tokens" 
ON public.password_reset_tokens 
FOR UPDATE 
USING (user_id = auth.uid() AND used_at IS NULL AND expires_at > now());

CREATE POLICY "System can insert reset tokens" 
ON public.password_reset_tokens 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- 2. Enhanced PII Protection for Profiles
-- Drop existing policy and create more restrictive ones
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Create enhanced profile access policy with stronger validation
CREATE POLICY "Users can view their own profile only" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);

-- 3. Add validation for password reset operations
CREATE OR REPLACE FUNCTION public.validate_password_reset()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log token usage for security monitoring
  IF NEW.used_at IS NOT NULL AND OLD.used_at IS NULL THEN
    PERFORM log_security_event(
      'password_reset_token_used',
      'password_reset_tokens',
      NEW.id,
      jsonb_build_object('user_id', NEW.user_id)
    );
  END IF;
  
  -- Validate token hasn't expired when being used
  IF NEW.used_at IS NOT NULL AND NEW.expires_at < now() THEN
    RAISE EXCEPTION 'Cannot use expired password reset token';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for password reset validation
CREATE TRIGGER validate_password_reset_trigger
  BEFORE UPDATE ON public.password_reset_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_password_reset();

-- 4. Add function to log sensitive profile operations
CREATE OR REPLACE FUNCTION public.log_profile_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log profile updates for security monitoring
  IF TG_OP = 'UPDATE' AND (
    OLD.full_name IS DISTINCT FROM NEW.full_name OR
    OLD.phone_number IS DISTINCT FROM NEW.phone_number OR
    OLD.address IS DISTINCT FROM NEW.address
  ) THEN
    PERFORM log_security_event(
      'profile_pii_updated',
      'profiles',
      NEW.id,
      jsonb_build_object(
        'user_id', NEW.user_id,
        'changed_fields', jsonb_build_array(
          CASE WHEN OLD.full_name IS DISTINCT FROM NEW.full_name THEN 'full_name' END,
          CASE WHEN OLD.phone_number IS DISTINCT FROM NEW.phone_number THEN 'phone_number' END,
          CASE WHEN OLD.address IS DISTINCT FROM NEW.address THEN 'address' END
        ) - NULL
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for profile update logging
CREATE TRIGGER log_profile_update_trigger
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_profile_update();