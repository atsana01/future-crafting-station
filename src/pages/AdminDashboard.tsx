import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAdminAnalytics } from '@/hooks/useAdminAnalytics';
import { StatCard } from '@/components/admin/StatCard';
import { UserGrowthChart } from '@/components/admin/UserGrowthChart';
import { QuoteStatusChart } from '@/components/admin/QuoteStatusChart';
import { VendorPerformanceTable } from '@/components/admin/VendorPerformanceTable';
import { 
  Users, 
  Building2, 
  FileText, 
  TrendingUp, 
  DollarSign, 
  Clock,
  Activity,
  RefreshCw,
  LogOut,
  Shield,
  BarChart3
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { 
    dashboardData, 
    userGrowth, 
    vendorPerformance, 
    loading, 
    refreshData,
    fetchUserGrowth 
  } = useAdminAnalytics();
  const [timeRange, setTimeRange] = useState('30');

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast.success('Signed out successfully');
      navigate('/admin');
    } catch (error) {
      toast.error('Failed to sign out');
    }
  };

  const handleTimeRangeChange = (value: string) => {
    setTimeRange(value);
    fetchUserGrowth(parseInt(value));
  };

  if (loading || !dashboardData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Header */}
      <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-primary rounded-lg">
                <Shield className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  Admin Dashboard
                </h1>
                <p className="text-sm text-muted-foreground">
                  BuildEasy Analytics & Management
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={refreshData}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleSignOut}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container max-w-7xl mx-auto px-4 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="quotes">Quotes</TabsTrigger>
            <TabsTrigger value="vendors">Vendors</TabsTrigger>
            <TabsTrigger value="financial">Financial</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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

            {/* Charts Row */}
            <div className="grid gap-6 md:grid-cols-2">
              <UserGrowthChart data={userGrowth} />
              <QuoteStatusChart data={dashboardData.quotes_by_status} />
            </div>

            {/* Quick Stats */}
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
                    Total Invoices
                  </CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {dashboardData.total_invoices}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Invoices generated
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">User Analytics</h2>
              <Select value={timeRange} onValueChange={handleTimeRangeChange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <StatCard
                title="Total Users"
                value={dashboardData.total_users}
                icon={Users}
              />
              <StatCard
                title="Vendors"
                value={dashboardData.total_vendors}
                subtitle={`${((dashboardData.total_vendors / dashboardData.total_users) * 100).toFixed(1)}% of total`}
                icon={Building2}
              />
              <StatCard
                title="Clients"
                value={dashboardData.total_clients}
                subtitle={`${((dashboardData.total_clients / dashboardData.total_users) * 100).toFixed(1)}% of total`}
                icon={Users}
              />
            </div>

            <UserGrowthChart data={userGrowth} />
          </TabsContent>

          {/* Quotes Tab */}
          <TabsContent value="quotes" className="space-y-6">
            <h2 className="text-2xl font-bold">Quote Analytics</h2>
            
            <div className="grid gap-4 md:grid-cols-4">
              <StatCard
                title="Total Quotes"
                value={dashboardData.total_quotes}
                icon={FileText}
              />
              <StatCard
                title="Pending"
                value={dashboardData.quotes_by_status.pending || 0}
                icon={Clock}
              />
              <StatCard
                title="Accepted"
                value={dashboardData.quotes_by_status.accepted || 0}
                icon={TrendingUp}
              />
              <StatCard
                title="Completed"
                value={dashboardData.quotes_by_status.completed || 0}
                icon={Activity}
              />
            </div>

            <QuoteStatusChart data={dashboardData.quotes_by_status} />
          </TabsContent>

          {/* Vendors Tab */}
          <TabsContent value="vendors" className="space-y-6">
            <h2 className="text-2xl font-bold">Vendor Performance</h2>
            
            <div className="grid gap-4 md:grid-cols-2">
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
          </TabsContent>

          {/* Financial Tab */}
          <TabsContent value="financial" className="space-y-6">
            <h2 className="text-2xl font-bold">Financial Overview</h2>
            
            <div className="grid gap-4 md:grid-cols-3">
              <StatCard
                title="Total Revenue"
                value={`€${dashboardData.total_revenue.toFixed(2)}`}
                subtitle="Service fees collected"
                icon={DollarSign}
              />
              <StatCard
                title="Total Invoices"
                value={dashboardData.total_invoices}
                icon={FileText}
              />
              <StatCard
                title="Accepted Quotes"
                value={dashboardData.quotes_by_status.accepted || 0}
                subtitle="Ready for invoicing"
                icon={TrendingUp}
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Revenue Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Average Quote Value</span>
                  <span className="font-semibold">
                    €{dashboardData.total_quotes > 0 ? (dashboardData.total_revenue / dashboardData.total_quotes * 50).toFixed(2) : '0.00'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Conversion Rate</span>
                  <span className="font-semibold">
                    {dashboardData.total_quotes > 0 
                      ? ((dashboardData.quotes_by_status.accepted / dashboardData.total_quotes) * 100).toFixed(1)
                      : '0'}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Active Projects Value</span>
                  <span className="font-semibold">
                    €{(dashboardData.active_projects * 1500).toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
