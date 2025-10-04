import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Plus, CheckCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import CreateRFIModal from './CreateRFIModal';
import RFIThreadModal from './RFIThreadModal';

interface RFI {
  id: string;
  ticket_id: string;
  created_by: string;
  status: 'open' | 'resolved';
  title: string;
  question: string;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  message_count?: number;
}

interface RFIListProps {
  ticketId: string;
  userRole: 'client' | 'vendor';
}

const RFIList = ({ ticketId, userRole }: RFIListProps) => {
  const [rfis, setRfis] = useState<RFI[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedRFI, setSelectedRFI] = useState<RFI | null>(null);

  useEffect(() => {
    fetchRFIs();
    subscribeToRFIs();
  }, [ticketId]);

  const fetchRFIs = async () => {
    try {
      const { data, error } = await supabase
        .from('rfis')
        .select(`
          *,
          rfi_messages(count)
        `)
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const rfisWithCount = (data?.map(rfi => ({
        ...rfi,
        status: rfi.status as 'open' | 'resolved',
        message_count: rfi.rfi_messages?.[0]?.count || 0
      })) || []) as RFI[];

      setRfis(rfisWithCount);
    } catch (error: any) {
      console.error('Error fetching RFIs:', error);
      toast.error('Failed to load RFIs');
    } finally {
      setLoading(false);
    }
  };

  const subscribeToRFIs = () => {
    const channel = supabase
      .channel(`rfis-${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rfis',
          filter: `ticket_id=eq.${ticketId}`
        },
        () => {
          fetchRFIs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const openRFIs = rfis.filter(rfi => rfi.status === 'open');
  const resolvedRFIs = rfis.filter(rfi => rfi.status === 'resolved');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Requests for Information</h3>
            <p className="text-sm text-muted-foreground">
              {userRole === 'vendor' 
                ? 'Request additional information from the client'
                : 'View and respond to vendor information requests'}
            </p>
          </div>
          <Button onClick={() => setCreateModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New RFI
          </Button>
        </div>

        {/* Open RFIs */}
        {openRFIs.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Open ({openRFIs.length})
            </h4>
            {openRFIs.map((rfi) => (
              <Card
                key={rfi.id}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => setSelectedRFI(rfi)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h5 className="font-medium truncate">{rfi.title}</h5>
                        <Badge variant="secondary">Open</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {rfi.question}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{format(new Date(rfi.created_at), 'MMM dd, yyyy')}</span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          {rfi.message_count || 0} {rfi.message_count === 1 ? 'reply' : 'replies'}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Resolved RFIs */}
        {resolvedRFIs.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Resolved ({resolvedRFIs.length})
            </h4>
            {resolvedRFIs.map((rfi) => (
              <Card
                key={rfi.id}
                className="cursor-pointer hover:border-primary/50 transition-colors opacity-75"
                onClick={() => setSelectedRFI(rfi)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h5 className="font-medium truncate">{rfi.title}</h5>
                        <Badge variant="outline" className="text-success border-success">
                          Resolved
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {rfi.question}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{format(new Date(rfi.created_at), 'MMM dd, yyyy')}</span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          {rfi.message_count || 0} {rfi.message_count === 1 ? 'reply' : 'replies'}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty state */}
        {rfis.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h4 className="font-medium mb-2">No RFIs yet</h4>
              <p className="text-sm text-muted-foreground mb-4">
                {userRole === 'vendor'
                  ? 'Request additional information from the client to provide an accurate quote'
                  : 'The vendor has not requested any additional information yet'}
              </p>
              <Button onClick={() => setCreateModalOpen(true)} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Create First RFI
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <CreateRFIModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        ticketId={ticketId}
        onCreated={fetchRFIs}
      />

      {selectedRFI && (
        <RFIThreadModal
          rfi={selectedRFI}
          isOpen={!!selectedRFI}
          onClose={() => setSelectedRFI(null)}
          onStatusChange={fetchRFIs}
        />
      )}
    </>
  );
};

export default RFIList;
