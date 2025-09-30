import { useAdminAnalytics } from '@/hooks/useAdminAnalytics';
import { StatCard } from '@/components/admin/StatCard';
import { UserGrowthChart } from '@/components/admin/UserGrowthChart';
import { QuoteStatusChart } from '@/components/admin/QuoteStatusChart';
import { 
  Users, 
  Building2, 
  FileText, 
  Activity, 
  Clock,
  DollarSign,
  TrendingUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

const AdminOverview = () => {
  const { dashboardData, userGrowth, loading, refreshData } = useAdminAnalytics();

  if (loading || !dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Overview
          </h1>
          <p className="text-muted-foreground mt-1">
            Platform analytics and key metrics
          </p>
        </div>
        <Button 
          variant="outline"
          onClick={refreshData}
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard
          title="Total Users"
          value={dashboardData.total_users}
          subtitle={`${dashboardData.recent_signups} new this week`}
          icon={Users}
        />
        <StatCard
          title="Total Vendors"
          value={dashboardData.total_vendors}
          subtitle="Verified professionals"
          icon={Building2}
        />
        <StatCard
          title="Total Quotes"
          value={dashboardData.total_quotes}
          subtitle={`${dashboardData.recent_quotes} new this week`}
          icon={FileText}
        />
        <StatCard
          title="Active Projects"
          value={dashboardData.active_projects}
          subtitle={`${dashboardData.total_projects} total`}
          icon={Activity}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2 mb-8">
        <UserGrowthChart data={userGrowth} />
        <QuoteStatusChart data={dashboardData.quotes_by_status} />
      </div>

      {/* Additional Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Response Time
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardData.avg_vendor_response_time.toFixed(1)}h
            </div>
            <p className="text-xs text-muted-foreground">
              Vendor response average
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              €{dashboardData.total_revenue.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Service fees collected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Conversion Rate
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardData.total_quotes > 0 
                ? ((dashboardData.quotes_by_status.accepted / dashboardData.total_quotes) * 100).toFixed(1)
                : '0'}%
            </div>
            <p className="text-xs text-muted-foreground">
              Quote acceptance rate
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminOverview;
