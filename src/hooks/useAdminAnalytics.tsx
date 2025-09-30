import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DashboardAnalytics {
  total_users: number;
  total_vendors: number;
  total_clients: number;
  total_quotes: number;
  total_projects: number;
  active_projects: number;
  avg_vendor_response_time: number;
  total_invoices: number;
  total_revenue: number;
  quotes_by_status: Record<string, number>;
  recent_signups: number;
  recent_quotes: number;
}

interface UserGrowthData {
  date: string;
  total_signups: number;
  vendor_signups: number;
  client_signups: number;
}

interface VendorPerformance {
  vendor_id: string;
  business_name: string;
  rating: number;
  total_reviews: number;
  response_time_hours: number;
  total_quotes: number;
  accepted_quotes: number;
  acceptance_rate: number;
}

export const useAdminAnalytics = () => {
  const [dashboardData, setDashboardData] = useState<DashboardAnalytics | null>(null);
  const [userGrowth, setUserGrowth] = useState<UserGrowthData[]>([]);
  const [vendorPerformance, setVendorPerformance] = useState<VendorPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardAnalytics = async () => {
    try {
      const { data, error } = await supabase.rpc('get_dashboard_analytics');
      
      if (error) throw error;
      
      setDashboardData(data as unknown as DashboardAnalytics);
    } catch (err: any) {
      console.error('Error fetching dashboard analytics:', err);
      setError(err.message);
      toast.error('Failed to load dashboard analytics');
    }
  };

  const fetchUserGrowth = async (days: number = 30) => {
    try {
      const { data, error } = await supabase.rpc('get_user_growth_analytics', { days });
      
      if (error) throw error;
      
      setUserGrowth((data as unknown as UserGrowthData[]) || []);
    } catch (err: any) {
      console.error('Error fetching user growth:', err);
      toast.error('Failed to load user growth data');
    }
  };

  const fetchVendorPerformance = async () => {
    try {
      const { data, error } = await supabase.rpc('get_vendor_performance_metrics');
      
      if (error) throw error;
      
      setVendorPerformance((data as unknown as VendorPerformance[]) || []);
    } catch (err: any) {
      console.error('Error fetching vendor performance:', err);
      toast.error('Failed to load vendor performance data');
    }
  };

  const refreshAllData = async () => {
    setLoading(true);
    setError(null);
    
    await Promise.all([
      fetchDashboardAnalytics(),
      fetchUserGrowth(),
      fetchVendorPerformance()
    ]);
    
    setLoading(false);
  };

  useEffect(() => {
    refreshAllData();
  }, []);

  return {
    dashboardData,
    userGrowth,
    vendorPerformance,
    loading,
    error,
    refreshData: refreshAllData,
    fetchUserGrowth
  };
};
