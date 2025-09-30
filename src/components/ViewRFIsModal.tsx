import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import RFIResponseModal from './RFIResponseModal';
import { 
  FileText, 
  Calendar, 
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  MessageSquare
} from 'lucide-react';

interface ViewRFIsModalProps {
  isOpen: boolean;
  onClose: () => void;
  quoteRequestId: string;
  projectTitle?: string;
}

interface RFIMessage {
  id: string;
  title: string;
  description: string;
  urgency: string;
  category: string;
  requested_info: any[];
  additional_notes: string;
  deadline: string;
  status: string;
  created_at: string;
  sender_id: string;
  responses: RFIResponse[];
}

interface RFIResponse {
  id: string;
  sender_id: string;
  content: any;
  sent_at: string;
}

const ViewRFIsModal: React.FC<ViewRFIsModalProps> = ({
  isOpen,
  onClose,
  quoteRequestId,
  projectTitle = 'Project'
}) => {
  const [rfis, setRfis] = useState<RFIMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRFI, setSelectedRFI] = useState<RFIMessage | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [responseModal, setResponseModal] = useState<{ isOpen: boolean; rfi: any }>({ 
    isOpen: false, 
    rfi: null 
  });

  useEffect(() => {
    if (isOpen && quoteRequestId) {
      loadRFIs();
      loadUserContext();
    }
  }, [isOpen, quoteRequestId]);

  useEffect(() => {
    if (rfis.length > 0 && !selectedRFI) {
      setSelectedRFI(rfis[0]);
    }
  }, [rfis]);

  const loadUserContext = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      setCurrentUserId(user.id);

      const { data: quoteRequest } = await supabase
        .from('quote_requests')
        .select('client_id')
        .eq('id', quoteRequestId)
        .single();
        
      if (quoteRequest) {
        setClientId(quoteRequest.client_id);
      }
    } catch (error) {
      console.error('Error loading user context:', error);
    }
  };

  const loadRFIs = async () => {
    setLoading(true);
    try {
      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('quote_request_id', quoteRequestId)
        .eq('message_type', 'text')
        .order('sent_at', { ascending: false });

      if (error) throw error;

      const rfiMap = new Map<string, RFIMessage>();
      
      messages?.forEach((msg: any) => {
        let content: any = {};
        try {
          content = typeof msg.message_content === 'string' 
            ? JSON.parse(msg.message_content) 
            : msg.message_content;
        } catch {
          content = { description: msg.message_content };
        }

        if (content.type === 'rfi_response') {
          const originalRFIId = content.originalRFIId;
          if (rfiMap.has(originalRFIId)) {
            const rfi = rfiMap.get(originalRFIId)!;
            rfi.responses.push({
              id: msg.id,
              sender_id: msg.sender_id,
              content: content,
              sent_at: msg.sent_at
            });
            rfi.status = 'responded';
          }
        } else if (content.subject || content.category || content.urgency) {
          const rfiMessage: RFIMessage = {
            id: msg.id,
            sender_id: msg.sender_id,
            title: content.subject || 'Request for Information',
            description: content.description || '',
            urgency: content.urgency || 'normal',
            category: content.category || 'General',
            requested_info: Array.isArray(content.requested_info) ? content.requested_info : [],
            additional_notes: content.additional_notes || '',
            deadline: content.responseDeadline || '',
            status: 'pending',
            created_at: msg.sent_at,
            responses: []
          };
          rfiMap.set(msg.id, rfiMessage);
        }
      });

      setRfis(Array.from(rfiMap.values()));
    } catch (error: any) {
      console.error('Error loading RFIs:', error);
      toast({
        title: 'Error',
        description: 'Failed to load RFIs',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getUrgencyColor = (urgency: string): any => {
    switch (urgency.toLowerCase()) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
    }
  };

  const getStatusColor = (status: string): any => {
    switch (status.toLowerCase()) {
      case 'responded': return 'default';
      case 'pending': return 'secondary';
      default: return 'secondary';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isClient = currentUserId === clientId;
  const canRespond = (rfi: RFIMessage) => 
    isClient && rfi.sender_id !== currentUserId && rfi.status === 'pending';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-5xl h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-primary" />
            RFIs for {projectTitle}
            <Badge variant="outline">{rfis.length} Total</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-4 h-[calc(85vh-120px)]">
          {/* RFI List */}
          <div className="w-1/2 space-y-4 overflow-y-auto pr-2">
            <h3 className="font-semibold text-lg sticky top-0 bg-background pb-2">All RFIs</h3>
            
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : rfis.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No RFIs submitted yet</p>
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
          <div className="w-1/2 border-l pl-6 overflow-y-auto">
            {selectedRFI ? (
              <div className="space-y-6">
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="font-semibold text-xl">{selectedRFI.title}</h3>
                    <div className="flex gap-2">
                      <Badge variant={getUrgencyColor(selectedRFI.urgency)}>
                        {selectedRFI.urgency}
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
                            <h5 className="font-medium mb-2">
                              {typeof item === 'object' ? item.category || `Item ${index + 1}` : `Item ${index + 1}`}
                            </h5>
                            <p className="text-sm text-muted-foreground">
                              {typeof item === 'object' ? item.description || item : item}
                            </p>
                            {typeof item === 'object' && item.required && (
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

                {selectedRFI.responses && selectedRFI.responses.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        Responses ({selectedRFI.responses.length})
                      </h4>
                      <div className="space-y-3">
                        {selectedRFI.responses.map((response: any, index: number) => (
                          <Card key={index} className="p-4 bg-green-50 border-green-200">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium">Response {index + 1}</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDate(response.sent_at)}
                                </p>
                              </div>
                              <p className="text-sm">{response.content.overallResponse || 'No response text'}</p>
                              {response.content.itemResponses && Object.keys(response.content.itemResponses).length > 0 && (
                                <div className="mt-3 space-y-2">
                                  <p className="text-xs font-medium text-muted-foreground">Item responses:</p>
                                  {Object.entries(response.content.itemResponses).map(([key, value]: [string, any]) => (
                                    <div key={key} className="text-xs">
                                      <span className="font-medium">Item {parseInt(key) + 1}:</span> {value}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {canRespond(selectedRFI) && (
                  <>
                    <Separator />
                    <div className="flex justify-center">
                      <Button
                        onClick={() => setResponseModal({ isOpen: true, rfi: selectedRFI })}
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Respond to RFI
                      </Button>
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

        <RFIResponseModal
          isOpen={responseModal.isOpen}
          onClose={() => setResponseModal({ isOpen: false, rfi: null })}
          rfi={responseModal.rfi}
          quoteRequestId={quoteRequestId}
          onResponseSent={() => {
            loadRFIs();
            setResponseModal({ isOpen: false, rfi: null });
          }}
        />
      </DialogContent>
    </Dialog>
  );
};

export default ViewRFIsModal;
