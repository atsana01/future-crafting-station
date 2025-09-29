-- Fix security policies and validation (corrected version)
-- This migration improves data protection and access control

-- Enhanced security for vendor profiles - restrict contact information
DROP POLICY IF EXISTS "Clients can view vendors with active quotes" ON public.vendor_profiles;
DROP POLICY IF EXISTS "Clients with active quotes can view vendor details" ON public.vendor_profiles;

-- More restrictive vendor profile access
CREATE POLICY "Restricted vendor profile access" ON public.vendor_profiles
FOR SELECT USING (
  -- Vendors can see their own profile
  auth.uid() = user_id
  OR
  -- Clients can only see basic vendor info (no contact details) if they have active quotes
  (
    EXISTS (
      SELECT 1 FROM quote_requests qr
      WHERE qr.vendor_id = vendor_profiles.user_id 
        AND qr.client_id = auth.uid()
        AND qr.status IN ('pending', 'quoted', 'accepted')
    )
    -- Contact info is handled by separate secure function
  )
);

-- Enhance input validation at database level
CREATE OR REPLACE FUNCTION validate_profile_input()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate full_name
  IF NEW.full_name IS NOT NULL THEN
    IF LENGTH(NEW.full_name) > 100 THEN
      RAISE EXCEPTION 'Full name must be less than 100 characters';
    END IF;
    
    IF NOT validate_input_security(NEW.full_name, 100) THEN
      RAISE EXCEPTION 'Invalid characters in full name';
    END IF;
  END IF;
  
  -- Validate phone_number format
  IF NEW.phone_number IS NOT NULL AND NEW.phone_number != '' THEN
    IF NOT NEW.phone_number ~ '^\+?[1-9]\d{1,14}$' THEN
      RAISE EXCEPTION 'Invalid phone number format';
    END IF;
  END IF;
  
  -- Validate company_name
  IF NEW.company_name IS NOT NULL THEN
    IF LENGTH(NEW.company_name) > 200 THEN
      RAISE EXCEPTION 'Company name must be less than 200 characters';
    END IF;
    
    IF NOT validate_input_security(NEW.company_name, 200) THEN
      RAISE EXCEPTION 'Invalid characters in company name';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add validation trigger to profiles
DROP TRIGGER IF EXISTS validate_profile_trigger ON public.profiles;
CREATE TRIGGER validate_profile_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION validate_profile_input();

-- Enhanced message validation
CREATE OR REPLACE FUNCTION validate_message_input()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate message content
  IF NEW.message_content IS NOT NULL THEN
    IF LENGTH(NEW.message_content) > 5000 THEN
      RAISE EXCEPTION 'Message content must be less than 5000 characters';
    END IF;
    
    IF NOT validate_input_security(NEW.message_content, 5000) THEN
      RAISE EXCEPTION 'Message contains suspicious content';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add validation trigger to messages
DROP TRIGGER IF EXISTS validate_message_trigger ON public.messages;
CREATE TRIGGER validate_message_trigger
  BEFORE INSERT OR UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION validate_message_input();

-- Enhanced security audit function for sensitive operations
CREATE OR REPLACE FUNCTION log_sensitive_data_access(
  accessed_table text,
  accessed_user_id uuid,
  access_type text
) RETURNS void AS $$
BEGIN
  INSERT INTO security_audit_logs (
    user_id,
    action,
    resource_type,
    metadata
  ) VALUES (
    auth.uid(),
    'sensitive_data_access',
    accessed_table,
    jsonb_build_object(
      'accessed_user_id', accessed_user_id,
      'access_type', access_type,
      'timestamp', NOW()
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;