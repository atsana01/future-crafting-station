-- Add RLS policy fix to allow vendors to access the secure-uploads bucket for chat files
CREATE POLICY "Allow vendors to access chat files"
ON storage.objects
FOR ALL
USING (
  bucket_id = 'secure-uploads' 
  AND (
    -- Allow if user is involved in the quote request (extract quote_request_id from path)
    EXISTS (
      SELECT 1 FROM quote_requests qr 
      WHERE (storage.foldername(name))[2] = qr.id::text
      AND (qr.client_id = auth.uid() OR qr.vendor_id = auth.uid())
    )
  )
);

-- Add function to check if vendor is ETEK registered
CREATE OR REPLACE FUNCTION public.get_vendor_etek_status(vendor_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT COALESCE(
    (
      SELECT EXISTS(
        SELECT 1 
        FROM jsonb_array_elements(licenses_certifications) AS cert
        WHERE (cert->>'etek_registered')::boolean = true
      )
      FROM vendor_profiles 
      WHERE user_id = vendor_user_id
    ), 
    false
  );
$$;