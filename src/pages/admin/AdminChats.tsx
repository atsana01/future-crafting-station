import { Card, CardContent, CardHeader } from '@/components/ui/card';

const AdminChats = () => {
  return (
    <div className="container max-w-7xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Chat Moderation
        </h1>
        <p className="text-muted-foreground mt-1">
          Monitor and moderate platform conversations
        </p>
      </div>

      <Card>
        <CardHeader>
          <p className="text-muted-foreground">Chat moderation interface coming soon</p>
        </CardHeader>
        <CardContent />
      </Card>
    </div>
  );
};

export default AdminChats;
