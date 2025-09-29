-- Fix security warnings by setting proper search_path
-- This addresses the function search path security warnings

-- Fix validate_profile_input function
CREATE OR REPLACE FUNCTION validate_profile_input()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Fix validate_message_input function
CREATE OR REPLACE FUNCTION validate_message_input()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Fix log_sensitive_data_access function
CREATE OR REPLACE FUNCTION log_sensitive_data_access(
  accessed_table text,
  accessed_user_id uuid,
  access_type text
) RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;