import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { DataTable } from '@/components/admin/DataTable';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { exportToCSV } from '@/utils/csvExport';
import { UserManagementModal } from '@/components/admin/UserManagementModal';

interface Client {
  id: string;
  user_id: string;
  full_name: string;
  email_verified: boolean;
  created_at: string;
  phone_number?: string;
  address?: string;
  company_name?: string;
}

const AdminClientsList = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);

  useEffect(() => {
    fetchClients();
    
    // Real-time subscription for clients
    const channel = supabase
      .channel('clients-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: 'user_type=eq.client'
        },
        () => {
          fetchClients();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_type', 'client')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error('Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const exportData = clients.map(client => ({
      Name: client.full_name || 'Not set',
      Company: client.company_name || '',
      Phone: client.phone_number || '',
      Location: client.address || '',
      Verified: client.email_verified ? 'Yes' : 'No',
      'Joined Date': format(new Date(client.created_at), 'yyyy-MM-dd')
    }));
    exportToCSV(exportData, 'clients');
    toast.success('Clients exported successfully');
  };

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (client: Client) => (
        <div>
          <div className="font-medium">{client.full_name || 'Not set'}</div>
          <div className="text-sm text-muted-foreground">{client.company_name}</div>
        </div>
      )
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (client: Client) => client.phone_number || '—'
    },
    {
      key: 'location',
      header: 'Location',
      render: (client: Client) => client.address || '—'
    },
    {
      key: 'verified',
      header: 'Verified',
      render: (client: Client) => (
        <Badge variant={client.email_verified ? 'default' : 'secondary'}>
          {client.email_verified ? 'Verified' : 'Unverified'}
        </Badge>
      )
    },
    {
      key: 'joined',
      header: 'Joined',
      render: (client: Client) => format(new Date(client.created_at), 'MMM dd, yyyy')
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
            Clients
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage client accounts and projects
          </p>
        </div>
        <Button onClick={handleExport}>
          Export CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Clients ({clients.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading clients...</div>
          ) : (
            <DataTable
              data={clients}
              columns={columns}
              onRowClick={(client) => setSelectedClient(client.user_id)}
              searchPlaceholder="Search clients by name, phone..."
              showDateFilter
              getItemId={(client) => client.id}
            />
          )}
        </CardContent>
      </Card>

      <UserManagementModal
        isOpen={!!selectedClient}
        onClose={() => setSelectedClient(null)}
        userId={selectedClient || ''}
        userType="client"
      />
    </div>
  );
};

export default AdminClientsList;
