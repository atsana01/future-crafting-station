import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, ExternalLink, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface Invoice {
  id: string;
  invoice_number: string;
  legal_invoice_number: string | null;
  total_amount: number;
  subtotal_amount: number;
  vat_amount: number;
  vat_rate: number;
  status: string;
  created_at: string;
  stripe_pdf_url: string | null;
  vendor_id: string;
  client_id: string;
}

interface InvoiceListProps {
  userRole: 'vendor' | 'client';
  userId: string;
}

const InvoiceList = ({ userRole, userId }: InvoiceListProps) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvoices();
  }, [userId, userRole]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const filterColumn = userRole === 'vendor' ? 'vendor_id' : 'client_id';
      
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq(filterColumn, userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error: any) {
      console.error('Error fetching invoices:', error);
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      draft: 'outline',
      sent: 'secondary',
      paid: 'default',
      payment_failed: 'destructive',
      voided: 'destructive',
    };
    return variants[status] || 'outline';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      draft: 'Draft',
      sent: 'Sent',
      paid: 'Paid',
      payment_failed: 'Payment Failed',
      voided: 'Voided',
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Invoices
        </CardTitle>
        <CardDescription>
          {userRole === 'vendor' 
            ? 'Invoices you have issued to clients'
            : 'Invoices from your projects'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {invoices.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>No invoices yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono font-semibold text-sm">
                      {invoice.legal_invoice_number || invoice.invoice_number}
                    </span>
                    <Badge variant={getStatusBadge(invoice.status)}>
                      {getStatusLabel(invoice.status)}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    €{invoice.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    {' • '}
                    {formatDistanceToNow(new Date(invoice.created_at), { addSuffix: true })}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Subtotal: €{invoice.subtotal_amount.toFixed(2)} + VAT ({invoice.vat_rate}%): €{invoice.vat_amount.toFixed(2)}
                  </div>
                </div>

                <div className="flex gap-2">
                  {invoice.stripe_pdf_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(invoice.stripe_pdf_url!, '_blank')}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      PDF
                    </Button>
                  )}
                  {userRole === 'client' && invoice.status === 'sent' && (
                    <Button
                      size="sm"
                      onClick={() => {
                        toast.info('Payment link opening...');
                        // Payment link would be from stripe_hosted_invoice_url
                      }}
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Pay Now
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default InvoiceList;
