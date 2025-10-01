import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Save, Upload } from 'lucide-react';
import { useState } from 'react';
import { logAdminAction } from '@/utils/auditLog';

const AdminSettings = () => {
  const [settings, setSettings] = useState({
    reviewLoopEnabled: true,
    rfiRequired: false,
    sessionTTL: '24',
    dataRetentionDays: '90',
    currency: 'EUR'
  });

  const handleSave = async () => {
    try {
      toast.success('Settings saved successfully');
      await logAdminAction('update_settings', 'platform_settings', undefined, undefined, settings);
    } catch (error) {
      toast.error('Failed to save settings');
    }
  };

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

      <Tabs defaultValue="features" className="space-y-6">
        <TabsList>
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
        </TabsList>

        <TabsContent value="features">
          <Card>
            <CardHeader>
              <CardTitle>Feature Flags</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Review Loop</Label>
                  <p className="text-sm text-muted-foreground">Allow clients to request quote revisions</p>
                </div>
                <Switch
                  checked={settings.reviewLoopEnabled}
                  onCheckedChange={(checked) => setSettings({ ...settings, reviewLoopEnabled: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>RFI Required Before Accept</Label>
                  <p className="text-sm text-muted-foreground">Require clients to submit RFI before accepting quotes</p>
                </div>
                <Switch
                  checked={settings.rfiRequired}
                  onCheckedChange={(checked) => setSettings({ ...settings, rfiRequired: checked })}
                />
              </div>
              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security & Retention</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>Session TTL (hours)</Label>
                <Input
                  type="number"
                  value={settings.sessionTTL}
                  onChange={(e) => setSettings({ ...settings, sessionTTL: e.target.value })}
                  className="max-w-xs mt-2"
                />
              </div>
              <div>
                <Label>Data Retention (days)</Label>
                <Input
                  type="number"
                  value={settings.dataRetentionDays}
                  onChange={(e) => setSettings({ ...settings, dataRetentionDays: e.target.value })}
                  className="max-w-xs mt-2"
                />
                <p className="text-sm text-muted-foreground mt-2">
                  Deleted data will be permanently removed after this period
                </p>
              </div>
              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Email Templates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>Quote Submitted Template</Label>
                <p className="text-sm text-muted-foreground mt-2">
                  Customize email sent when vendor submits a quote
                </p>
              </div>
              <div>
                <Label>Invoice Issued Template</Label>
                <p className="text-sm text-muted-foreground mt-2">
                  Customize email sent when invoice is generated
                </p>
              </div>
              <Button>
                <Upload className="h-4 w-4 mr-2" />
                Manage Templates
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branding">
          <Card>
            <CardHeader>
              <CardTitle>Brand Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>Currency</Label>
                <Select value={settings.currency} onValueChange={(val) => setSettings({ ...settings, currency: val })}>
                  <SelectTrigger className="max-w-xs mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Platform Logo</Label>
                <Button variant="outline" className="mt-2">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Logo
                </Button>
              </div>
              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminSettings;
