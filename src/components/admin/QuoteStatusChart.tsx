import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface QuoteStatusChartProps {
  data: Record<string, number>;
}

const COLORS = {
  pending: 'hsl(45, 93%, 58%)',     // Warning yellow
  quoted: 'hsl(217, 91%, 60%)',     // Primary blue
  accepted: 'hsl(142, 71%, 45%)',   // Success green
  declined: 'hsl(0, 84%, 60%)',     // Destructive red
  completed: 'hsl(262, 83%, 58%)'   // Purple accent
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  quoted: 'Quoted',
  accepted: 'Accepted',
  declined: 'Declined',
  completed: 'Completed'
};

export const QuoteStatusChart = ({ data }: QuoteStatusChartProps) => {
  const totalCount = Object.values(data).reduce((sum, count) => sum + count, 0);
  
  const chartData = Object.entries(data).map(([status, count]) => ({
    name: STATUS_LABELS[status] || status,
    value: count,
    percentage: totalCount > 0 ? ((count / totalCount) * 100).toFixed(1) : '0',
    color: COLORS[status as keyof typeof COLORS] || 'hsl(var(--muted))'
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quote Status Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
              formatter={(value: number, name: string, props: any) => [
                `${value} (${props.payload.percentage}%)`,
                name
              ]}
            />
            <Legend 
              formatter={(value: string, entry: any) => {
                const item = chartData.find(d => d.name === value);
                return `${value}: ${item?.value || 0} (${item?.percentage || 0}%)`;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
