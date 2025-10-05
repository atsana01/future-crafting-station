import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Download, ExternalLink, MessageSquare, Copy, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';

interface InvoiceData {
  id: string;
  invoice_number: string;
  legal_invoice_number?: string;
  status: string;
  total_amount: number;
  subtotal_amount?: number;
  vat_amount?: number;
  vat_rate?: number;
  vat_basis?: string;
  currency: string;
  stripe_hosted_invoice_url?: string;
  stripe_pdf_url?: string;
  issued_at?: string;
  paid_at?: string;
  quote_id: string;
  // Quote embed data
  quote?: {
    total_amount: number;
    cost_breakdown: any;
    milestones: any[];
    inclusions: string[];
    exclusions: string[];
    validity_date: string;
    insurance_will_be_used: boolean;
    estimated_timeline: string;
  };
}

interface UnifiedInvoiceViewProps {
  invoice: InvoiceData;
  userRole: 'client' | 'vendor';
  ticketId: string;
  onMessageVendor?: () => void;
}

export const UnifiedInvoiceView = ({
  invoice,
  userRole,
  ticketId,
  onMessageVendor,
}: UnifiedInvoiceViewProps) => {
  const [copied, setCopied] = useState(false);

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: any; label: string }> = {
      draft: { variant: 'secondary', label: 'Draft' },
      open: { variant: 'outline', label: 'Sent' },
      sent: { variant: 'outline', label: 'Sent' },
      paid: { variant: 'default', label: 'Paid' },
      payment_failed: { variant: 'destructive', label: 'Payment Failed' },
      void: { variant: 'secondary', label: 'Voided' },
    };

    const config = statusConfig[status] || { variant: 'outline', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleCopyPaymentLink = () => {
    if (invoice.stripe_hosted_invoice_url) {
      navigator.clipboard.writeText(invoice.stripe_hosted_invoice_url);
      setCopied(true);
      toast.success('Payment link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePayNow = () => {
    if (invoice.stripe_hosted_invoice_url) {
      window.open(invoice.stripe_hosted_invoice_url, '_blank');
    }
  };

  const handleDownloadPDF = () => {
    if (invoice.stripe_pdf_url) {
      window.open(invoice.stripe_pdf_url, '_blank');
    } else {
      toast.error('PDF not available yet');
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle>Invoice {invoice.legal_invoice_number || invoice.invoice_number}</CardTitle>
            <p className="text-sm text-muted-foreground">
              Ticket ID: {ticketId} • Quote ID: {invoice.quote_id}
            </p>
          </div>
          {getStatusBadge(invoice.status)}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Invoice Summary */}
        <div className="space-y-3 p-4 rounded-lg bg-muted/50">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium">
              €{(invoice.subtotal_amount || invoice.total_amount).toFixed(2)}
            </span>
          </div>
          {invoice.vat_amount !== undefined && invoice.vat_amount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                VAT ({invoice.vat_rate}%)
                {invoice.vat_basis && (
                  <span className="text-xs ml-1">({invoice.vat_basis})</span>
                )}
              </span>
              <span className="font-medium">€{invoice.vat_amount.toFixed(2)}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span>€{invoice.total_amount.toFixed(2)}</span>
          </div>
        </div>

        {/* Quote Details Embed */}
        {invoice.quote && (
          <div className="space-y-4">
            <h3 className="font-semibold">Agreed Quote Details</h3>
            
            {/* Breakdown */}
            {invoice.quote.cost_breakdown && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Cost Breakdown</p>
                <div className="space-y-1 text-sm">
                  {Object.entries(invoice.quote.cost_breakdown).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</span>
                      <span>€{Number(value).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Milestones */}
            {invoice.quote.milestones && invoice.quote.milestones.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Project Milestones</p>
                <ul className="space-y-1 text-sm">
                  {invoice.quote.milestones.map((milestone: any, idx: number) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-primary mt-0.5" />
                      <span>{milestone.description || milestone}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Inclusions/Exclusions */}
            <div className="grid grid-cols-2 gap-4">
              {invoice.quote.inclusions && invoice.quote.inclusions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-green-600">✓ Included</p>
                  <ul className="text-xs space-y-1 text-muted-foreground">
                    {invoice.quote.inclusions.map((item, idx) => (
                      <li key={idx}>• {item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {invoice.quote.exclusions && invoice.quote.exclusions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-red-600">✗ Excluded</p>
                  <ul className="text-xs space-y-1 text-muted-foreground">
                    {invoice.quote.exclusions.map((item, idx) => (
                      <li key={idx}>• {item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Timeline & Insurance */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              {invoice.quote.estimated_timeline && (
                <div>
                  <p className="text-muted-foreground">Timeline</p>
                  <p className="font-medium">{invoice.quote.estimated_timeline}</p>
                </div>
              )}
              {invoice.quote.insurance_will_be_used && (
                <div>
                  <p className="text-muted-foreground">Insurance</p>
                  <p className="font-medium">Coverage Included</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons - Role Specific */}
        <div className="flex flex-wrap gap-2 pt-4">
          {userRole === 'client' ? (
            <>
              {invoice.status === 'sent' || invoice.status === 'open' ? (
                <Button onClick={handlePayNow} variant="default" className="flex-1">
                  Pay Now
                </Button>
              ) : null}
              <Button onClick={handleDownloadPDF} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
              {onMessageVendor && (
                <Button onClick={onMessageVendor} variant="outline">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Message Vendor
                </Button>
              )}
            </>
          ) : (
            <>
              {invoice.stripe_hosted_invoice_url && (
                <Button onClick={handlePayNow} variant="outline">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open Stripe Invoice
                </Button>
              )}
              <Button onClick={handleDownloadPDF} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
              {invoice.stripe_hosted_invoice_url && (
                <Button onClick={handleCopyPaymentLink} variant="outline">
                  {copied ? (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  ) : (
                    <Copy className="w-4 h-4 mr-2" />
                  )}
                  {copied ? 'Copied!' : 'Copy Payment Link'}
                </Button>
              )}
            </>
          )}
        </div>

        {/* Payment Info */}
        {invoice.paid_at && (
          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
            <p className="text-sm text-green-800 dark:text-green-200">
              ✓ Paid on {new Date(invoice.paid_at).toLocaleDateString()}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
