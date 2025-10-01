import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { DataTable } from '@/components/admin/DataTable';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Ticket, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import { useAdminPeriod } from '@/contexts/AdminPeriodContext';
import { exportToCSV } from '@/utils/csvExport';
import { logAdminAction } from '@/utils/auditLog';

interface TicketItem {
  id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
  client_id: string;
  vendor_id: string;
  location: string;
  project_type: string;
  form_data: any;
}

const AdminTickets = () => {
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<TicketItem | null>(null);
  const { dateRange } = useAdminPeriod();
  const [stats, setStats] = useState({ active: 0, new: 0, slaRisk: 0, rfis: 0 });

  useEffect(() => {
    fetchTickets();
  }, [dateRange]);

  const fetchTickets = async () => {
    try {
      const { data, error } = await supabase
        .from('quote_requests')
        .select(`
          id,
          project_id,
          status,
          created_at,
          client_id,
          vendor_id,
          projects!inner(
            title,
            description,
            location,
            project_type,
            form_data
          )
        `)
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString())
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const transformed = data?.map((t: any) => ({
        id: t.id,
        title: t.projects.title,
        description: t.projects.description,
        status: t.status,
        created_at: t.created_at,
        client_id: t.client_id,
        vendor_id: t.vendor_id,
        location: t.projects.location,
        project_type: t.projects.project_type,
        form_data: t.projects.form_data
      })) || [];

      setTickets(transformed);

      const active = transformed.filter(t => t.status !== 'completed').length;
      const newTickets = transformed.filter(t => 
        new Date(t.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      ).length;

      setStats({ active, new: newTickets, slaRisk: 0, rfis: 0 });
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast.error('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = (items: TicketItem[]) => {
    exportToCSV(items, 'tickets', [
      { key: 'id', header: 'ID' },
      { key: 'title', header: 'Title' },
      { key: 'status', header: 'Status' },
      { key: 'location', header: 'Location' },
      { key: 'created_at', header: 'Created' }
    ]);
    logAdminAction('export_tickets', 'quote_requests', undefined, undefined, { count: items.length });
  };

  const columns = [
    {
      key: 'title',
      header: 'Title',
      render: (t: TicketItem) => (
        <div>
          <div className="font-medium">{t.title}</div>
          <div className="text-sm text-muted-foreground">{t.location}</div>
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (t: TicketItem) => (
        <Badge variant={
          t.status === 'accepted' ? 'default' :
          t.status === 'pending' ? 'secondary' :
          'outline'
        }>
          {t.status}
        </Badge>
      )
    },
    {
      key: 'type',
      header: 'Type',
      render: (t: TicketItem) => <span className="text-sm">{t.project_type || 'General'}</span>
    },
    {
      key: 'date',
      header: 'Created',
      render: (t: TicketItem) => format(new Date(t.created_at), 'MMM dd, yyyy')
    }
  ];

  return (
    <>
      <div className="container max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Tickets Management
          </h1>
          <p className="text-muted-foreground mt-1">
            View and manage all support tickets
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Ticket className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.active}</div>
                  <p className="text-sm text-muted-foreground">Active Tickets</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-success/10 rounded-lg">
                  <CheckCircle2 className="h-6 w-6 text-success" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.new}</div>
                  <p className="text-sm text-muted-foreground">New This Week</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-destructive/10 rounded-lg">
                  <AlertCircle className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.slaRisk}</div>
                  <p className="text-sm text-muted-foreground">SLA Risk</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-warning/10 rounded-lg">
                  <Clock className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.rfis}</div>
                  <p className="text-sm text-muted-foreground">Open RFIs</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Tickets ({tickets.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading tickets...</div>
            ) : (
              <DataTable
                data={tickets}
                columns={columns}
                onRowClick={(ticket) => setSelectedTicket(ticket)}
                onBulkExport={handleExport}
                searchPlaceholder="Search tickets..."
                showDateFilter
                getItemId={(t) => t.id}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Ticket Details</DialogTitle>
          </DialogHeader>
          {selectedTicket && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 pr-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold">{selectedTicket.title}</h3>
                    <p className="text-muted-foreground">{selectedTicket.location}</p>
                  </div>
                  <Badge>{selectedTicket.status}</Badge>
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Description</p>
                  <p className="text-muted-foreground">{selectedTicket.description}</p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Project Type</p>
                  <p>{selectedTicket.project_type || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Created</p>
                  <p>{format(new Date(selectedTicket.created_at), 'PPpp')}</p>
                </div>
                {selectedTicket.form_data && (
                  <div>
                    <p className="text-sm font-medium mb-2">Additional Details</p>
                    <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto">
                      {JSON.stringify(selectedTicket.form_data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminTickets;
