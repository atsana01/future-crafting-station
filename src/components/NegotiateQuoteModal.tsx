import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Euro, 
  Calendar, 
  Clock, 
  MessageSquare,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface NegotiateQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  quoteDetails: {
    quote_id: string;
    total_amount: number;
    duration_weeks: number;
    estimated_timeline?: string;
    start_date: string;
    vendor_business_name: string;
    project_title: string;
  };
  onNegotiate: () => void;
}

const NegotiateQuoteModal: React.FC<NegotiateQuoteModalProps> = ({
  isOpen,
  onClose,
  quoteDetails,
  onNegotiate
}) => {
  const [negotiationNotes, setNegotiationNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmitNegotiation = async () => {
    if (!negotiationNotes.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide negotiation details',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('quote_reviews')
        .insert({
          quote_id: quoteDetails.quote_id,
          reviewer_id: (await supabase.auth.getUser()).data.user?.id,
          review_type: 'negotiation',
          review_notes: negotiationNotes
        });

      if (error) throw error;

      toast({
        title: 'Negotiation Sent',
        description: 'Your negotiation request has been sent to the vendor',
      });

      onNegotiate();
      onClose();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to send negotiation request',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Negotiate Quote
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Quote Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Current Quote from {quoteDetails.vendor_business_name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary flex items-center justify-center gap-1">
                    <Euro className="w-5 h-5" />
                    €{quoteDetails.total_amount.toLocaleString()}
                  </div>
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold flex items-center justify-center gap-1">
                    <Clock className="w-4 h-4" />
                    {quoteDetails.estimated_timeline || `${quoteDetails.duration_weeks} weeks`}
                  </div>
                  <p className="text-sm text-muted-foreground">Duration</p>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold flex items-center justify-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {quoteDetails.start_date ? new Date(quoteDetails.start_date).toLocaleDateString() : 'TBD'}
                  </div>
                  <p className="text-sm text-muted-foreground">Start Date</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Negotiation Form */}
          <div className="space-y-4">
            <div className="flex items-start gap-2 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-amber-800 mb-1">Negotiation Guidelines</p>
                <p className="text-amber-700">Please be specific about what you'd like to negotiate (price, timeline, scope, etc.) and provide clear reasoning for your requests.</p>
              </div>
            </div>

            <div>
              <Label htmlFor="negotiationNotes">Negotiation Details</Label>
              <Textarea
                id="negotiationNotes"
                value={negotiationNotes}
                onChange={(e) => setNegotiationNotes(e.target.value)}
                placeholder="Describe what you'd like to negotiate. For example:
- Request a lower price with reasoning
- Propose changes to timeline
- Suggest modifications to scope of work
- Request additional services to be included"
                rows={6}
                className="mt-2"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmitNegotiation}
            disabled={loading}
            className="bg-gradient-primary"
          >
            {loading ? 'Sending...' : 'Send Negotiation Request'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NegotiateQuoteModal;