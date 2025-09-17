import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { HelpCircle } from 'lucide-react';

interface RFIModalProps {
  isOpen: boolean;
  onClose: () => void;
  quoteRequestId: string;
  projectTitle: string;
  clientId: string;
}

const RFIModal: React.FC<RFIModalProps> = ({
  isOpen,
  onClose,
  quoteRequestId,
  projectTitle,
  clientId
}) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter your request for information',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          recipient_id: clientId,
          quote_request_id: quoteRequestId,
          message_content: `RFI: ${message}`,
          message_type: 'text'
        });

      if (error) throw error;

      toast({
        title: 'RFI Sent',
        description: 'Your request for information has been sent to the client.',
      });

      onClose();
      setMessage('');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send RFI',
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
            <HelpCircle className="w-5 h-5" />
            Request for Information - "{projectTitle}"
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="rfi-message">
              What information do you need from the client?
            </Label>
            <Textarea
              id="rfi-message"
              placeholder="Please describe what additional information you need to provide an accurate quote..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[120px]"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-gradient-primary">
              {loading ? 'Sending...' : 'Send RFI'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RFIModal;