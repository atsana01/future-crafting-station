import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { 
  FileText, 
  Euro, 
  Calendar,
  PenTool,
  CheckCircle2,
  Info,
  Percent,
  CreditCard,
  User,
  Building
} from 'lucide-react';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  quoteRequestId: string;
  onInvoiceCreated?: () => void;
}

interface InvoiceData {
  id: string;
  invoice_number: string;
  total_amount: number;
  service_fee_percentage: number;
  service_fee_amount: number;
  vendor_payout_amount: number;
  status: string;
  client_id: string;
  vendor_id: string;
  client_signed_at: string | null;
  vendor_signed_at: string | null;
  paid_at: string | null;
  created_at: string;
}

const InvoiceModal: React.FC<InvoiceModalProps> = ({
  isOpen,
  onClose,
  quoteRequestId,
  onInvoiceCreated
}) => {
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [userRole, setUserRole] = useState<'client' | 'vendor' | null>(null);
  const [signModal, setSignModal] = useState(false);
  const [signatureName, setSignatureName] = useState('');
  const [requiredName, setRequiredName] = useState('');

  useEffect(() => {
    if (isOpen && quoteRequestId) {
      loadInvoice();
    }
  }, [isOpen, quoteRequestId]);

  useEffect(() => {
    if (invoice) {
      determineUserRole();
    }
  }, [invoice]);

  const loadInvoice = async () => {
    setLoading(true);
    try {
      // Check if quote is accepted
      const { data: quoteRequest, error: qrError } = await supabase
        .from('quote_requests')
        .select('status')
        .eq('id', quoteRequestId)
        .single();

      if (qrError) throw qrError;
      
      if (quoteRequest?.status !== 'accepted') {
        toast({
          title: 'Error',
          description: 'Quote must be accepted before creating invoice',
          variant: 'destructive',
        });
        onClose();
        return;
      }

      // Get the quote
      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .select('id')
        .eq('quote_request_id', quoteRequestId)
        .eq('is_current_version', true)
        .single();

      if (quoteError) throw quoteError;

      // Check for existing invoice
      const { data: existingInvoices, error: invError } = await supabase
        .from('invoices')
        .select('*')
        .eq('quote_id', quote.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (invError) throw invError;

      if (existingInvoices && existingInvoices.length > 0) {
        setInvoice(existingInvoices[0]);
      } else {
        // Create new invoice
        const { data: invoiceId, error: createError } = await supabase
          .rpc('create_invoice_from_quote', {
            quote_request_id_param: quoteRequestId
          });

        if (createError) throw createError;

        const { data: newInvoice, error: fetchError } = await supabase
          .from('invoices')
          .select('*')
          .eq('id', invoiceId)
          .single();

        if (fetchError) throw fetchError;
        
        setInvoice(newInvoice);
        onInvoiceCreated?.();
      }
    } catch (error: any) {
      console.error('Error loading invoice:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load invoice',
        variant: 'destructive',
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const determineUserRole = async () => {
    if (!invoice) return;
    
    try {
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id;
      
      if (userId === invoice.client_id) {
        setUserRole('client');
        // Get client name
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', userId)
          .single();
        setRequiredName(profile?.full_name || '');
      } else if (userId === invoice.vendor_id) {
        setUserRole('vendor');
        // Get vendor business name
        const { data: vendorProfile } = await supabase
          .from('vendor_profiles')
          .select('business_name')
          .eq('user_id', userId)
          .single();
        setRequiredName(vendorProfile?.business_name || '');
      }
    } catch (error) {
      console.error('Error determining user role:', error);
    }
  };

  const handleSign = () => {
    setSignModal(true);
  };

  const processSignature = async () => {
    if (!invoice || !signatureName.trim() || !requiredName) return;

    if (signatureName.trim().toLowerCase() !== requiredName.toLowerCase()) {
      toast({
        title: 'Invalid Signature',
        description: `Please enter exactly: ${requiredName}`,
        variant: 'destructive',
      });
      return;
    }

    setProcessing(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const now = new Date().toISOString();
      const signatureUrl = `signature-${user.user.id}-${Date.now()}`;
      
      const updateData: any = {};
      
      if (userRole === 'client') {
        updateData.client_signature_url = signatureUrl;
        updateData.client_signed_at = now;
        // Update status to awaiting vendor signature
        if (!invoice.vendor_signed_at) {
          updateData.status = 'awaiting_vendor_signature';
        } else {
          updateData.status = 'awaiting_payment';
        }
      } else if (userRole === 'vendor') {
        updateData.vendor_signature_url = signatureUrl;
        updateData.vendor_signed_at = now;
        // Update status to awaiting client signature
        if (!invoice.client_signed_at) {
          updateData.status = 'awaiting_client_signature';
        } else {
          updateData.status = 'awaiting_payment';
        }
      }

      const { error } = await supabase
        .from('invoices')
        .update(updateData)
        .eq('id', invoice.id);

      if (error) throw error;

      setInvoice(prev => prev ? { ...prev, ...updateData } : null);
      
      toast({
        title: 'Signed Successfully',
        description: 'Your digital signature has been recorded',
      });

      setSignModal(false);
      setSignatureName('');
    } catch (error: any) {
      console.error('Error signing:', error);
      toast({
        title: 'Error',
        description: 'Failed to sign invoice',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handlePayment = async () => {
    if (!invoice) return;

    setProcessing(true);
    try {
      const now = new Date().toISOString();
      
      const { error } = await supabase
        .from('invoices')
        .update({
          paid_at: now,
          status: 'paid'
        })
        .eq('id', invoice.id);

      if (error) throw error;

      setInvoice(prev => prev ? { ...prev, paid_at: now, status: 'paid' } : null);
      
      toast({
        title: 'Payment Successful',
        description: 'Invoice has been marked as paid',
      });
    } catch (error: any) {
      console.error('Error processing payment:', error);
      toast({
        title: 'Error',
        description: 'Failed to process payment',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleDecline = async () => {
    try {
      await supabase
        .from('quote_requests')
        .update({ status: 'pending' })
        .eq('id', quoteRequestId);

      toast({
        title: 'Invoice Declined',
        description: 'Quote request returned to pending status',
      });

      onClose();
    } catch (error: any) {
      console.error('Error declining invoice:', error);
      toast({
        title: 'Error',
        description: 'Failed to decline invoice',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!invoice) {
    return null;
  }

  const hasClientSigned = !!invoice.client_signed_at;
  const hasVendorSigned = !!invoice.vendor_signed_at;
  const bothSigned = hasClientSigned && hasVendorSigned;
  const isPaid = !!invoice.paid_at;
  const canSign = (userRole === 'client' && !hasClientSigned) || 
                  (userRole === 'vendor' && !hasVendorSigned);
  const canPay = userRole === 'client' && bothSigned && !isPaid;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-primary" />
            Invoice {invoice.invoice_number}
            <Badge variant={isPaid ? 'default' : bothSigned ? 'secondary' : 'outline'}>
              {isPaid ? 'Paid' : bothSigned ? 'Fully Signed' : 'Pending Signatures'}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Service Fee Notice */}
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-orange-600 mt-0.5" />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-orange-800">Service Fee Information</p>
                  <p className="text-xs text-orange-700">
                    Platform service fee of {invoice.service_fee_percentage}% is deducted from vendor payout.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Breakdown */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Euro className="w-4 h-4" />
                Payment Breakdown
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm">Total Amount:</span>
                  <span className="font-medium">€{invoice.total_amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-orange-600">
                  <span className="text-sm flex items-center gap-1">
                    <Percent className="w-3 h-3" />
                    Service Fee ({invoice.service_fee_percentage}%):
                  </span>
                  <span className="font-medium">-€{invoice.service_fee_amount.toLocaleString()}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-semibold text-green-600">
                  <span>Vendor Payout:</span>
                  <span>€{invoice.vendor_payout_amount.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Signature Status */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <PenTool className="w-4 h-4" />
                Digital Signatures
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 rounded-lg border">
                  <User className="w-5 h-5 text-blue-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Client Signature</p>
                    {hasClientSigned ? (
                      <div className="flex items-center gap-2 mt-1">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span className="text-xs text-green-600">
                          Signed {new Date(invoice.client_signed_at!).toLocaleDateString()}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Pending</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg border">
                  <Building className="w-5 h-5 text-purple-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Vendor Signature</p>
                    {hasVendorSigned ? (
                      <div className="flex items-center gap-2 mt-1">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span className="text-xs text-green-600">
                          Signed {new Date(invoice.vendor_signed_at!).toLocaleDateString()}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Pending</span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Status */}
          {isPaid && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-green-800">Payment Completed</p>
                    <p className="text-xs text-green-700">
                      Paid on {new Date(invoice.paid_at!).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            
            {!isPaid && (
              <>
                <Button variant="destructive" onClick={handleDecline}>
                  Decline Invoice
                </Button>
                
                {canSign && (
                  <Button onClick={handleSign} disabled={processing}>
                    <PenTool className="w-4 h-4 mr-2" />
                    Sign Invoice
                  </Button>
                )}
                
                {canPay && (
                  <Button onClick={handlePayment} disabled={processing}>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Pay Now
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </DialogContent>

      {/* Signature Modal */}
      <Dialog open={signModal} onOpenChange={setSignModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Digital Signature</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              To sign this invoice, please enter your name exactly as it appears in your profile:
            </p>
            
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium">Required name: {requiredName}</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="signature">Your Signature</Label>
              <Input
                id="signature"
                value={signatureName}
                onChange={(e) => setSignatureName(e.target.value)}
                placeholder="Enter your name"
              />
            </div>
            
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setSignModal(false)}>
                Cancel
              </Button>
              <Button onClick={processSignature} disabled={processing || !signatureName.trim()}>
                Confirm Signature
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};

export default InvoiceModal;
