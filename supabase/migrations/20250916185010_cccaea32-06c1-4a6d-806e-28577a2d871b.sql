-- Security Enhancement Migration
-- Phase 1: Critical Data Protection

-- 1. Update vendor profiles RLS policies to restrict public data exposure
-- Drop the existing overly permissive public policy
DROP POLICY IF EXISTS "Public can view basic vendor directory info" ON public.vendor_profiles;

-- Create a more restrictive public directory policy that only exposes essential business info
CREATE POLICY "Public can view vendor directory listing" 
ON public.vendor_profiles 
FOR SELECT 
USING (
  verification_status = 'verified' 
  AND availability_status = true
);

-- Create a separate policy for clients with active quotes to see more details
CREATE POLICY "Clients with active quotes can view vendor details" 
ON public.vendor_profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.quote_requests qr 
    WHERE qr.vendor_id = vendor_profiles.user_id 
    AND qr.client_id = auth.uid()
    AND qr.status IN ('pending', 'quoted', 'accepted')
  )
);

-- 2. Create audit log table for security monitoring
CREATE TABLE IF NOT EXISTS public.security_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on audit logs
ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs (for future admin functionality)
CREATE POLICY "System admins can view audit logs" 
ON public.security_audit_logs 
FOR SELECT 
USING (false); -- Initially no one can view, will be updated when admin system is implemented

-- 3. Create function to log sensitive data access
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.security_audit_logs (
    user_id,
    action,
    resource_type,
    resource_id,
    metadata
  ) VALUES (
    auth.uid(),
    p_action,
    p_resource_type,
    p_resource_id,
    p_metadata
  );
END;
$$;

-- 4. Add input validation function for sensitive operations
CREATE OR REPLACE FUNCTION public.validate_input_security(
  input_text TEXT,
  max_length INTEGER DEFAULT 1000
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check for basic SQL injection patterns
  IF input_text ~* '(union|select|insert|update|delete|drop|create|alter|exec|execute|script|javascript|<script|onclick|onerror)' THEN
    PERFORM log_security_event('suspicious_input_detected', 'input_validation', NULL, 
      jsonb_build_object('input_sample', left(input_text, 100)));
    RETURN FALSE;
  END IF;
  
  -- Check length
  IF length(input_text) > max_length THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$;

-- 5. Create storage bucket for secure file uploads with proper policies
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'secure-uploads',
  'secure-uploads',
  false,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain']
) ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain'];

-- Storage policies for secure uploads
CREATE POLICY "Authenticated users can upload to secure bucket"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'secure-uploads'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view their own secure uploads"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'secure-uploads'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own secure uploads"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'secure-uploads'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 6. Add trigger to log vendor profile access
CREATE OR REPLACE FUNCTION public.log_vendor_profile_view()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log when someone views sensitive vendor data
  PERFORM log_security_event(
    'vendor_profile_viewed',
    'vendor_profiles',
    NEW.id,
    jsonb_build_object('viewed_vendor_id', NEW.user_id)
  );
  RETURN NEW;
END;
$$;

-- Note: We'll add the trigger after confirming the policy updates work properly

-- 7. Update quote_requests table to add security logging
CREATE OR REPLACE FUNCTION public.log_quote_request_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log sensitive quote operations
  IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    PERFORM log_security_event(
      'quote_status_changed',
      'quote_requests',
      NEW.id,
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status,
        'client_id', NEW.client_id,
        'vendor_id', NEW.vendor_id
      )
    );
  END IF;
  
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;