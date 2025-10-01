import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { DataTable } from '@/components/admin/DataTable';
import { toast } from 'sonner';
import { ArrowLeft, Star, Building2, MessageSquare, FileText, Ticket as TicketIcon, FileBarChart } from 'lucide-react';
import { format } from 'date-fns';

interface VendorProfile {
  id: string;
  user_id: string;
  business_name: string;
  email: string;
  phone: string;
  website?: string;
  business_address?: string;
  vendor_category?: string;
  specialty: string[];
  location: string;
  rating: number;
  total_reviews: number;
  response_time_hours: number;
  years_experience: number;
  verification_status: string;
  vat_id?: string;
  year_established?: number;
  insurance_coverage: boolean;
  team_size?: number;
  service_radius?: string;
  about_business?: string;
}

const AdminVendorDetail = () => {
  const { vendorId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'info';
  
  const [vendor, setVendor] = useState<VendorProfile | null>(null);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [chats, setChats] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (vendorId) {
      fetchVendorData();
    }
  }, [vendorId]);

  const fetchVendorData = async () => {
    try {
      // Fetch vendor profile
      const { data: vendorData, error: vendorError } = await supabase
        .from('vendor_profiles')
        .select('*')
        .eq('user_id', vendorId)
        .single();

      if (vendorError) throw vendorError;
      setVendor(vendorData);

      // Fetch quotes
      const { data: quotesData } = await supabase
        .from('quotes')
        .select(`
          *,
          quote_requests!inner(
            vendor_id,
            client_id,
            status
          )
        `)
        .eq('quote_requests.vendor_id', vendorId);
      setQuotes(quotesData || []);

      // Fetch tickets
      const { data: ticketsData } = await supabase
        .from('quote_requests')
        .select('*')
        .eq('vendor_id', vendorId);
      setTickets(ticketsData || []);

      // Fetch chats
      const { data: chatsData } = await supabase
        .from('messages')
        .select(`
          *,
          quote_requests!inner(vendor_id)
        `)
        .eq('quote_requests.vendor_id', vendorId);
      setChats(chatsData || []);

      // Fetch invoices
      const { data: invoicesData } = await supabase
        .from('invoices')
        .select('*')
        .eq('vendor_id', vendorId);
      setInvoices(invoicesData || []);

    } catch (error) {
      console.error('Error fetching vendor data:', error);
      toast.error('Failed to load vendor data');
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
        <div className="text-center py-12">Loading vendor details...</div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="container max-w-7xl mx-auto px-6 py-8">
        <div className="text-center py-12">Vendor not found</div>
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
        onClick={() => navigate('/admin/users/vendors')}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Vendors
      </Button>

      {/* Vendor Header */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{vendor.business_name}</h1>
                <p className="text-muted-foreground">{vendor.location}</p>
              </div>
            </div>
            <Badge variant={vendor.verification_status === 'verified' ? 'default' : 'secondary'}>
              {vendor.verification_status}
            </Badge>
          </div>

          {/* KPI Summary */}
          <div className="grid grid-cols-4 gap-4 pt-4 border-t">
            <div>
              <p className="text-sm text-muted-foreground">Rating</p>
              <div className="flex items-center gap-1 mt-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="font-bold">{vendor.rating.toFixed(1)}</span>
                <span className="text-sm text-muted-foreground">({vendor.total_reviews})</span>
              </div>
            </div>
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
              <p className="text-sm text-muted-foreground">Response Time</p>
              <p className="font-bold text-lg">{vendor.response_time_hours}h</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="info">
            <Building2 className="h-4 w-4 mr-2" />
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
              <CardTitle>Business Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p>{vendor.email || '—'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Phone</p>
                  <p>{vendor.phone || '—'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Website</p>
                  <p>{vendor.website || '—'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">VAT ID</p>
                  <p>{vendor.vat_id || '—'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Category</p>
                  <p>{vendor.vendor_category || '—'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Year Established</p>
                  <p>{vendor.year_established || '—'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Team Size</p>
                  <p>{vendor.team_size || '—'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Service Radius</p>
                  <p>{vendor.service_radius || '—'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Insurance</p>
                  <p>{vendor.insurance_coverage ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Experience</p>
                  <p>{vendor.years_experience} years</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Business Address</p>
                <p>{vendor.business_address || '—'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">About</p>
                <p>{vendor.about_business || '—'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Specialties</p>
                <div className="flex flex-wrap gap-2">
                  {vendor.specialty?.map((spec, i) => (
                    <Badge key={i} variant="outline">{spec}</Badge>
                  ))}
                </div>
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

export default AdminVendorDetail;
