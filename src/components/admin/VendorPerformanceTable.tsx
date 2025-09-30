import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Star } from 'lucide-react';

interface VendorPerformance {
  vendor_id: string;
  business_name: string;
  rating: number;
  total_reviews: number;
  response_time_hours: number;
  total_quotes: number;
  accepted_quotes: number;
  acceptance_rate: number;
}

interface VendorPerformanceTableProps {
  data: VendorPerformance[];
}

export const VendorPerformanceTable = ({ data }: VendorPerformanceTableProps) => {
  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'text-green-600';
    if (rating >= 4.0) return 'text-blue-600';
    if (rating >= 3.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getAcceptanceRateColor = (rate: number) => {
    if (rate >= 70) return 'default';
    if (rate >= 50) return 'secondary';
    return 'destructive';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Vendor Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendor</TableHead>
                <TableHead className="text-center">Rating</TableHead>
                <TableHead className="text-center">Reviews</TableHead>
                <TableHead className="text-center">Response Time</TableHead>
                <TableHead className="text-center">Total Quotes</TableHead>
                <TableHead className="text-center">Acceptance Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.slice(0, 10).map((vendor) => (
                <TableRow key={vendor.vendor_id}>
                  <TableCell className="font-medium">
                    {vendor.business_name}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Star className={`w-4 h-4 ${getRatingColor(vendor.rating)} fill-current`} />
                      <span className={getRatingColor(vendor.rating)}>
                        {vendor.rating.toFixed(1)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {vendor.total_reviews}
                  </TableCell>
                  <TableCell className="text-center">
                    {vendor.response_time_hours}h
                  </TableCell>
                  <TableCell className="text-center">
                    {vendor.total_quotes}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={getAcceptanceRateColor(vendor.acceptance_rate)}>
                      {vendor.acceptance_rate.toFixed(1)}%
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
