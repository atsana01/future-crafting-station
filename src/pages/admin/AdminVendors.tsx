import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { DataTable } from '@/components/admin/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Star, CheckCircle, XCircle, Clock } from 'lucide-react';

interface Vendor {
  id: string;
  user_id: string;
  business_name: string;
  specialty: string[];
  verification_status: 'pending' | 'verified' | 'rejected';
  rating: number;
  total_reviews: number;
  response_time_hours: number;
  location: string;
  years_experience: number;
}

const AdminVendors = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      const { data, error } = await supabase
        .from('vendor_profiles')
        .select('*')
        .order('created_at', { ascending: false});

      if (error) throw error;
      setVendors(data || []);
    } catch (error) {
      console.error('Error fetching vendors:', error);
      toast.error('Failed to load vendors');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (vendorId: string, status: 'verified' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('vendor_profiles')
        .update({ verification_status: status })
        .eq('id', vendorId);

      if (error) throw error;

      toast.success(`Vendor ${status} successfully`);
      fetchVendors();
      setSelectedVendor(null);
    } catch (error) {
      console.error('Error updating vendor status:', error);
      toast.error('Failed to update vendor status');
    }
  };

  const columns = [
    {
      key: 'business',
      header: 'Business',
      render: (vendor: Vendor) => (
        <div>
          <div className="font-medium">{vendor.business_name}</div>
          <div className="text-sm text-muted-foreground">{vendor.location}</div>
        </div>
      )
    },
    {
      key: 'specialty',
      header: 'Specialty',
      render: (vendor: Vendor) => (
        <div className="flex flex-wrap gap-1">
          {vendor.specialty?.slice(0, 2).map((spec, i) => (
            <Badge key={i} variant="outline" className="text-xs">
              {spec}
            </Badge>
          ))}
          {vendor.specialty?.length > 2 && (
            <Badge variant="outline" className="text-xs">
              +{vendor.specialty.length - 2}
            </Badge>
          )}
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (vendor: Vendor) => (
        <Badge
          variant={
            vendor.verification_status === 'verified'
              ? 'default'
              : vendor.verification_status === 'pending'
              ? 'secondary'
              : 'destructive'
          }
        >
          {vendor.verification_status}
        </Badge>
      )
    },
    {
      key: 'rating',
      header: 'Rating',
      render: (vendor: Vendor) => (
        <div className="flex items-center gap-1">
          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
          <span className="font-medium">{vendor.rating.toFixed(1)}</span>
          <span className="text-sm text-muted-foreground">({vendor.total_reviews})</span>
        </div>
      )
    },
    {
      key: 'response',
      header: 'Response Time',
      render: (vendor: Vendor) => (
        <div className="flex items-center gap-1">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span>{vendor.response_time_hours}h</span>
        </div>
      )
    }
  ];

  return (
    <>
      <div className="container max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Vendor Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage vendor profiles, verification, and performance
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{vendors.length}</div>
              <p className="text-sm text-muted-foreground">Total Vendors</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {vendors.filter((v) => v.verification_status === 'verified').length}
              </div>
              <p className="text-sm text-muted-foreground">Verified</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {vendors.filter((v) => v.verification_status === 'pending').length}
              </div>
              <p className="text-sm text-muted-foreground">Pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {(vendors.reduce((acc, v) => acc + v.rating, 0) / vendors.length || 0).toFixed(1)}
              </div>
              <p className="text-sm text-muted-foreground">Avg Rating</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Vendors</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading vendors...</div>
            ) : (
              <DataTable
                data={vendors}
                columns={columns}
                onRowClick={(vendor) => setSelectedVendor(vendor)}
                searchPlaceholder="Search vendors..."
                getItemId={(vendor) => vendor.id}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selectedVendor} onOpenChange={(open) => !open && setSelectedVendor(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Vendor Details</DialogTitle>
          </DialogHeader>
          {selectedVendor && (
            <div className="space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-2xl font-bold">{selectedVendor.business_name}</h3>
                  <p className="text-muted-foreground">{selectedVendor.location}</p>
                </div>
                <Badge
                  variant={
                    selectedVendor.verification_status === 'verified'
                      ? 'default'
                      : selectedVendor.verification_status === 'pending'
                      ? 'secondary'
                      : 'destructive'
                  }
                >
                  {selectedVendor.verification_status}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Rating</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">{selectedVendor.rating.toFixed(1)}</span>
                    <span className="text-sm text-muted-foreground">
                      ({selectedVendor.total_reviews} reviews)
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Response Time</p>
                  <p className="font-medium mt-1">{selectedVendor.response_time_hours} hours</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Experience</p>
                  <p className="font-medium mt-1">{selectedVendor.years_experience} years</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Specialties</p>
                <div className="flex flex-wrap gap-2">
                  {selectedVendor.specialty?.map((spec, i) => (
                    <Badge key={i} variant="outline">
                      {spec}
                    </Badge>
                  ))}
                </div>
              </div>

              {selectedVendor.verification_status === 'pending' && (
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const vendorId = selectedVendor.id;
                      handleStatusChange(vendorId, 'rejected');
                    }}
                    className="flex-1"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                  <Button
                    onClick={() => {
                      const vendorId = selectedVendor.id;
                      handleStatusChange(vendorId, 'verified');
                    }}
                    className="flex-1"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Verify
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminVendors;
