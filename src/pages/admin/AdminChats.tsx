import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { DataTable } from '@/components/admin/DataTable';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

interface Message {
  id: string;
  quote_request_id: string;
  sender_id: string;
  recipient_id: string;
  message_content: string;
  sent_at: string;
  read_status: boolean;
}

const AdminChats = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('sent_at', { ascending: false });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      key: 'content',
      header: 'Message',
      render: (msg: Message) => (
        <div className="max-w-md truncate">{msg.message_content}</div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (msg: Message) => (
        <Badge variant={msg.read_status ? 'default' : 'secondary'}>
          {msg.read_status ? 'Read' : 'Unread'}
        </Badge>
      )
    },
    {
      key: 'date',
      header: 'Date',
      render: (msg: Message) => format(new Date(msg.sent_at), 'MMM dd, yyyy HH:mm')
    }
  ];

  return (
    <>
      <div className="container max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Chat Moderation
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor and moderate all platform communications
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Messages</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading messages...</div>
            ) : (
              <DataTable
                data={messages}
                columns={columns}
                onRowClick={(msg) => setSelectedMessage(msg)}
                searchPlaceholder="Search messages..."
                showDateFilter
                getItemId={(msg) => msg.id}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selectedMessage} onOpenChange={(open) => !open && setSelectedMessage(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Message Details</DialogTitle>
          </DialogHeader>
          {selectedMessage && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Sent At</label>
                  <p className="mt-1">{format(new Date(selectedMessage.sent_at), 'PPpp')}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <p className="mt-1">
                    <Badge variant={selectedMessage.read_status ? 'default' : 'secondary'}>
                      {selectedMessage.read_status ? 'Read' : 'Unread'}
                    </Badge>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Message Content</label>
                  <div className="mt-2 p-4 bg-muted rounded-lg">
                    {selectedMessage.message_content}
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminChats;
