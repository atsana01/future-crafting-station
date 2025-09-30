import { Navigate } from 'react-router-dom';
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
  // Redirect to new admin overview page
  return <Navigate to="/admin/overview" replace />;

};

export default AdminDashboard;
