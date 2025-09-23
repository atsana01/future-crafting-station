import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  Search, 
  Filter, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Star,
  MapPin,
  DollarSign,
  Calendar,
  History
} from 'lucide-react';

interface QuoteHistoryItem {
  id: string;
  groupName: string;
  vendor: {
    id: string;
    name: string;
    rating: number;
    reviews: number;
    location: string;
    specialty: string;
    avgPrice: string;
    deliveryTime: string;
    verified: boolean;
  };
  projectDescription: string;
  status: 'pending' | 'quoted' | 'accepted' | 'declined' | 'completed';
  createdAt: Date;
  quotedAmount?: string;
  notes?: string;
}

const QuotesHistory = () => {
  const { user } = useAuth();
  const [quotes, setQuotes] = useState<QuoteHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchQuotesHistory();
    }
  }, [user]);

  const fetchQuotesHistory = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch all quote requests (including deleted ones if they exist)
      const { data: quoteRequests, error } = await supabase
        .from('quote_requests')
        .select('*')
        .eq('client_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Batch fetch project and vendor data
      const projectIds = [...new Set(quoteRequests?.map(qr => qr.project_id) || [])];
      const vendorIds = [...new Set(quoteRequests?.map(qr => qr.vendor_id) || [])];

      const [projectsResult, vendorProfilesResult] = await Promise.all([
        supabase.from('projects').select('id, title, description, service_groups').in('id', projectIds),
        supabase.rpc('get_public_vendor_directory').then(result => ({
          data: result.data?.filter(v => vendorIds.includes(v.user_id)) || [],
          error: result.error
        }))
      ]);

      // Create lookup maps
      const projectsMap = new Map(projectsResult.data?.map(p => [p.id, p]) || []);
      const vendorsMap = new Map(vendorProfilesResult.data?.map(v => [v.user_id, v]) || []);

      // Transform the data
      const transformedQuotes: QuoteHistoryItem[] = (quoteRequests || []).map(qr => {
        const project = projectsMap.get(qr.project_id);
        const vendorProfile = vendorsMap.get(qr.vendor_id);
        
        return {
          id: qr.id,
          groupName: project?.service_groups?.[0] || 'General',
          vendor: {
            id: qr.vendor_id,
            name: vendorProfile?.business_name || 'Unknown Vendor',
            rating: vendorProfile?.rating || 0,
            reviews: vendorProfile?.total_reviews || 0,
            location: vendorProfile?.location || 'Unknown',
            specialty: vendorProfile?.specialty?.[0] || 'General',
            avgPrice: qr.quoted_amount ? `$${qr.quoted_amount}` : 'Quote Pending',
            deliveryTime: qr.estimated_timeline || 'TBD',
            verified: vendorProfile?.verification_status === 'verified'
          },
          projectDescription: project?.description || project?.title || 'No description',
          status: qr.status as 'pending' | 'quoted' | 'accepted' | 'declined' | 'completed',
          createdAt: new Date(qr.created_at),
          quotedAmount: qr.quoted_amount ? `$${qr.quoted_amount}` : undefined,
          notes: qr.vendor_notes || undefined
        };
      });

      setQuotes(transformedQuotes);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load quotes history',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredQuotes = quotes.filter(quote => {
    const matchesSearch = quote.vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quote.groupName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || quote.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: 'secondary' as const, text: 'Pending Quote', icon: Clock },
      quoted: { variant: 'default' as const, text: 'Quote Received', icon: CheckCircle2 },
      accepted: { variant: 'default' as const, text: 'Accepted', icon: CheckCircle2 },
      declined: { variant: 'destructive' as const, text: 'Declined', icon: AlertCircle },
      completed: { variant: 'default' as const, text: 'Completed', icon: CheckCircle2 }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.text}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="container max-w-7xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <History className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Quotes History
              </h1>
              <p className="text-muted-foreground mt-1">
                View all your past and current quote requests
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search by vendor or service type..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="quoted">Quoted</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="declined">Declined</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-2xl font-bold text-primary">{quotes.length}</div>
              <p className="text-sm text-muted-foreground">Total Quotes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-2xl font-bold text-blue-500">
                {quotes.filter(q => q.status === 'pending').length}
              </div>
              <p className="text-sm text-muted-foreground">Pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-2xl font-bold text-accent">
                {quotes.filter(q => q.status === 'accepted').length}
              </div>
              <p className="text-sm text-muted-foreground">Accepted</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-2xl font-bold text-accent">
                {quotes.filter(q => q.status === 'completed').length}
              </div>
              <p className="text-sm text-muted-foreground">Completed</p>
            </CardContent>
          </Card>
        </div>

        {/* Quotes List */}
        {loading ? (
          <Card>
            <CardContent className="pt-12 pb-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Loading your quotes history...</p>
            </CardContent>
          </Card>
        ) : filteredQuotes.length === 0 ? (
          <Card>
            <CardContent className="pt-12 pb-12 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <History className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No quotes found</h3>
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filter criteria'
                  : 'You haven\'t requested any quotes yet'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredQuotes.map((quote) => (
              <Card key={quote.id} className="shadow-card">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
                        {quote.vendor.name.charAt(0)}
                      </div>
                      
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <CardTitle className="text-lg truncate">{quote.vendor.name}</CardTitle>
                          {quote.vendor.verified && (
                            <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
                          )}
                          {getStatusBadge(quote.status)}
                        </div>
                        <Badge variant="outline" className="w-fit">
                          {quote.groupName}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="text-right text-sm text-muted-foreground space-y-2 shrink-0 ml-2">
                      <div className="flex items-center gap-1 justify-end">
                        <Calendar className="w-3 h-3" />
                        <span className="whitespace-nowrap">{quote.createdAt.toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-4">
                    {/* Vendor Details */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                        <div className="flex items-center space-x-1">
                          <Star className="w-4 h-4 fill-primary text-primary" />
                          <span className="font-medium">{quote.vendor.rating.toFixed(1)}</span>
                          <span className="text-muted-foreground">({quote.vendor.reviews})</span>
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          <span className="truncate max-w-[120px]">{quote.vendor.location}</span>
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          <DollarSign className="w-4 h-4 text-accent" />
                          <span>{quote.vendor.avgPrice}</span>
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4 text-primary" />
                          <span>{quote.vendor.deliveryTime}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Project Description */}
                    <div>
                      <h4 className="font-medium mb-2">Project Description</h4>
                      <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded line-clamp-3 leading-relaxed">
                        {quote.projectDescription}
                      </p>
                    </div>
                    
                    {/* Quote Information */}
                    {quote.status === 'quoted' && quote.quotedAmount && (
                      <div className="bg-accent/10 p-4 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-accent">Quote Received</h4>
                            <p className="text-2xl font-bold text-accent">{quote.quotedAmount}</p>
                          </div>
                        </div>
                        {quote.notes && (
                          <div className="mt-3 pt-3 border-t border-accent/20">
                            <p className="text-sm text-muted-foreground">
                              <strong>Vendor Notes:</strong> {quote.notes}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuotesHistory;