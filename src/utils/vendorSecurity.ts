import { supabase } from '@/integrations/supabase/client';

// Get vendor contact information for authenticated users with access
export const getVendorContactInfo = async (vendorUserId: string) => {
  try {
    const { data, error } = await supabase
      .rpc('get_vendor_contact_info', { vendor_user_id: vendorUserId });
    
    if (error) {
      console.error('Error fetching vendor contact info:', error);
      return null;
    }
    
    return data?.[0] || null;
  } catch (error) {
    console.error('Failed to fetch vendor contact info:', error);
    return null;
  }
};

// Get public vendor directory (no contact info)
export const getPublicVendorDirectory = async () => {
  try {
    const { data, error } = await supabase.rpc('get_public_vendor_directory');
    
    if (error) {
      console.error('Error fetching public vendor directory:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Failed to fetch public vendor directory:', error);
    return [];
  }
};

// Get filtered vendors by IDs for authenticated users
export const getVendorsByIds = async (vendorIds: string[]) => {
  try {
    const allVendors = await getPublicVendorDirectory();
    return allVendors.filter(vendor => vendorIds.includes(vendor.user_id));
  } catch (error) {
    console.error('Failed to fetch vendors by IDs:', error);
    return [];
  }
};