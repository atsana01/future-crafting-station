import { Card, CardContent, CardHeader } from '@/components/ui/card';

const AdminAudit = () => {
  return (
    <div className="container max-w-7xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Audit Log
        </h1>
        <p className="text-muted-foreground mt-1">
          View all system audit events
        </p>
      </div>

      <Card>
        <CardHeader>
          <p className="text-muted-foreground">Audit log interface coming soon</p>
        </CardHeader>
        <CardContent />
      </Card>
    </div>
  );
};

export default AdminAudit;
