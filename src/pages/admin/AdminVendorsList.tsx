import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { DataTable } from '@/components/admin/DataTable';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { ArrowLeft, Star, Clock } from 'lucide-react';
import { exportToCSV } from '@/utils/csvExport';
import { UserManagementModal } from '@/components/admin/UserManagementModal';

interface Vendor {
  id: string;
  user_id: string;
  business_name: string;
  specialty: string[];
  verification_status: 'pending' | 'verified' | 'rejected';
  rating: number;
  total_reviews: number;
  response_time_hours: number;
  location: string;
  created_at: string;
}

const AdminVendorsList = () => {
  const navigate = useNavigate();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVendor, setSelectedVendor] = useState<string | null>(null);

  useEffect(() => {
    fetchVendors();
    
    // Real-time subscription for vendors
    const channel = supabase
      .channel('vendors-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vendor_profiles'
        },
        () => {
          fetchVendors();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchVendors = async () => {
    try {
      const { data, error } = await supabase
        .from('vendor_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVendors(data || []);
    } catch (error) {
      console.error('Error fetching vendors:', error);
      toast.error('Failed to load vendors');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const exportData = vendors.map(vendor => ({
      Business: vendor.business_name,
      Location: vendor.location || '',
      Status: vendor.verification_status,
      Rating: vendor.rating.toFixed(1),
      Reviews: vendor.total_reviews,
      'Response Time (hrs)': vendor.response_time_hours,
      'Created Date': format(new Date(vendor.created_at), 'yyyy-MM-dd')
    }));
    exportToCSV(exportData, 'vendors');
    toast.success('Vendors exported successfully');
  };

  const columns = [
    {
      key: 'business',
      header: 'Business',
      render: (vendor: Vendor) => (
        <div>
          <div className="font-medium">{vendor.business_name}</div>
          <div className="text-sm text-muted-foreground">{vendor.location}</div>
        </div>
      )
    },
    {
      key: 'specialty',
      header: 'Specialty',
      render: (vendor: Vendor) => (
        <div className="flex flex-wrap gap-1">
          {vendor.specialty?.slice(0, 2).map((spec, i) => (
            <Badge key={i} variant="outline" className="text-xs">
              {spec}
            </Badge>
          ))}
          {vendor.specialty?.length > 2 && (
            <Badge variant="outline" className="text-xs">
              +{vendor.specialty.length - 2}
            </Badge>
          )}
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (vendor: Vendor) => (
        <Badge
          variant={
            vendor.verification_status === 'verified'
              ? 'default'
              : vendor.verification_status === 'pending'
              ? 'secondary'
              : 'destructive'
          }
        >
          {vendor.verification_status}
        </Badge>
      )
    },
    {
      key: 'rating',
      header: 'Rating',
      render: (vendor: Vendor) => (
        <div className="flex items-center gap-1">
          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
          <span className="font-medium">{vendor.rating.toFixed(1)}</span>
          <span className="text-sm text-muted-foreground">({vendor.total_reviews})</span>
        </div>
      )
    },
    {
      key: 'response',
      header: 'Response',
      render: (vendor: Vendor) => (
        <div className="flex items-center gap-1">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span>{vendor.response_time_hours}h</span>
        </div>
      )
    }
  ];

  return (
    <div className="container max-w-7xl mx-auto px-6 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Button 
            variant="ghost" 
            onClick={() => navigate('/admin/users')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Users
          </Button>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Vendors
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage vendor profiles and performance
          </p>
        </div>
        <Button onClick={handleExport}>
          Export CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Vendors ({vendors.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading vendors...</div>
          ) : (
            <DataTable
              data={vendors}
              columns={columns}
              onRowClick={(vendor) => setSelectedVendor(vendor.user_id)}
              searchPlaceholder="Search vendors by name, location..."
              showDateFilter
              getItemId={(vendor) => vendor.id}
            />
          )}
        </CardContent>
      </Card>

      <UserManagementModal
        isOpen={!!selectedVendor}
        onClose={() => setSelectedVendor(null)}
        userId={selectedVendor || ''}
        userType="vendor"
      />
    </div>
  );
};

export default AdminVendorsList;
