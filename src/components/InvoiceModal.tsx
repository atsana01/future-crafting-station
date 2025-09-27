// Clean up unused imports and optimize code structure
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
  User, 
  Building, 
  Calendar,
  PenTool,
  CreditCard,
  CheckCircle2,
  Info,
  Percent
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
  const [signing, setSigning] = useState(false);

  const [userRole, setUserRole] = useState<string | null>(null);

  const [signModal, setSignModal] = useState<{
    isOpen: boolean;
    userRole: string;
    requiredName: string;
  }>({ isOpen: false, userRole: '', requiredName: '' });

  const [signatureName, setSignatureName] = useState('');

  useEffect(() => {
    if (isOpen && quoteRequestId) {
      fetchOrCreateInvoice();
    }
  }, [isOpen, quoteRequestId]);

  useEffect(() => {
    if (invoice) {
      getCurrentUserRole().then(setUserRole);
    }
  }, [invoice]);

  useEffect(() => {
    if (signModal.isOpen && userRole && invoice) {
      loadRequiredName();
    }
  }, [signModal.isOpen, userRole, invoice]);

  const loadRequiredName = async () => {
    if (!invoice || !userRole) return;

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      let requiredName = '';
      if (user.user.id === invoice.client_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', user.user.id)
          .single();
        requiredName = profile?.full_name || '';
      } else if (user.user.id === invoice.vendor_id) {
        const { data: vendorProfile } = await supabase
          .from('vendor_profiles')
          .select('business_name')
          .eq('user_id', user.user.id)
          .single();
        requiredName = vendorProfile?.business_name || '';
      }

      setSignModal(prev => ({ ...prev, requiredName }));
    } catch (error) {
      console.error('Error loading required name:', error);
    }
  };

  const fetchOrCreateInvoice = async () => {
    setLoading(true);
    try {
      // First, try to get existing invoice - need to find by quote_request_id via quote
      const { data: existingInvoice, error: fetchError } = await supabase
        .from('invoices')
        .select(`
          *,
          quotes!inner(quote_request_id)
        `)
        .eq('quotes.quote_request_id', quoteRequestId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existingInvoice) {
        setInvoice(existingInvoice);
      } else {
        // Create new invoice
        const { data: invoiceId, error: createError } = await supabase
          .rpc('create_invoice_from_quote', {
            quote_request_id_param: quoteRequestId
          });

        if (createError) throw createError;

        // Fetch the created invoice
        const { data: newInvoice, error: newFetchError } = await supabase
          .from('invoices')
          .select('*')
          .eq('id', invoiceId)
          .single();

        if (newFetchError) throw newFetchError;

        setInvoice(newInvoice);
        onInvoiceCreated?.();
      }
    } catch (error: any) {
      console.error('Error with invoice:', error);
      toast({
        title: 'Error',
        description: 'Failed to create invoice',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSign = async () => {
    if (!invoice) return;
    setSignModal({ isOpen: true, userRole: userRole || '', requiredName: '' });
  };

  const processSignature = async () => {
    if (!invoice || !signatureName.trim()) return;

    setSigning(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Get user's profile or vendor profile to validate name
      let requiredName = '';
      if (user.user.id === invoice.client_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', user.user.id)
          .single();
        requiredName = profile?.full_name || '';
      } else if (user.user.id === invoice.vendor_id) {
        const { data: vendorProfile } = await supabase
          .from('vendor_profiles')
          .select('business_name')
          .eq('user_id', user.user.id)
          .single();
        requiredName = vendorProfile?.business_name || '';
      }

      if (signatureName.trim().toLowerCase() !== signModal.requiredName.toLowerCase()) {
        toast({
          title: 'Signature Name Mismatch',
          description: `Please enter exactly: ${signModal.requiredName}`,
          variant: 'destructive',
        });
        setSigning(false);
        return;
      }

      const signatureUrl = `signature-${user.user.id}-${Date.now()}`;
      const now = new Date().toISOString();

      const updateData: any = {};
      
      if (user.user.id === invoice.client_id) {
        updateData.client_signature_url = signatureUrl;
        updateData.client_signed_at = now;
      } else if (user.user.id === invoice.vendor_id) {
        updateData.vendor_signature_url = signatureUrl;
        updateData.vendor_signed_at = now;
      }

      const { error } = await supabase
        .from('invoices')
        .update(updateData)
        .eq('id', invoice.id);

      if (error) throw error;

      // Update local state
      setInvoice(prev => prev ? { ...prev, ...updateData } : null);

      toast({
        title: 'Signed Successfully',
        description: 'Your digital signature has been recorded',
      });

      setSignModal({ isOpen: false, userRole: '', requiredName: '' });
      setSignatureName('');

      // Check if both parties have signed, then proceed to payment
      const bothSigned = (updateData.client_signed_at || invoice.client_signed_at) && 
                        (updateData.vendor_signed_at || invoice.vendor_signed_at);
      
      if (bothSigned) {
        await initiatePayment();
      }

    } catch (error: any) {
      console.error('Error signing:', error);
      toast({
        title: 'Error',
        description: 'Failed to sign document',
        variant: 'destructive',
      });
    } finally {
      setSigning(false);
    }
  };

  const initiatePayment = async () => {
    if (!invoice) return;

    try {
      // Update status to ready for payment
      const { error } = await supabase
        .from('invoices')
        .update({ status: 'ready_for_payment' })
        .eq('id', invoice.id);

      if (error) throw error;

      setInvoice(prev => prev ? { ...prev, status: 'ready_for_payment' } : null);

      // Here you would integrate with Stripe
      // For now, we'll simulate the process
      toast({
        title: 'Ready for Payment',
        description: 'Both parties have signed. Payment processing will begin shortly.',
      });
    } catch (error: any) {
      console.error('Error initiating payment:', error);
    }
  };

  const getCurrentUserRole = async () => {
    if (!invoice) return null;
    
    try {
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id;
      
      if (userId === invoice.client_id) return 'client';
      if (userId === invoice.vendor_id) return 'vendor';
      return null;
    } catch {
      return null;
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
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <div className="text-center py-8">
            <p className="text-muted-foreground">No invoice data available</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const hasClientSigned = !!invoice.client_signed_at;
  const hasVendorSigned = !!invoice.vendor_signed_at;
  const bothSigned = hasClientSigned && hasVendorSigned;
  const canSign = (userRole === 'client' && !hasClientSigned) || 
                  (userRole === 'vendor' && !hasVendorSigned);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-primary" />
            Invoice {invoice.invoice_number}
            <Badge variant={bothSigned ? 'default' : 'secondary'}>
              {bothSigned ? 'Fully Signed' : 'Pending Signatures'}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 overflow-y-auto max-h-[70vh] pr-2">
          {/* Service Fee Notice */}
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-orange-600 mt-0.5" />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-orange-800">
                    Service Fee Information
                  </p>
                  <p className="text-xs text-orange-700">
                    Our {invoice.service_fee_percentage}% service fee is deducted from the vendor's payment. 
                    The fee varies based on the vendor's account tier (Free: 2%, Basic: 1.75%, Premium: 1.5%).
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Invoice Details */}
          <div className="grid grid-cols-2 gap-6">
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

            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Invoice Details
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created:</span>
                    <span>{new Date(invoice.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant="secondary">{invoice.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

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
                    <div className="flex items-center gap-2 mt-1">
                      {hasClientSigned ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          <span className="text-xs text-green-600">
                            Signed {new Date(invoice.client_signed_at!).toLocaleDateString()}
                          </span>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">Pending signature</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg border">
                  <Building className="w-5 h-5 text-purple-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Vendor Signature</p>
                    <div className="flex items-center gap-2 mt-1">
                      {hasVendorSigned ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          <span className="text-xs text-green-600">
                            Signed {new Date(invoice.vendor_signed_at!).toLocaleDateString()}
                          </span>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">Pending signature</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Status */}
          {bothSigned && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-800">Ready for Payment</p>
                    <p className="text-sm text-green-700">
                      Both parties have signed. Payment will be processed automatically.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          
          {canSign && (
            <Button 
              onClick={handleSign}
              disabled={signing}
              className="bg-gradient-primary"
            >
              {signing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Signing...
                </>
              ) : (
                <>
                  <PenTool className="w-4 h-4 mr-2" />
                  Sign Document
                </>
              )}
            </Button>
          )}
          
          {bothSigned && invoice.status !== 'ready_for_payment' && (
            <Button 
              onClick={initiatePayment}
              className="bg-green-600 hover:bg-green-700"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Process Payment
            </Button>
          )}
        </div>

        {/* Signature Modal */}
        <Dialog open={signModal.isOpen} onOpenChange={() => setSignModal({ isOpen: false, userRole: '', requiredName: '' })}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Digital Signature Required</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                To complete the digital signature, please type your {userRole === 'client' ? 'full name' : 'business name'} exactly as it appears in your BuildEasy account:
              </div>
              <div className="p-3 bg-muted rounded-md">
                <Label className="text-sm font-medium">Required Name:</Label>
                <div className="font-mono text-sm mt-1">
                  {signModal.requiredName || 'Loading...'}
                </div>
              </div>
              <div>
                <Label htmlFor="signatureName">Type your name below:</Label>
                <Input
                  id="signatureName"
                  value={signatureName}
                  onChange={(e) => setSignatureName(e.target.value)}
                  placeholder="Enter your name exactly"
                  className="mt-1"
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSignModal({ isOpen: false, userRole: '', requiredName: '' });
                    setSignatureName('');
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={processSignature}
                  disabled={signing || !signatureName.trim()}
                  className="bg-gradient-primary"
                >
                  {signing ? 'Signing...' : 'Sign'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceModal;