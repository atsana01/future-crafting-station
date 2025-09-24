-- Remove the problematic public access policy that exposes vendor contact info
DROP POLICY IF EXISTS "Public can view basic vendor directory" ON public.vendor_profiles;

-- The existing secure functions get_public_vendor_directory() and get_vendor_contact_info() 
-- already provide the correct level of access control:
-- 1. get_public_vendor_directory() - exposes only safe business info to everyone
-- 2. get_vendor_contact_info() - exposes contact info only to authorized users

-- Add a comment to document the security model
COMMENT ON FUNCTION public.get_public_vendor_directory() IS 'Public-safe vendor directory that excludes sensitive contact information. Use this function instead of direct table access.';
COMMENT ON FUNCTION public.get_vendor_contact_info(uuid) IS 'Secure contact info access for vendors (own info) and clients with active quotes only.';