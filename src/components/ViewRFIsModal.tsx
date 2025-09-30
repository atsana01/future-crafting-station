import React, { useEffect, useMemo, useState } from 'react';
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
  Eye,
  MessageSquare,
} from 'lucide-react';

interface ViewRFIsModalProps {
  isOpen: boolean;
  onClose: () => void;
  quoteRequestId: string;
  projectTitle?: string;
}

interface RFISummary {
  id: string;
  sender_id: string;
  title: string;
  description: string;
  urgency: string;
  category: string;
  requested_info: any[];
  additional_notes: string;
  deadline: string | null;
  created_at: string;
}

interface RFIResponseItem {
  id: string;
  sender_id: string;
  sent_at: string;
  content: any;
}

const safeJsonParse = (value: unknown): any => {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return { description: value };
    }
  }
  return value ?? {};
};

const getUrgencyBadge = (urgency?: string) => {
  const u = (urgency || '').toLowerCase();
  switch (u) {
    case 'high':
      return <Badge variant="destructive">High</Badge>;
    case 'medium':
      return <Badge variant="secondary">Medium</Badge>;
    case 'low':
      return <Badge variant="outline">Low</Badge>;
    default:
      return <Badge variant="secondary">Normal</Badge>;
  }
};

const formatDateTime = (dateString?: string | null) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleString();
  } catch {
    return 'N/A';
  }
};

const RFIItemModal: React.FC<{
  open: boolean;
  onClose: () => void;
  rfi: RFISummary | null;
  quoteRequestId: string;
  currentUserId: string | null;
  clientId: string | null;
}> = ({ open, onClose, rfi, quoteRequestId, currentUserId, clientId }) => {
  const [responses, setResponses] = useState<RFIResponseItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [responseModal, setResponseModal] = useState<{ isOpen: boolean }>(
    { isOpen: false }
  );

  const canRespond = useMemo(() => {
    return !!(rfi && currentUserId && clientId && currentUserId === clientId && rfi.sender_id !== currentUserId);
  }, [rfi, currentUserId, clientId]);

  useEffect(() => {
    const loadResponses = async () => {
      if (!open || !rfi) return;
      setLoading(true);
      try {
        const { data: msgs, error } = await supabase
          .from('messages')
          .select('*')
          .eq('quote_request_id', quoteRequestId)
          .eq('message_type', 'text')
          .order('sent_at', { ascending: true });
        if (error) throw error;

        const items: RFIResponseItem[] = [];
        msgs?.forEach((m: any) => {
          const content = safeJsonParse(m.message_content);
          if (content?.type === 'rfi_response' && content?.originalRFIId === rfi.id) {
            items.push({
              id: m.id,
              sender_id: m.sender_id,
              sent_at: m.sent_at,
              content,
            });
          }
        });
        setResponses(items);
      } catch (e) {
        console.error('Error loading RFI responses', e);
        toast({ title: 'Error', description: 'Failed to load responses', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };

    loadResponses();
  }, [open, rfi, quoteRequestId]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            RFI Details
          </DialogTitle>
        </DialogHeader>

        {!rfi ? (
          <div className="py-16 text-center text-muted-foreground">
            <Eye className="w-10 h-10 mx-auto mb-3 opacity-60" />
            <p>No RFI selected.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h3 className="text-xl font-semibold">{rfi.title || 'Request for Information'}</h3>
                <div className="text-sm text-muted-foreground flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" /> Created {formatDateTime(rfi.created_at)}
                  </span>
                  {rfi.deadline && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" /> Due {formatDateTime(rfi.deadline)}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getUrgencyBadge(rfi.urgency)}
                {rfi.category && <Badge variant="outline">{rfi.category}</Badge>}
              </div>
            </div>

            <Separator />

            <section>
              <h4 className="font-medium mb-2">Description</h4>
              <p className="text-muted-foreground whitespace-pre-wrap">{rfi.description || '—'}</p>
            </section>

            {rfi.requested_info?.length > 0 && (
              <>
                <Separator />
                <section>
                  <h4 className="font-medium mb-3">Requested Information</h4>
                  <div className="space-y-3">
                    {rfi.requested_info.map((item: any, idx: number) => (
                      <Card key={idx}>
                        <CardContent className="pt-4">
                          <p className="text-sm">
                            {typeof item === 'object' ? (item.description || item.category || `Item ${idx + 1}`) : String(item)}
                          </p>
                          {typeof item === 'object' && item.required && (
                            <Badge variant="destructive" className="mt-2">Required</Badge>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </section>
              </>
            )}

            {rfi.additional_notes && (
              <>
                <Separator />
                <section>
                  <h4 className="font-medium mb-2">Additional Notes</h4>
                  <p className="text-muted-foreground whitespace-pre-wrap">{rfi.additional_notes}</p>
                </section>
              </>
            )}

            <Separator />

            <section>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium">Responses</h4>
                {canRespond && (
                  <Button size="sm" onClick={() => setResponseModal({ isOpen: true })}>
                    <MessageSquare className="w-4 h-4 mr-2" /> Respond
                  </Button>
                )}
              </div>

              {loading ? (
                <div className="py-8 text-center text-muted-foreground">Loading responses…</div>
              ) : responses.length === 0 ? (
                <div className="py-6 text-sm text-muted-foreground">No responses yet.</div>
              ) : (
                <div className="space-y-3">
                  {responses.map((res, i) => (
                    <Card key={res.id}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Response {i + 1}</CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm text-muted-foreground">
                        <div className="flex items-center justify-between mb-2">
                          <span>Sent {formatDateTime(res.sent_at)}</span>
                        </div>
                        <p>{res.content?.overallResponse || '—'}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </section>

            <RFIResponseModal
              isOpen={responseModal.isOpen}
              onClose={() => setResponseModal({ isOpen: false })}
              rfi={rfi}
              quoteRequestId={quoteRequestId}
              onResponseSent={() => {
                // Refresh responses after sending
                setResponseModal({ isOpen: false });
                // Trigger effect by toggling open
                // No-op: The parent effect listens to rfi/open and reloads
              }}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const ViewRFIsModal: React.FC<ViewRFIsModalProps> = ({
  isOpen,
  onClose,
  quoteRequestId,
  projectTitle = 'Project',
}) => {
  const [rfis, setRfis] = useState<RFISummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);

  const [activeRFI, setActiveRFI] = useState<RFISummary | null>(null);
  const [itemOpen, setItemOpen] = useState(false);

  useEffect(() => {
    if (!isOpen || !quoteRequestId) return;
    const init = async () => {
      // Load auth context
      try {
        const { data: userRes } = await supabase.auth.getUser();
        setCurrentUserId(userRes.user?.id ?? null);
      } catch (e) {
        console.warn('Could not get current user', e);
      }

      // Load quote request context (client id)
      try {
        const { data: qr, error } = await supabase
          .from('quote_requests')
          .select('client_id')
          .eq('id', quoteRequestId)
          .maybeSingle();
        if (error) throw error;
        setClientId(qr?.client_id ?? null);
      } catch (e) {
        console.warn('Could not get quote request', e);
      }

      // Load RFIs list
      await loadRFIs();
    };

    init();
  }, [isOpen, quoteRequestId]);

  const loadRFIs = async () => {
    setLoading(true);
    try {
      const { data: msgs, error } = await supabase
        .from('messages')
        .select('*')
        .eq('quote_request_id', quoteRequestId)
        .eq('message_type', 'text')
        .order('sent_at', { ascending: false });
      if (error) throw error;

      const items: RFISummary[] = [];
      msgs?.forEach((m: any) => {
        const content = safeJsonParse(m.message_content);
        const isRFI = content?.type === 'rfi' || content?.subject || content?.category || content?.urgency;
        if (!isRFI) return;

        items.push({
          id: m.id,
          sender_id: m.sender_id,
          title: content?.subject || 'Request for Information',
          description: content?.description || '',
          urgency: content?.urgency || 'normal',
          category: content?.category || 'General',
          requested_info: Array.isArray(content?.requested_info) ? content.requested_info : [],
          additional_notes: content?.additional_notes || '',
          deadline: content?.responseDeadline || null,
          created_at: m.sent_at,
        });
      });

      setRfis(items);
    } catch (e) {
      console.error('Error loading RFIs', e);
      toast({ title: 'Error', description: 'Failed to load RFIs', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const openItem = (rfi: RFISummary) => {
    setActiveRFI(rfi);
    setItemOpen(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-5xl max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-primary" />
            RFIs for {projectTitle}
            <Badge variant="outline">{rfis.length} Total</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="h-[calc(85vh-120px)] overflow-y-auto pr-1">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              Loading RFIs…
            </div>
          ) : rfis.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No RFIs submitted yet.
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {rfis.map((rfi) => (
                <Card key={rfi.id} className="transition-shadow hover:shadow-md">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-3">
                      <CardTitle className="text-base line-clamp-1">{rfi.title || 'Request for Information'}</CardTitle>
                      <div className="flex gap-2 shrink-0">
                        {getUrgencyBadge(rfi.urgency)}
                        {rfi.category && <Badge variant="outline">{rfi.category}</Badge>}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{rfi.description}</p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {formatDateTime(rfi.created_at)}
                      </span>
                      {rfi.deadline && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Due {formatDateTime(rfi.deadline)}
                        </span>
                      )}
                    </div>
                    <div className="flex justify-end">
                      <Button size="sm" onClick={() => openItem(rfi)}>
                        <Eye className="w-4 h-4 mr-2" /> View
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>

        <RFIItemModal
          open={itemOpen}
          onClose={() => setItemOpen(false)}
          rfi={activeRFI}
          quoteRequestId={quoteRequestId}
          currentUserId={currentUserId}
          clientId={clientId}
        />
      </DialogContent>
    </Dialog>
  );
};

export default ViewRFIsModal;

