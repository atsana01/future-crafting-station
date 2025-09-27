import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { 
  MessageSquare, 
  Send,
  Building,
  Clock,
  AlertCircle
} from 'lucide-react';

interface RFIResponseModalProps {
  isOpen: boolean;
  onClose: () => void;
  rfi: any;
  quoteRequestId: string;
  onResponseSent?: () => void;
}

const RFIResponseModal: React.FC<RFIResponseModalProps> = ({
  isOpen,
  onClose,
  rfi,
  quoteRequestId,
  onResponseSent
}) => {
  const [responseData, setResponseData] = useState<{
    overall: string;
    items: Record<string, string>;
  }>({
    overall: '',
    items: {}
  });
  const [loading, setLoading] = useState(false);

  // Parse RFI content to extract structured data
  const parseRFIContent = () => {
    try {
      let content: any = {};
      if (typeof rfi.description === 'string') {
        try {
          content = JSON.parse(rfi.description);
        } catch {
          content = { description: rfi.description };
        }
      } else {
        content = rfi.description || {};
      }
      
      return {
        subject: content.subject || rfi.title || 'RFI Request',
        category: content.category || 'General',
        urgency: content.urgency || 'normal',
        description: content.description || content.content || rfi.description,
        responseRequired: content.responseRequired !== false,
        responseDeadline: content.responseDeadline || '',
        requestedInfo: content.requested_info || []
      };
    } catch {
      return {
        subject: rfi.title || 'RFI Request',
        category: 'General',
        urgency: 'normal',
        description: rfi.description,
        responseRequired: true,
        responseDeadline: '',
        requestedInfo: []
      };
    }
  };

  const rfiData = parseRFIContent();

  const handleSubmitResponse = async () => {
    if (!responseData.overall.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide an overall response',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      // Get the original RFI sender and recipient
      const { data: quoteRequest } = await supabase
        .from('quote_requests')
        .select('client_id, vendor_id')
        .eq('id', quoteRequestId)
        .single();

      if (!quoteRequest) throw new Error('Quote request not found');

      // Determine recipient (opposite of current user)
      const recipientId = user.user.id === quoteRequest.client_id 
        ? quoteRequest.vendor_id 
        : quoteRequest.client_id;

      // Submit response as a new message
      const { error } = await supabase
        .from('messages')
        .insert({
          quote_request_id: quoteRequestId,
          sender_id: user.user.id,
          recipient_id: recipientId,
          message_type: 'text',
          message_content: JSON.stringify({
            type: 'rfi_response',
            originalRFIId: rfi.id,
            subject: `RE: ${rfiData.subject}`,
            overallResponse: responseData.overall,
            itemResponses: responseData.items,
            respondedAt: new Date().toISOString()
          })
        });

      if (error) throw error;

      toast({
        title: 'Response Sent',
        description: 'Your RFI response has been sent successfully',
      });

      onResponseSent?.();
      onClose();
      setResponseData({ overall: '', items: {} });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to send response',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency.toLowerCase()) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'normal': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-4xl h-[85vh] max-h-[85vh] overflow-hidden px-6 py-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <MessageSquare className="w-6 h-6 text-primary" />
            Respond to RFI
            <Badge variant={getUrgencyColor(rfiData.urgency)}>
              {rfiData.urgency} Priority
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
          {/* RFI Summary */}
          <Card className="bg-muted/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Building className="w-4 h-4" />
                Original RFI Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium">{rfiData.subject}</p>
                  <div className="flex items-center gap-4 mt-1">
                    <Badge variant="outline">{rfiData.category}</Badge>
                    {rfiData.responseDeadline && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Due: {new Date(rfiData.responseDeadline).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <Separator />
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Description</Label>
                  <p className="text-sm mt-1">{rfiData.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Response Form */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="overallResponse" className="text-sm font-medium">
                Overall Response <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="overallResponse"
                value={responseData.overall}
                onChange={(e) => setResponseData(prev => ({ ...prev, overall: e.target.value }))}
                placeholder="Provide a comprehensive response to the RFI. Include all necessary details, specifications, or clarifications requested."
                rows={6}
                className="mt-1"
              />
            </div>

            {/* Individual Item Responses if structured RFI */}
            {rfiData.requestedInfo && rfiData.requestedInfo.length > 0 && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">Specific Item Responses</Label>
                {rfiData.requestedInfo.map((item: any, index: number) => (
                  <Card key={index} className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <h5 className="font-medium text-sm">{item.category || `Item ${index + 1}`}</h5>
                        {item.required && (
                          <Badge variant="destructive" className="text-xs">Required</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{item.description || item}</p>
                      <Textarea
                        value={responseData.items[index] || ''}
                        onChange={(e) => setResponseData(prev => ({
                          ...prev,
                          items: { ...prev.items, [index]: e.target.value }
                        }))}
                        placeholder="Provide specific response for this item..."
                        rows={3}
                        className="text-sm"
                      />
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Response Guidelines */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-blue-800 mb-2">Response Guidelines</p>
                  <ul className="text-blue-700 space-y-1 text-xs">
                    <li>• Be specific and provide complete information</li>
                    <li>• Include any relevant documentation or references</li>
                    <li>• Address all aspects of the original request</li>
                    <li>• Mention any assumptions or limitations in your response</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmitResponse}
            disabled={loading}
            className="bg-gradient-primary"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send Response
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RFIResponseModal;