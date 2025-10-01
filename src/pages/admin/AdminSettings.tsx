import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const AdminSettings = () => {
  return (
    <div className="container max-w-7xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Platform Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Configure platform-wide settings and preferences
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Settings interface coming soon</CardTitle>
        </CardHeader>
        <CardContent />
      </Card>
    </div>
  );
};

export default AdminSettings;
