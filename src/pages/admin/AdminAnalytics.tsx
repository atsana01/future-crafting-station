import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAdminPeriod } from '@/contexts/AdminPeriodContext';
import { BarChart3, TrendingUp, Users, FileText } from 'lucide-react';

const AdminAnalytics = () => {
  const { dateRange } = useAdminPeriod();

  return (
    <div className="container max-w-7xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Advanced Analytics
        </h1>
        <p className="text-muted-foreground mt-1">
          Detailed analytics and insights for period: {dateRange.from.toLocaleDateString()} - {dateRange.to.toLocaleDateString()}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Conversion Funnel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Tickets Created</span>
                  <span className="font-medium">100%</span>
                </div>
                <div className="h-8 bg-primary/20 rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: '100%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Quote Submitted</span>
                  <span className="font-medium">75%</span>
                </div>
                <div className="h-8 bg-primary/20 rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: '75%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Accepted</span>
                  <span className="font-medium">45%</span>
                </div>
                <div className="h-8 bg-success/20 rounded-full overflow-hidden">
                  <div className="h-full bg-success" style={{ width: '45%' }}></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Lifecycle Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Avg Time to First Response</p>
                <p className="text-2xl font-bold">18.5 hours</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Quote Turnaround</p>
                <p className="text-2xl font-bold">3.2 days</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg RFI Resolution</p>
                <p className="text-2xl font-bold">12.8 hours</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Activity Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Chat Volume</p>
                <p className="text-2xl font-bold">1,234 messages</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Daily Active Users</p>
                <p className="text-2xl font-bold">156</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Weekly Active Users</p>
                <p className="text-2xl font-bold">423</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Top Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {['Plumbing', 'Electrical', 'Construction', 'Renovation', 'HVAC'].map((category, i) => (
                <div key={category}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{category}</span>
                    <span className="font-medium">{Math.round(100 - i * 15)}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-primary" style={{ width: `${100 - i * 15}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminAnalytics;
