import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Download, MessageSquare, CheckCircle, XCircle, Eye, FileEdit, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface QuoteData {
  id: string;
  total_amount: number;
  estimated_timeline: string;
  cost_breakdown: any;
  milestones: any[];
  inclusions: string[];
  exclusions: string[];
  payment_schedule: any;
  validity_date: string;
  site_visit_required: boolean;
  insurance_will_be_used: boolean;
  notes_to_client?: string;
  version: number;
  created_at: string;
}

interface QuoteRequestData {
  id: string;
  status: string;
  vendor_notes?: string;
}

interface UnifiedQuoteViewProps {
  quote: QuoteData;
  quoteRequest: QuoteRequestData;
  userRole: 'client' | 'vendor';
  onAccept?: () => void;
  onReview?: () => void;
  onDeny?: () => void;
  onRevise?: () => void;
  onGenerateInvoice?: () => void;
  onMessage?: () => void;
  onDownloadPDF?: () => void;
  hasOpenRFIs?: boolean;
  blockingRuleEnabled?: boolean;
}

export const UnifiedQuoteView = ({
  quote,
  quoteRequest,
  userRole,
  onAccept,
  onReview,
  onDeny,
  onRevise,
  onGenerateInvoice,
  onMessage,
  onDownloadPDF,
  hasOpenRFIs = false,
  blockingRuleEnabled = false,
}: UnifiedQuoteViewProps) => {
  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: any; label: string }> = {
      pending: { variant: 'secondary', label: 'Pending' },
      quoted: { variant: 'outline', label: 'Quoted' },
      accepted: { variant: 'default', label: 'Accepted' },
      declined: { variant: 'destructive', label: 'Declined' },
    };

    const config = statusConfig[status] || { variant: 'outline', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const isAccepted = quoteRequest.status === 'accepted';
  const canAccept = userRole === 'client' && quoteRequest.status === 'quoted';
  const isBlocked = canAccept && blockingRuleEnabled && hasOpenRFIs;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle>Quote #{quote.id.slice(0, 8)} (v{quote.version})</CardTitle>
            <p className="text-sm text-muted-foreground">
              Ticket ID: {quoteRequest.id.slice(0, 8)}
            </p>
          </div>
          {getStatusBadge(quoteRequest.status)}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Blocking Warning */}
        {isBlocked && (
          <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800">
            <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
              ⚠️ Cannot accept quote while RFIs are open
            </p>
            <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
              Please resolve all open Request for Information items before accepting this quote.
            </p>
          </div>
        )}

        {/* Quote Summary */}
        <div className="space-y-3 p-4 rounded-lg bg-muted/50">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold text-2xl">€{quote.total_amount.toFixed(2)}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Timeline: {quote.estimated_timeline}
              </p>
              {quote.validity_date && (
                <p className="text-xs text-muted-foreground">
                  Valid until: {new Date(quote.validity_date).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Cost Breakdown */}
        {quote.cost_breakdown && Object.keys(quote.cost_breakdown).length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Cost Breakdown</h4>
            <div className="space-y-1">
              {Object.entries(quote.cost_breakdown).map(([key, value]) => (
                <div key={key} className="flex justify-between text-sm">
                  <span className="text-muted-foreground capitalize">
                    {key.replace(/_/g, ' ')}
                  </span>
                  <span className="font-medium">€{Number(value).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Milestones */}
        {quote.milestones && quote.milestones.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Project Milestones</h4>
            <ul className="space-y-2">
              {quote.milestones.map((milestone: any, idx: number) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p>{milestone.description || milestone}</p>
                    {milestone.payment_percentage && (
                      <p className="text-xs text-muted-foreground">
                        Payment: {milestone.payment_percentage}%
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Inclusions & Exclusions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quote.inclusions && quote.inclusions.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-green-600 dark:text-green-400">
                ✓ Included
              </h4>
              <ul className="space-y-1">
                {quote.inclusions.map((item, idx) => (
                  <li key={idx} className="text-xs text-muted-foreground">
                    • {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {quote.exclusions && quote.exclusions.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-red-600 dark:text-red-400">
                ✗ Excluded
              </h4>
              <ul className="space-y-1">
                {quote.exclusions.map((item, idx) => (
                  <li key={idx} className="text-xs text-muted-foreground">
                    • {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Additional Details */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          {quote.site_visit_required && (
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="font-medium">Site Visit Required</p>
              <p className="text-xs text-muted-foreground">Included in quote</p>
            </div>
          )}
          {quote.insurance_will_be_used && (
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="font-medium">Insurance Coverage</p>
              <p className="text-xs text-muted-foreground">Included</p>
            </div>
          )}
        </div>

        {/* Notes */}
        {quote.notes_to_client && (
          <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
              Notes from Vendor:
            </p>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              {quote.notes_to_client}
            </p>
          </div>
        )}

        <Separator />

        {/* Action Buttons - Role Specific */}
        <div className="flex flex-wrap gap-2">
          {userRole === 'client' ? (
            <>
              {canAccept && (
                <Button 
                  onClick={onAccept} 
                  variant="default"
                  disabled={isBlocked}
                  className="flex-1"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Accept Quote
                </Button>
              )}
              {quoteRequest.status === 'quoted' && onReview && (
                <Button onClick={onReview} variant="outline">
                  <FileEdit className="w-4 h-4 mr-2" />
                  Request Changes
                </Button>
              )}
              {quoteRequest.status === 'quoted' && onDeny && (
                <Button onClick={onDeny} variant="destructive">
                  <XCircle className="w-4 h-4 mr-2" />
                  Decline
                </Button>
              )}
              {onMessage && (
                <Button onClick={onMessage} variant="outline">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Chat
                </Button>
              )}
              {onDownloadPDF && (
                <Button onClick={onDownloadPDF} variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  PDF
                </Button>
              )}
            </>
          ) : (
            <>
              {isAccepted && onGenerateInvoice && (
                <Button onClick={onGenerateInvoice} variant="default">
                  <FileText className="w-4 h-4 mr-2" />
                  Generate Invoice
                </Button>
              )}
              {quoteRequest.status === 'quoted' && onRevise && (
                <Button onClick={onRevise} variant="outline">
                  <FileEdit className="w-4 h-4 mr-2" />
                  Send Revised Quote
                </Button>
              )}
              {onMessage && (
                <Button onClick={onMessage} variant="outline">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Chat
                </Button>
              )}
              {onDownloadPDF && (
                <Button onClick={onDownloadPDF} variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  PDF
                </Button>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
