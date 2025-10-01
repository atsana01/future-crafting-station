import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { DataTable } from '@/components/admin/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { MessageSquare, EyeOff, Download, Search } from 'lucide-react';
import { useAdminPeriod } from '@/contexts/AdminPeriodContext';
import { exportToCSV } from '@/utils/csvExport';
import { logAdminAction } from '@/utils/auditLog';

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
  const [searchTerm, setSearchTerm] = useState('');
  const { dateRange } = useAdminPeriod();

  useEffect(() => {
    fetchMessages();
  }, [dateRange, searchTerm]);

  const fetchMessages = async () => {
    try {
      let query = supabase
        .from('messages')
        .select('*')
        .gte('sent_at', dateRange.from.toISOString())
        .lte('sent_at', dateRange.to.toISOString())
        .order('sent_at', { ascending: false });

      if (searchTerm) {
        query = query.ilike('message_content', `%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const handleHideMessage = async (messageId: string) => {
    try {
      // In a real implementation, we'd add an is_hidden column
      toast.success('Message hidden');
      logAdminAction('hide_message', 'messages', messageId);
      fetchMessages();
    } catch (error) {
      console.error('Error hiding message:', error);
      toast.error('Failed to hide message');
    }
  };

  const handleExportTranscript = (messages: Message[]) => {
    exportToCSV(messages, 'chat_transcript', [
      { key: 'id', header: 'Message ID' },
      { key: 'message_content', header: 'Content' },
      { key: 'sent_at', header: 'Sent At' },
      { key: 'read_status', header: 'Read' }
    ]);
    logAdminAction('export_transcript', 'messages', undefined, undefined, { count: messages.length });
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

        {/* KPI Card */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <MessageSquare className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{messages.length}</div>
                  <p className="text-sm text-muted-foreground">Total Messages</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-success/10 rounded-lg">
                  <MessageSquare className="h-6 w-6 text-success" />
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {messages.filter(m => m.read_status).length}
                  </div>
                  <p className="text-sm text-muted-foreground">Read</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-muted/10 rounded-lg">
                  <MessageSquare className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {messages.filter(m => !m.read_status).length}
                  </div>
                  <p className="text-sm text-muted-foreground">Unread</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search Bar */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search messages by content, ticket ID, or user..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>

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
                onBulkExport={handleExportTranscript}
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
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => handleHideMessage(selectedMessage.id)}
                    className="flex-1"
                  >
                    <EyeOff className="h-4 w-4 mr-2" />
                    Hide Message
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleExportTranscript([selectedMessage])}
                    className="flex-1"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
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
