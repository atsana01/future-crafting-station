// @ts-nocheck
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { 
  User, 
  MessageSquare, 
  FileText, 
  Ticket, 
  FileCheck,
  Download,
  Eye
} from 'lucide-react';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userType: 'vendor' | 'client';
}

export const UserManagementModal = ({ isOpen, onClose, userId, userType }: UserManagementModalProps) => {
  const [profile, setProfile] = useState<any>(null);
  const [vendorProfile, setVendorProfile] = useState<any>(null);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [chats, setChats] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && userId) {
      fetchUserData();
    }
  }, [isOpen, userId]);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      setProfile(profileData);

      // If vendor, fetch vendor profile
      if (userType === 'vendor') {
        const { data: vendorData } = await supabase
          .from('vendor_profiles')
          .select('*')
          .eq('user_id', userId)
          .single();
        
        setVendorProfile(vendorData);
      }

      // Fetch quotes
      let quotesData: any[] = [];
      try {
        const quotesQuery = userType === 'vendor'
          ? supabase.from('quotes').select('*').eq('vendor_id', userId)
          : supabase.from('quotes').select('*').eq('client_id', userId);
        const quotesResult: any = await quotesQuery;
        quotesData = quotesResult.data || [];
      } catch (e) {
        console.error('Error fetching quotes:', e);
      }
      setQuotes(quotesData);

      // Fetch tickets/quote requests
      let ticketsData: any[] = [];
      try {
        const ticketsQuery = userType === 'vendor'
          ? supabase.from('quote_requests').select('*').eq('vendor_id', userId)
          : supabase.from('quote_requests').select('*').eq('client_id', userId);
        const ticketsResult: any = await ticketsQuery;
        ticketsData = ticketsResult.data || [];
      } catch (e) {
        console.error('Error fetching tickets:', e);
      }
      setTickets(ticketsData);

      // Fetch chat messages grouped by quote_request
      const { data: messagesData } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('sent_at', { ascending: false });
      
      // Group messages by quote_request
      interface GroupedChat {
        quote_request_id: string;
        ticket_id: string;
        messages: any[];
        lastMessage: string;
      }
      
      const groupedChats: GroupedChat[] = [];
      if (messagesData) {
        messagesData.forEach((msg) => {
          const existingChat = groupedChats.find(c => c.quote_request_id === msg.quote_request_id);
          if (!existingChat) {
            groupedChats.push({
              quote_request_id: msg.quote_request_id || '',
              ticket_id: msg.quote_request_id || '',
              messages: [msg],
              lastMessage: msg.sent_at
            });
          } else {
            existingChat.messages.push(msg);
          }
        });
      }
      
      setChats(groupedChats);

      // Fetch invoices
      let invoicesData: any[] = [];
      try {
        const invoicesQuery = userType === 'vendor'
          ? supabase.from('invoices').select('*').eq('vendor_id', userId)
          : supabase.from('invoices').select('*').eq('client_id', userId);
        const invoicesResult: any = await invoicesQuery;
        invoicesData = invoicesResult.data || [];
      } catch (e) {
        console.error('Error fetching invoices:', e);
      }
      setInvoices(invoicesData);

    } catch (error) {
      console.error('Error fetching user data:', error);
      toast.error('Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const exportChatTranscript = (chat: any) => {
    const transcript = chat.messages
      .map((msg: any) => `[${format(new Date(msg.sent_at), 'PPpp')}] ${msg.sender_id === userId ? 'User' : 'Other'}: ${msg.message_content}`)
      .join('\n');
    
    const blob = new Blob([transcript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-transcript-${chat.ticket_id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Transcript exported');
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {userType === 'vendor' ? 'Vendor' : 'Client'} Management
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="general">
              <User className="w-4 h-4 mr-2" />
              General
            </TabsTrigger>
            <TabsTrigger value="chats">
              <MessageSquare className="w-4 h-4 mr-2" />
              Chats ({chats.length})
            </TabsTrigger>
            <TabsTrigger value="quotes">
              <FileText className="w-4 h-4 mr-2" />
              Quotes ({quotes.length})
            </TabsTrigger>
            <TabsTrigger value="tickets">
              <Ticket className="w-4 h-4 mr-2" />
              Tickets ({tickets.length})
            </TabsTrigger>
            <TabsTrigger value="invoices">
              <FileCheck className="w-4 h-4 mr-2" />
              Invoices ({invoices.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Full Name</p>
                    <p className="font-medium">{profile?.full_name || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">User Type</p>
                    <Badge>{profile?.user_type}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email Verified</p>
                    <Badge variant={profile?.email_verified ? 'default' : 'secondary'}>
                      {profile?.email_verified ? 'Verified' : 'Unverified'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone Number</p>
                    <p className="font-medium">{profile?.phone_number || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Company</p>
                    <p className="font-medium">{profile?.company_name || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Address</p>
                    <p className="font-medium">{profile?.address || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Joined</p>
                    <p className="font-medium">{format(new Date(profile?.created_at), 'PPP')}</p>
                  </div>
                </div>

                {vendorProfile && (
                  <div className="mt-6 pt-6 border-t">
                    <h4 className="font-semibold mb-4">Vendor Details</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Business Name</p>
                        <p className="font-medium">{vendorProfile.business_name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Verification Status</p>
                        <Badge variant={
                          vendorProfile.verification_status === 'verified' ? 'default' :
                          vendorProfile.verification_status === 'pending' ? 'secondary' :
                          'destructive'
                        }>
                          {vendorProfile.verification_status}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Rating</p>
                        <p className="font-medium">{vendorProfile.rating?.toFixed(1)} ({vendorProfile.total_reviews} reviews)</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Response Time</p>
                        <p className="font-medium">{vendorProfile.response_time_hours}h</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="chats" className="space-y-4">
            {chats.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No chats found
              </div>
            ) : (
              <div className="space-y-3">
                {chats.map((chat) => (
                  <Card key={chat.ticket_id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Ticket ID: {chat.ticket_id}</p>
                          <p className="text-sm text-muted-foreground">
                            {chat.messages.length} messages • Last: {format(new Date(chat.lastMessage), 'PPp')}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => exportChatTranscript(chat)}>
                            <Download className="w-4 h-4 mr-2" />
                            Export
                          </Button>
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4 mr-2" />
                            View
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="quotes" className="space-y-4">
            {quotes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No quotes found
              </div>
            ) : (
              <div className="space-y-3">
                {quotes.map((quote) => (
                  <Card key={quote.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Quote #{quote.id.substring(0, 8)}</p>
                          <p className="text-sm text-muted-foreground">
                            Amount: €{quote.total_amount} • Status: {quote.status}
                          </p>
                        </div>
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="tickets" className="space-y-4">
            {tickets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No tickets found
              </div>
            ) : (
              <div className="space-y-3">
                {tickets.map((ticket) => (
                  <Card key={ticket.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Ticket #{ticket.id.substring(0, 8)}</p>
                          <p className="text-sm text-muted-foreground">
                            Status: <Badge variant="outline">{ticket.status}</Badge>
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Created: {format(new Date(ticket.created_at), 'PPp')}
                          </p>
                        </div>
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="invoices" className="space-y-4">
            {invoices.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No invoices found
              </div>
            ) : (
              <div className="space-y-3">
                {invoices.map((invoice) => (
                  <Card key={invoice.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Invoice #{invoice.invoice_number}</p>
                          <p className="text-sm text-muted-foreground">
                            Amount: €{invoice.total_amount} • Status: <Badge variant="outline">{invoice.status}</Badge>
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Issued: {format(new Date(invoice.issued_at), 'PPp')}
                          </p>
                        </div>
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-2" />
                          View Invoice
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};