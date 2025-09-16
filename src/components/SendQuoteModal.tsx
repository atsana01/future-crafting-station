import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { DollarSign, Clock, FileText } from 'lucide-react';

interface SendQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  quoteRequestId: string;
  projectTitle: string;
  onQuoteSent: () => void;
}

const SendQuoteModal: React.FC<SendQuoteModalProps> = ({
  isOpen,
  onClose,
  quoteRequestId,
  projectTitle,
  onQuoteSent
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    quotedAmount: '',
    estimatedTimeline: '',
    vendorNotes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.quotedAmount || !formData.estimatedTimeline) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    
    try {
      const { error } = await supabase
        .from('quote_requests')
        .update({
          quoted_amount: parseFloat(formData.quotedAmount),
          estimated_timeline: formData.estimatedTimeline,
          vendor_notes: formData.vendorNotes,
          status: 'quoted',
          responded_at: new Date().toISOString()
        })
        .eq('id', quoteRequestId);

      if (error) throw error;

      toast({
        title: 'Quote Sent',
        description: 'Your quote has been sent to the client successfully.',
      });

      onQuoteSent();
      onClose();
      setFormData({ quotedAmount: '', estimatedTimeline: '', vendorNotes: '' });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send quote',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Send Quote for "{projectTitle}"
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="quotedAmount" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Quoted Amount (USD) *
            </Label>
            <Input
              id="quotedAmount"
              type="number"
              step="0.01"
              placeholder="Enter quote amount"
              value={formData.quotedAmount}
              onChange={(e) => setFormData(prev => ({ ...prev, quotedAmount: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="estimatedTimeline" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Estimated Timeline *
            </Label>
            <Input
              id="estimatedTimeline"
              placeholder="e.g., 6-8 weeks, 3 months"
              value={formData.estimatedTimeline}
              onChange={(e) => setFormData(prev => ({ ...prev, estimatedTimeline: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="vendorNotes" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Additional Notes (Optional)
            </Label>
            <Textarea
              id="vendorNotes"
              placeholder="Include any additional details, terms, or clarifications..."
              value={formData.vendorNotes}
              onChange={(e) => setFormData(prev => ({ ...prev, vendorNotes: e.target.value }))}
              className="min-h-[100px]"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-gradient-primary">
              {loading ? 'Sending...' : 'Send Quote'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SendQuoteModal;