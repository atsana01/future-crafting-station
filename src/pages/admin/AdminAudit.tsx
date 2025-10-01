import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { DataTable } from '@/components/admin/DataTable';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Shield, Activity, Database, User } from 'lucide-react';

interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  table_name: string;
  record_id: string;
  old_values: any;
  new_values: any;
  timestamp: string;
}

const AdminAudit = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    if (action.includes('delete')) return <Shield className="h-4 w-4 text-destructive" />;
    if (action.includes('update')) return <Activity className="h-4 w-4 text-warning" />;
    if (action.includes('insert') || action.includes('create')) return <Database className="h-4 w-4 text-success" />;
    return <User className="h-4 w-4" />;
  };

  const columns = [
    {
      key: 'action',
      header: 'Action',
      render: (log: AuditLog) => (
        <div className="flex items-center gap-2">
          {getActionIcon(log.action)}
          <span className="font-medium">{log.action}</span>
        </div>
      )
    },
    {
      key: 'table',
      header: 'Table',
      render: (log: AuditLog) => (
        <Badge variant="outline">{log.table_name}</Badge>
      )
    },
    {
      key: 'user',
      header: 'User ID',
      render: (log: AuditLog) => (
        <span className="font-mono text-xs">{log.user_id?.slice(0, 8)}...</span>
      )
    },
    {
      key: 'timestamp',
      header: 'Timestamp',
      render: (log: AuditLog) => format(new Date(log.timestamp), 'MMM dd, yyyy HH:mm:ss')
    }
  ];

  return (
    <div className="container max-w-7xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Audit Log
        </h1>
        <p className="text-muted-foreground mt-1">
          Comprehensive system activity and security audit trail
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Activity className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{logs.length}</div>
                <p className="text-sm text-muted-foreground">Total Events</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-success/10 rounded-lg">
                <Database className="h-6 w-6 text-success" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {logs.filter(l => l.action.includes('insert') || l.action.includes('create')).length}
                </div>
                <p className="text-sm text-muted-foreground">Creates</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-destructive/10 rounded-lg">
                <Shield className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {logs.filter(l => l.action.includes('delete')).length}
                </div>
                <p className="text-sm text-muted-foreground">Deletions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading audit logs...</div>
          ) : (
            <DataTable
              data={logs}
              columns={columns}
              searchPlaceholder="Search audit logs..."
              showDateFilter
              getItemId={(log) => log.id}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAudit;
