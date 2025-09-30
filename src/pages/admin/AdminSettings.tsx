import { Card, CardContent, CardHeader } from '@/components/ui/card';

const AdminSettings = () => {
  return (
    <div className="container max-w-7xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Platform Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Configure platform settings and preferences
        </p>
      </div>

      <Card>
        <CardHeader>
          <p className="text-muted-foreground">Settings interface coming soon</p>
        </CardHeader>
        <CardContent />
      </Card>
    </div>
  );
};

export default AdminSettings;
