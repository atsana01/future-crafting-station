import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { DataTable } from '@/components/admin/DataTable';
import { toast } from 'sonner';
import { ArrowLeft, User, MessageSquare, FileText, Ticket as TicketIcon, FileBarChart } from 'lucide-react';
import { format } from 'date-fns';

interface ClientProfile {
  id: string;
  user_id: string;
  full_name: string;
  email_verified: boolean;
  phone_number?: string;
  address?: string;
  company_name?: string;
  created_at: string;
}

const AdminClientDetail = () => {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'info';
  
  const [client, setClient] = useState<ClientProfile | null>(null);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [chats, setChats] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (clientId) {
      fetchClientData();
    }
  }, [clientId]);

  const fetchClientData = async () => {
    try {
      // Fetch client profile
      const { data: clientData, error: clientError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', clientId)
        .single();

      if (clientError) throw clientError;
      setClient(clientData);

      // Fetch quotes
      const { data: quotesData } = await supabase
        .from('quotes')
        .select(`
          *,
          quote_requests!inner(
            client_id,
            status
          )
        `)
        .eq('quote_requests.client_id', clientId);
      setQuotes(quotesData || []);

      // Fetch tickets
      const { data: ticketsData } = await supabase
        .from('quote_requests')
        .select('*')
        .eq('client_id', clientId);
      setTickets(ticketsData || []);

      // Fetch chats
      const { data: chatsData } = await supabase
        .from('messages')
        .select(`
          *,
          quote_requests!inner(client_id)
        `)
        .eq('quote_requests.client_id', clientId);
      setChats(chatsData || []);

      // Fetch invoices
      const { data: invoicesData } = await supabase
        .from('invoices')
        .select('*')
        .eq('client_id', clientId);
      setInvoices(invoicesData || []);

    } catch (error) {
      console.error('Error fetching client data:', error);
      toast.error('Failed to load client data');
    } finally {
      setLoading(false);
    }
  };

  const setTab = (tab: string) => {
    setSearchParams({ tab });
  };

  if (loading) {
    return (
      <div className="container max-w-7xl mx-auto px-6 py-8">
        <div className="text-center py-12">Loading client details...</div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="container max-w-7xl mx-auto px-6 py-8">
        <div className="text-center py-12">Client not found</div>
      </div>
    );
  }

  const quoteColumns = [
    {
      key: 'amount',
      header: 'Amount',
      render: (quote: any) => `€${quote.total_amount?.toLocaleString() || 0}`
    },
    {
      key: 'status',
      header: 'Status',
      render: (quote: any) => (
        <Badge>{quote.quote_requests?.status || 'unknown'}</Badge>
      )
    },
    {
      key: 'version',
      header: 'Version',
      render: (quote: any) => `v${quote.version}`
    },
    {
      key: 'date',
      header: 'Date',
      render: (quote: any) => format(new Date(quote.created_at), 'MMM dd, yyyy')
    }
  ];

  const ticketColumns = [
    {
      key: 'id',
      header: 'Ticket ID',
      render: (ticket: any) => ticket.id.slice(0, 8)
    },
    {
      key: 'status',
      header: 'Status',
      render: (ticket: any) => <Badge>{ticket.status}</Badge>
    },
    {
      key: 'created',
      header: 'Created',
      render: (ticket: any) => format(new Date(ticket.created_at), 'MMM dd, yyyy')
    }
  ];

  const chatColumns = [
    {
      key: 'content',
      header: 'Message',
      render: (chat: any) => chat.message_content?.substring(0, 50) + '...'
    },
    {
      key: 'date',
      header: 'Date',
      render: (chat: any) => format(new Date(chat.sent_at), 'MMM dd, yyyy HH:mm')
    }
  ];

  const invoiceColumns = [
    {
      key: 'number',
      header: 'Invoice #',
      render: (invoice: any) => invoice.invoice_number
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (invoice: any) => `€${invoice.total_amount?.toLocaleString() || 0}`
    },
    {
      key: 'status',
      header: 'Status',
      render: (invoice: any) => <Badge>{invoice.status}</Badge>
    },
    {
      key: 'date',
      header: 'Date',
      render: (invoice: any) => format(new Date(invoice.created_at), 'MMM dd, yyyy')
    }
  ];

  return (
    <div className="container max-w-7xl mx-auto px-6 py-8">
      <Button 
        variant="ghost" 
        onClick={() => navigate('/admin/users/clients')}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Clients
      </Button>

      {/* Client Header */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{client.full_name || 'Name not set'}</h1>
                <p className="text-muted-foreground">{client.company_name || client.address}</p>
              </div>
            </div>
            <Badge variant={client.email_verified ? 'default' : 'secondary'}>
              {client.email_verified ? 'Verified' : 'Unverified'}
            </Badge>
          </div>

          {/* KPI Summary */}
          <div className="grid grid-cols-4 gap-4 pt-4 border-t">
            <div>
              <p className="text-sm text-muted-foreground">Total Quotes</p>
              <p className="font-bold text-lg">{quotes.length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Open Tickets</p>
              <p className="font-bold text-lg">
                {tickets.filter(t => t.status === 'pending').length}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Invoices</p>
              <p className="font-bold text-lg">{invoices.length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Member Since</p>
              <p className="font-bold text-lg">
                {format(new Date(client.created_at), 'MMM yyyy')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="info">
            <User className="h-4 w-4 mr-2" />
            General Info
          </TabsTrigger>
          <TabsTrigger value="chats">
            <MessageSquare className="h-4 w-4 mr-2" />
            Chats
          </TabsTrigger>
          <TabsTrigger value="quotes">
            <FileText className="h-4 w-4 mr-2" />
            Quotes
          </TabsTrigger>
          <TabsTrigger value="tickets">
            <TicketIcon className="h-4 w-4 mr-2" />
            Tickets
          </TabsTrigger>
          <TabsTrigger value="invoices">
            <FileBarChart className="h-4 w-4 mr-2" />
            Invoices
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <Card>
            <CardHeader>
              <CardTitle>Client Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Full Name</p>
                  <p>{client.full_name || '—'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Phone</p>
                  <p>{client.phone_number || '—'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Company</p>
                  <p>{client.company_name || '—'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email Verified</p>
                  <p>{client.email_verified ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Joined</p>
                  <p>{format(new Date(client.created_at), 'MMM dd, yyyy')}</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Address</p>
                <p>{client.address || '—'}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chats">
          <Card>
            <CardHeader>
              <CardTitle>Chat History ({chats.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {chats.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No chats yet</p>
              ) : (
                <DataTable
                  data={chats}
                  columns={chatColumns}
                  onRowClick={() => {}}
                  searchPlaceholder="Search chats..."
                  getItemId={(chat) => chat.id}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quotes">
          <Card>
            <CardHeader>
              <CardTitle>Quotes ({quotes.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {quotes.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No quotes yet</p>
              ) : (
                <DataTable
                  data={quotes}
                  columns={quoteColumns}
                  onRowClick={() => {}}
                  searchPlaceholder="Search quotes..."
                  getItemId={(quote) => quote.id}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tickets">
          <Card>
            <CardHeader>
              <CardTitle>Tickets ({tickets.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {tickets.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No tickets yet</p>
              ) : (
                <DataTable
                  data={tickets}
                  columns={ticketColumns}
                  onRowClick={() => {}}
                  searchPlaceholder="Search tickets..."
                  getItemId={(ticket) => ticket.id}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle>Invoices ({invoices.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No invoices yet</p>
              ) : (
                <DataTable
                  data={invoices}
                  columns={invoiceColumns}
                  onRowClick={() => {}}
                  searchPlaceholder="Search invoices..."
                  getItemId={(invoice) => invoice.id}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminClientDetail;
