import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface QuoteStatusChartProps {
  data: Record<string, number>;
}

const COLORS = {
  pending: 'hsl(var(--chart-1))',
  quoted: 'hsl(var(--chart-2))',
  accepted: 'hsl(var(--chart-3))',
  declined: 'hsl(var(--chart-4))',
  completed: 'hsl(var(--chart-5))'
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  quoted: 'Quoted',
  accepted: 'Accepted',
  declined: 'Declined',
  completed: 'Completed'
};

export const QuoteStatusChart = ({ data }: QuoteStatusChartProps) => {
  const chartData = Object.entries(data).map(([status, count]) => ({
    name: STATUS_LABELS[status] || status,
    value: count,
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
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
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
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
