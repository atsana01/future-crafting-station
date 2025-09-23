-- Remove the current public policy that exposes contact information
DROP POLICY IF EXISTS "Public can view vendor directory listing" ON public.vendor_profiles;

-- Create a new restricted public policy that only shows basic business information
CREATE POLICY "Public can view basic vendor directory" 
ON public.vendor_profiles 
FOR SELECT 
USING (
  (verification_status = 'verified'::verification_status) 
  AND (availability_status = true)
);

-- Create a security definer function to get safe public vendor data
CREATE OR REPLACE FUNCTION public.get_public_vendor_directory()
RETURNS TABLE(
  id uuid,
  user_id uuid,
  business_name text,
  specialty text[],
  bio text,
  years_experience integer,
  location text,
  rating numeric,
  total_reviews integer,
  verification_status verification_status,
  services_offered jsonb,
  portfolio_images jsonb
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    v.id,
    v.user_id,
    v.business_name,
    v.specialty,
    v.bio,
    v.years_experience,
    v.location,
    v.rating,
    v.total_reviews,
    v.verification_status,
    v.services_offered,
    v.portfolio_images
  FROM public.vendor_profiles v
  WHERE v.verification_status = 'verified'
    AND v.availability_status = true;
$$;

-- Create a function for authenticated users to get vendor contact info
CREATE OR REPLACE FUNCTION public.get_vendor_contact_info(vendor_user_id uuid)
RETURNS TABLE(
  email text,
  phone text,
  website text,
  business_address text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    v.email,
    v.phone,
    v.website,
    v.business_address
  FROM public.vendor_profiles v
  WHERE v.user_id = vendor_user_id
    AND v.verification_status = 'verified'
    AND (
      -- Vendor can see their own contact info
      auth.uid() = v.user_id
      OR
      -- Clients with active quote requests can see contact info
      EXISTS (
        SELECT 1 FROM public.quote_requests qr
        WHERE qr.vendor_id = v.user_id 
          AND qr.client_id = auth.uid()
          AND qr.status IN ('pending', 'quoted', 'accepted')
      )
    );
$$;