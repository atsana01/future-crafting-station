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
  User, 
  Building,
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
  sender_id?: string;
  category?: string;
  responses?: any[];
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
  const [participants, setParticipants] = useState<{ client_id: string; vendor_id: string } | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isClient, setIsClient] = useState<boolean>(false);
  const [responseModal, setResponseModal] = useState<{ isOpen: boolean; rfi: any }>({ isOpen: false, rfi: null });

  useEffect(() => {
    if (isOpen && quoteRequestId) {
      fetchRFIs();
      fetchParticipants();
    }
  }, [isOpen, quoteRequestId]);

  const fetchParticipants = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;
      
      const { data: quoteRequest } = await supabase
        .from('quote_requests')
        .select('client_id, vendor_id')
        .eq('id', quoteRequestId)
        .single();
        
      if (quoteRequest) {
        setParticipants(quoteRequest);
        setCurrentUserId(user.user.id);
        setIsClient(user.user.id === quoteRequest.client_id);
      }
    } catch (error: any) {
      console.error('Error fetching participants:', error);
    }
  };

  const fetchRFIs = async () => {
    setLoading(true);
    try {
      // Fetch RFI messages and responses
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('quote_request_id', quoteRequestId)
        .eq('message_type', 'text')
        .order('sent_at', { ascending: false });

      if (error) throw error;

      // Transform message data to RFI format and group responses
      const rfiMap = new Map();
      
      data?.forEach((msg: any) => {
        let messageContent: any = {};
        try {
          messageContent = typeof msg.message_content === 'string' 
            ? JSON.parse(msg.message_content) 
            : msg.message_content;
        } catch {
          messageContent = { description: msg.message_content };
        }

        if (messageContent.type === 'rfi_response') {
          // This is a response to an RFI
          const originalRFIId = messageContent.originalRFIId;
          if (rfiMap.has(originalRFIId)) {
            const rfi = rfiMap.get(originalRFIId);
            rfi.responses = rfi.responses || [];
            rfi.responses.push({
              id: msg.id,
              sender_id: msg.sender_id,
              content: messageContent,
              sent_at: msg.sent_at
            });
            rfi.status = 'responded';
            rfi.responded_at = msg.sent_at;
          }
        } else if (messageContent.subject || messageContent.category || messageContent.urgency) {
          // This is an RFI
          const rfi = {
            id: msg.id,
            sender_id: msg.sender_id,
            title: messageContent.subject || 'Request for Information',
            description: messageContent.description || msg.message_content,
            urgency: messageContent.urgency || 'normal',
            category: messageContent.category || 'General',
            requested_info: messageContent.requested_info || [],
            additional_notes: messageContent.additional_notes || '',
            deadline: messageContent.responseDeadline || '',
            status: 'pending',
            created_at: msg.sent_at,
            responses: [],
            response_data: null,
            responded_at: null
          };
          rfiMap.set(msg.id, rfi);
        }
      });

      setRfis(Array.from(rfiMap.values()));
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
      <DialogContent className="w-[95vw] max-w-5xl h-[85vh] max-h-[85vh] overflow-hidden px-6 py-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-primary" />
            RFIs for {projectTitle}
            <Badge variant="outline">{rfis.length} Total</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-4 h-[70vh]">
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
                    <h3 className="font-semibold text-xl">{selectedRFI ? (selectedRFI.title || 'Request for Information') : 'Request for Information'}</h3>
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
                              <p className="text-sm">{response.content.overallResponse}</p>
                              {response.content.itemResponses && Object.keys(response.content.itemResponses).length > 0 && (
                                <div className="mt-3 space-y-2">
                                  <p className="text-xs font-medium text-muted-foreground">Item-specific responses:</p>
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

                {/* Response Action for Clients */}
                {isClient && selectedRFI && selectedRFI.sender_id !== currentUserId && selectedRFI.status === 'pending' && (
                  <>
                    <Separator />
                    <div className="flex justify-center">
                      <Button
                        onClick={() => setResponseModal({ isOpen: true, rfi: selectedRFI })}
                        className="bg-gradient-primary"
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

        {/* RFI Response Modal */}
        <RFIResponseModal
          isOpen={responseModal.isOpen}
          onClose={() => setResponseModal({ isOpen: false, rfi: null })}
          rfi={responseModal.rfi}
          quoteRequestId={quoteRequestId}
          onResponseSent={() => {
            fetchRFIs();
            setResponseModal({ isOpen: false, rfi: null });
          }}
        />
      </DialogContent>
    </Dialog>
  );
};

export default ViewRFIsModal;