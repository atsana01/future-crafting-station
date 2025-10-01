import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { DataTable } from '@/components/admin/DataTable';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { FileText, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { useAdminPeriod } from '@/contexts/AdminPeriodContext';
import { exportToCSV } from '@/utils/csvExport';
import { logAdminAction } from '@/utils/auditLog';
import { QuoteStatusChart } from '@/components/admin/QuoteStatusChart';

interface Quote {
  id: string;
  quote_request_id: string;
  total_amount: number;
  created_at: string;
  status: string;
  client_name: string;
  vendor_name: string;
  category: string;
}

const AdminQuotes = () => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const { dateRange } = useAdminPeriod();
  const [stats, setStats] = useState({ total: 0, pending: 0, accepted: 0, rejected: 0, winRate: 0, avgResponse: 0 });

  useEffect(() => {
    fetchQuotes();
  }, [dateRange]);

  const fetchQuotes = async () => {
    try {
      const { data: quotesData, error } = await supabase
        .from('quotes')
        .select(`
          id,
          quote_request_id,
          total_amount,
          created_at,
          quote_requests!inner(
            id,
            status,
            client_id,
            vendor_id
          )
        `)
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform and calculate stats
      const transformed = quotesData?.map((q: any) => ({
        id: q.id,
        quote_request_id: q.quote_request_id,
        total_amount: q.total_amount,
        created_at: q.created_at,
        status: q.quote_requests.status,
        client_name: 'Client', // Would need to join profiles
        vendor_name: 'Vendor',
        category: 'General'
      })) || [];

      setQuotes(transformed);

      const total = transformed.length;
      const pending = transformed.filter(q => q.status === 'pending').length;
      const accepted = transformed.filter(q => q.status === 'accepted').length;
      const rejected = transformed.filter(q => q.status === 'declined').length;
      const winRate = total > 0 ? (accepted / total * 100) : 0;

      setStats({ total, pending, accepted, rejected, winRate, avgResponse: 24 });
    } catch (error) {
      console.error('Error fetching quotes:', error);
      toast.error('Failed to load quotes');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = (items: Quote[]) => {
    exportToCSV(items, 'quotes', [
      { key: 'id', header: 'ID' },
      { key: 'quote_request_id', header: 'Request ID' },
      { key: 'total_amount', header: 'Amount' },
      { key: 'status', header: 'Status' },
      { key: 'created_at', header: 'Created' }
    ]);
    logAdminAction('export_quotes', 'quotes', undefined, undefined, { count: items.length });
  };

  const handleArchive = async (items: Quote[]) => {
    try {
      const ids = items.map(i => i.quote_request_id);
      const { error } = await supabase
        .from('quote_requests')
        .update({ deleted_at: new Date().toISOString() })
        .in('id', ids);

      if (error) throw error;

      toast.success(`${items.length} quote(s) archived`);
      logAdminAction('archive_quotes', 'quote_requests', undefined, undefined, { ids });
      fetchQuotes();
    } catch (error) {
      console.error('Error archiving quotes:', error);
      toast.error('Failed to archive quotes');
    }
  };

  const columns = [
    {
      key: 'id',
      header: 'Quote ID',
      render: (q: Quote) => <span className="font-mono text-xs">{q.id.slice(0, 8)}</span>
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (q: Quote) => <span className="font-medium">€{q.total_amount.toLocaleString()}</span>
    },
    {
      key: 'status',
      header: 'Status',
      render: (q: Quote) => (
        <Badge variant={
          q.status === 'accepted' ? 'default' :
          q.status === 'pending' ? 'secondary' :
          'destructive'
        }>
          {q.status}
        </Badge>
      )
    },
    {
      key: 'date',
      header: 'Created',
      render: (q: Quote) => format(new Date(q.created_at), 'MMM dd, yyyy')
    }
  ];

  return (
    <>
      <div className="container max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Quotes Management
          </h1>
          <p className="text-muted-foreground mt-1">
            View and manage all quote requests
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.total}</div>
                  <p className="text-sm text-muted-foreground">Total Quotes</p>
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
                  <div className="text-2xl font-bold">{stats.pending}</div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-success/10 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-success" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.accepted}</div>
                  <p className="text-sm text-muted-foreground">Accepted</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.winRate.toFixed(1)}%</div>
                  <p className="text-sm text-muted-foreground">Win Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quote Status Chart */}
        <div className="mb-8">
          <QuoteStatusChart data={{
            pending: stats.pending,
            accepted: stats.accepted,
            declined: stats.rejected
          }} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Quotes ({quotes.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading quotes...</div>
            ) : (
              <DataTable
                data={quotes}
                columns={columns}
                onRowClick={(quote) => setSelectedQuote(quote)}
                onBulkExport={handleExport}
                onBulkDelete={handleArchive}
                searchPlaceholder="Search quotes..."
                showDateFilter
                getItemId={(q) => q.id}
                statusOptions={[
                  { value: 'pending', label: 'Pending' },
                  { value: 'accepted', label: 'Accepted' },
                  { value: 'declined', label: 'Declined' }
                ]}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selectedQuote} onOpenChange={() => setSelectedQuote(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Quote Details</DialogTitle>
          </DialogHeader>
          {selectedQuote && (
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-muted-foreground">Quote ID</p>
                  <p className="font-mono">{selectedQuote.id}</p>
                </div>
                <Badge>{selectedQuote.status}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-2xl font-bold">€{selectedQuote.total_amount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p>{format(new Date(selectedQuote.created_at), 'PPpp')}</p>
              </div>
              <Button variant="outline" className="w-full" onClick={() => {
                // View full quote details
                window.open(`/dashboard`, '_blank');
              }}>
                View in Dashboard
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminQuotes;
