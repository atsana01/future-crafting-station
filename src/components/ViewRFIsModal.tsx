import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { 
  FileText, 
  Calendar, 
  User, 
  Building,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye
} from 'lucide-react';

interface ViewRFIsModalProps {
  isOpen: boolean;
  onClose: () => void;
  quoteRequestId: string;
  projectTitle: string;
}

interface RFIData {
  id: string;
  title: string;
  description: string;
  urgency: string;
  requested_info: any[];
  additional_notes: string;
  deadline: string;
  status: string;
  created_at: string;
  response_data: any;
  responded_at: string | null;
}

const ViewRFIsModal: React.FC<ViewRFIsModalProps> = ({
  isOpen,
  onClose,
  quoteRequestId,
  projectTitle
}) => {
  const [rfis, setRfis] = useState<RFIData[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRFI, setSelectedRFI] = useState<RFIData | null>(null);

  useEffect(() => {
    if (isOpen && quoteRequestId) {
      fetchRFIs();
    }
  }, [isOpen, quoteRequestId]);

  const fetchRFIs = async () => {
    setLoading(true);
    try {
      // In a real implementation, you'd fetch from an RFI table
      // For now, we'll create mock data structure
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('quote_request_id', quoteRequestId)
        .eq('message_type', 'text')
        .order('sent_at', { ascending: false });

      if (error) throw error;

      // Transform message data to RFI format
      const transformedRFIs = data?.map((msg: any) => {
        let messageContent: any = {};
        try {
          messageContent = typeof msg.message_content === 'string' 
            ? JSON.parse(msg.message_content) 
            : msg.message_content;
        } catch {
          messageContent = { title: 'RFI Request', description: msg.message_content };
        }

        return {
          id: msg.id,
          title: messageContent.title || 'Request for Information',
          description: messageContent.description || messageContent.content || msg.message_content,
          urgency: messageContent.urgency || 'medium',
          requested_info: messageContent.requested_info || [],
          additional_notes: messageContent.additional_notes || '',
          deadline: messageContent.deadline || '',
          status: messageContent.status || 'pending',
          created_at: msg.sent_at,
          response_data: messageContent.response_data || null,
          responded_at: messageContent.responded_at || null
        };
      }) || [];

      setRfis(transformedRFIs);
    } catch (error: any) {
      console.error('Error fetching RFIs:', error);
      toast({
        title: 'Error',
        description: 'Failed to load RFIs',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency.toLowerCase()) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'default';
      case 'pending': return 'secondary';
      case 'in_progress': return 'outline';
      default: return 'secondary';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-primary" />
            RFIs for {projectTitle}
            <Badge variant="outline">{rfis.length} Total</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-6 h-[70vh]">
          {/* RFI List */}
          <div className="w-1/2 space-y-4 overflow-y-auto pr-2">
            <h3 className="font-semibold text-lg">All RFIs</h3>
            
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : rfis.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No RFIs have been submitted for this project yet.</p>
                </CardContent>
              </Card>
            ) : (
              rfis.map((rfi) => (
                <Card 
                  key={rfi.id} 
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedRFI?.id === rfi.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedRFI(rfi)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{rfi.title}</CardTitle>
                      <div className="flex gap-2">
                        <Badge variant={getUrgencyColor(rfi.urgency)}>
                          {rfi.urgency}
                        </Badge>
                        <Badge variant={getStatusColor(rfi.status)}>
                          {rfi.status}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {rfi.description}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(rfi.created_at)}
                      </span>
                      {rfi.deadline && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Due: {formatDate(rfi.deadline)}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* RFI Details */}
          <div className="w-1/2 border-l pl-6">
            {selectedRFI ? (
              <div className="space-y-6 overflow-y-auto max-h-full">
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="font-semibold text-xl">{selectedRFI.title}</h3>
                    <div className="flex gap-2">
                      <Badge variant={getUrgencyColor(selectedRFI.urgency)}>
                        {selectedRFI.urgency} Priority
                      </Badge>
                      <Badge variant={getStatusColor(selectedRFI.status)}>
                        {selectedRFI.status}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span>Created: {formatDate(selectedRFI.created_at)}</span>
                    </div>
                    {selectedRFI.deadline && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span>Deadline: {formatDate(selectedRFI.deadline)}</span>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-semibold mb-3">Description</h4>
                  <p className="text-muted-foreground">{selectedRFI.description}</p>
                </div>

                {selectedRFI.requested_info && selectedRFI.requested_info.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-semibold mb-3">Requested Information</h4>
                      <div className="space-y-3">
                        {selectedRFI.requested_info.map((item: any, index: number) => (
                          <Card key={index} className="p-4">
                            <h5 className="font-medium mb-2">{item.category || `Item ${index + 1}`}</h5>
                            <p className="text-sm text-muted-foreground">{item.description || item}</p>
                            {item.required && (
                              <Badge variant="destructive" className="mt-2">Required</Badge>
                            )}
                          </Card>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {selectedRFI.additional_notes && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-semibold mb-3">Additional Notes</h4>
                      <p className="text-muted-foreground">{selectedRFI.additional_notes}</p>
                    </div>
                  </>
                )}

                {selectedRFI.response_data && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        Response
                      </h4>
                      <Card className="p-4 bg-green-50 border-green-200">
                        <p className="text-sm">{JSON.stringify(selectedRFI.response_data, null, 2)}</p>
                        {selectedRFI.responded_at && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Responded on: {formatDate(selectedRFI.responded_at)}
                          </p>
                        )}
                      </Card>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <Eye className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Select an RFI to view details</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ViewRFIsModal;