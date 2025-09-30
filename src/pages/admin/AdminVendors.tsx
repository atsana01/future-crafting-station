import { useAdminAnalytics } from '@/hooks/useAdminAnalytics';
import { VendorPerformanceTable } from '@/components/admin/VendorPerformanceTable';
import { StatCard } from '@/components/admin/StatCard';
import { Building2, Clock } from 'lucide-react';

const AdminVendors = () => {
  const { dashboardData, vendorPerformance, loading } = useAdminAnalytics();

  if (loading || !dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Vendor Management
        </h1>
        <p className="text-muted-foreground mt-1">
          Monitor vendor performance and metrics
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 mb-8">
        <StatCard
          title="Total Vendors"
          value={dashboardData.total_vendors}
          icon={Building2}
        />
        <StatCard
          title="Avg Response Time"
          value={`${dashboardData.avg_vendor_response_time.toFixed(1)}h`}
          subtitle="Vendor response average"
          icon={Clock}
        />
      </div>

      <VendorPerformanceTable data={vendorPerformance} />
    </div>
  );
};

export default AdminVendors;
