import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { DataTable } from '@/components/admin/DataTable';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { ArrowLeft, Shield } from 'lucide-react';
import { exportToCSV } from '@/utils/csvExport';

interface AdminUser {
  id: string;
  user_id: string;
  full_name: string;
  email_verified: boolean;
  created_at: string;
  phone_number?: string;
  company_name?: string;
}

const AdminUsersList = () => {
  const navigate = useNavigate();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdmins();
    
    // Real-time subscription for admin users
    const channel = supabase
      .channel('admins-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: 'user_type=eq.admin'
        },
        () => {
          fetchAdmins();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchAdmins = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_type', 'admin')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAdmins(data || []);
    } catch (error) {
      console.error('Error fetching admins:', error);
      toast.error('Failed to load admins');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const exportData = admins.map(admin => ({
      Name: admin.full_name || 'Not set',
      Company: admin.company_name || '',
      Phone: admin.phone_number || '',
      Verified: admin.email_verified ? 'Yes' : 'No',
      'Joined Date': format(new Date(admin.created_at), 'yyyy-MM-dd')
    }));
    exportToCSV(exportData, 'admins');
    toast.success('Admins exported successfully');
  };

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (admin: AdminUser) => (
        <div>
          <div className="font-medium flex items-center gap-2">
            <Shield className="h-4 w-4 text-red-500" />
            {admin.full_name || 'Not set'}
          </div>
          <div className="text-sm text-muted-foreground">{admin.company_name}</div>
        </div>
      )
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (admin: AdminUser) => admin.phone_number || '—'
    },
    {
      key: 'verified',
      header: 'Verified',
      render: (admin: AdminUser) => (
        <Badge variant={admin.email_verified ? 'default' : 'secondary'}>
          {admin.email_verified ? 'Verified' : 'Unverified'}
        </Badge>
      )
    },
    {
      key: 'joined',
      header: 'Joined',
      render: (admin: AdminUser) => format(new Date(admin.created_at), 'MMM dd, yyyy')
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
            Administrators
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage admin user accounts
          </p>
        </div>
        <Button onClick={handleExport}>
          Export CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Admins ({admins.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading admins...</div>
          ) : (
            <DataTable
              data={admins}
              columns={columns}
              onRowClick={() => {}}
              searchPlaceholder="Search admins by name, email..."
              showDateFilter
              getItemId={(admin) => admin.id}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminUsersList;
