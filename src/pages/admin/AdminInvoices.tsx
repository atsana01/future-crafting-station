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
import { FileText, Download, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { useAdminPeriod } from '@/contexts/AdminPeriodContext';
import { exportToCSV } from '@/utils/csvExport';
import { logAdminAction } from '@/utils/auditLog';

interface Invoice {
  id: string;
  invoice_number: string;
  total_amount: number;
  status: string;
  created_at: string;
  client_id: string;
  vendor_id: string;
  quote_id: string;
}

const AdminInvoices = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const { dateRange } = useAdminPeriod();
  const [stats, setStats] = useState({ total: 0, issued: 0, paid: 0, overdue: 0 });

  useEffect(() => {
    fetchInvoices();
  }, [dateRange]);

  const fetchInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);

      const total = data?.length || 0;
      const issued = data?.filter(i => i.status === 'issued').length || 0;
      const paid = data?.filter(i => i.status === 'paid').length || 0;
      const overdue = data?.filter(i => i.status === 'overdue').length || 0;

      setStats({ total, issued, paid, overdue });
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = (items: Invoice[]) => {
    exportToCSV(items, 'invoices', [
      { key: 'invoice_number', header: 'Invoice #' },
      { key: 'total_amount', header: 'Amount' },
      { key: 'status', header: 'Status' },
      { key: 'created_at', header: 'Created' }
    ]);
    logAdminAction('export_invoices', 'invoices', undefined, undefined, { count: items.length });
  };

  const columns = [
    {
      key: 'invoice_number',
      header: 'Invoice #',
      render: (inv: Invoice) => <span className="font-mono text-sm">{inv.invoice_number}</span>
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (inv: Invoice) => <span className="font-medium">€{inv.total_amount.toLocaleString()}</span>
    },
    {
      key: 'status',
      header: 'Status',
      render: (inv: Invoice) => (
        <Badge variant={
          inv.status === 'paid' ? 'default' :
          inv.status === 'issued' ? 'secondary' :
          inv.status === 'overdue' ? 'destructive' :
          'outline'
        }>
          {inv.status}
        </Badge>
      )
    },
    {
      key: 'date',
      header: 'Created',
      render: (inv: Invoice) => format(new Date(inv.created_at), 'MMM dd, yyyy')
    }
  ];

  return (
    <>
      <div className="container max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Invoices Management
          </h1>
          <p className="text-muted-foreground mt-1">
            View and manage all platform invoices
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
                  <p className="text-sm text-muted-foreground">Total Invoices</p>
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
                  <div className="text-2xl font-bold">{stats.issued}</div>
                  <p className="text-sm text-muted-foreground">Issued</p>
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
                  <div className="text-2xl font-bold">{stats.paid}</div>
                  <p className="text-sm text-muted-foreground">Paid</p>
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
                  <div className="text-2xl font-bold">{stats.overdue}</div>
                  <p className="text-sm text-muted-foreground">Overdue</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Invoices ({invoices.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading invoices...</div>
            ) : (
              <DataTable
                data={invoices}
                columns={columns}
                onRowClick={(invoice) => setSelectedInvoice(invoice)}
                onBulkExport={handleExport}
                searchPlaceholder="Search invoices..."
                showDateFilter
                getItemId={(inv) => inv.id}
                statusOptions={[
                  { value: 'draft', label: 'Draft' },
                  { value: 'issued', label: 'Issued' },
                  { value: 'paid', label: 'Paid' },
                  { value: 'overdue', label: 'Overdue' }
                ]}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Invoice Details</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-6 pr-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-2xl font-bold">{selectedInvoice.invoice_number}</h3>
                    <p className="text-muted-foreground">Created {format(new Date(selectedInvoice.created_at), 'PPP')}</p>
                  </div>
                  <Badge variant={selectedInvoice.status === 'paid' ? 'default' : 'secondary'}>
                    {selectedInvoice.status}
                  </Badge>
                </div>

                <div className="p-6 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">Total Amount</p>
                  <p className="text-3xl font-bold">€{selectedInvoice.total_amount.toLocaleString()}</p>
                </div>

                <div>
                  <p className="text-sm font-medium mb-3">Agreed Quote Details</p>
                  <div className="space-y-2 p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">Quote details would be embedded here</p>
                    <p className="text-sm text-muted-foreground">Including: breakdown, milestones, payment schedule, etc.</p>
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t">
                  <Button variant="outline" className="flex-1">
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </Button>
                  <Button variant="outline" className="flex-1">
                    Print
                  </Button>
                  {selectedInvoice.status !== 'paid' && (
                    <Button className="flex-1">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark as Paid
                    </Button>
                  )}
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminInvoices;
