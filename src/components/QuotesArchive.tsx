import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Archive, 
  Euro, 
  Clock, 
  Calendar,
  FileX,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface ArchivedQuote {
  id: string;
  total_amount: number;
  vendor_business_name: string;
  project_title: string;
  created_at: string;
  archived_at: string;
  archive_reason: string;
  status: 'declined' | 'rejected';
}

interface QuotesArchiveProps {
  isOpen: boolean;
  onClose: () => void;
}

const QuotesArchive: React.FC<QuotesArchiveProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [archivedQuotes, setArchivedQuotes] = useState<ArchivedQuote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && user) {
      fetchArchivedQuotes();
    }
  }, [isOpen, user]);

  const fetchArchivedQuotes = async () => {
    try {
      setLoading(true);
      
      // Fetch archived quotes based on user role
      const { data, error } = await supabase
        .from('quote_requests')
        .select(`
          id,
          status,
          created_at,
          deletion_reason,
          deleted_at,
          quotes!inner (
            total_amount,
            created_at
          ),
          projects!inner (
            title
          ),
          vendor_profiles!inner (
            business_name
          )
        `)
        .in('status', ['declined'])
        .or(`client_id.eq.${user?.id},vendor_id.eq.${user?.id}`)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const formatted = data?.map((item: any) => ({
        id: item.id,
        total_amount: item.quotes[0]?.total_amount || 0,
        vendor_business_name: item.vendor_profiles?.business_name || 'Unknown Vendor',
        project_title: item.projects?.title || 'Untitled Project',
        created_at: item.created_at,
        archived_at: item.deleted_at || item.updated_at,
        archive_reason: item.deletion_reason || `Quote ${item.status}`,
        status: item.status
      })) || [];

      setArchivedQuotes(formatted);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load archived quotes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'declined':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'cancelled':
        return <FileX className="w-4 h-4 text-orange-500" />;
      case 'rejected':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default:
        return <Archive className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'declined':
        return 'destructive';
      case 'cancelled':
        return 'secondary';
      case 'rejected':
        return 'outline';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Archive className="w-5 h-5 text-primary" />
            Quotes Archive
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          {archivedQuotes.length === 0 ? (
            <div className="text-center py-8">
              <Archive className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No archived quotes found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {archivedQuotes.map((quote) => (
                <Card key={quote.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {getStatusIcon(quote.status)}
                          <h3 className="font-semibold">{quote.project_title}</h3>
                          <Badge variant={getStatusColor(quote.status) as any}>
                            {quote.status}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground mb-2">
                          {quote.vendor_business_name}
                        </p>
                        <p className="text-sm text-muted-foreground mb-3">
                          {quote.archive_reason}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Euro className="w-4 h-4" />
                            €{quote.total_amount.toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            Created: {new Date(quote.created_at).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Archive className="w-4 h-4" />
                            Archived: {new Date(quote.archived_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuotesArchive;