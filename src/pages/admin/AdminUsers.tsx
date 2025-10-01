import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { DataTable } from '@/components/admin/DataTable';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface User {
  id: string;
  user_id: string;
  full_name: string;
  user_type: 'client' | 'vendor' | 'admin';
  email_verified: boolean;
  created_at: string;
  phone_number?: string;
  address?: string;
  company_name?: string;
}

const AdminUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: selectedUser.full_name,
          phone_number: selectedUser.phone_number,
          address: selectedUser.address,
          company_name: selectedUser.company_name,
          user_type: selectedUser.user_type
        })
        .eq('id', selectedUser.id);

      if (error) throw error;

      toast.success('User updated successfully');
      setEditMode(false);
      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user');
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (user: User) => (
        <div>
          <div className="font-medium">{user.full_name || 'Not set'}</div>
          <div className="text-sm text-muted-foreground">{user.company_name}</div>
        </div>
      )
    },
    {
      key: 'type',
      header: 'Type',
      render: (user: User) => (
        <Badge variant={user.user_type === 'admin' ? 'destructive' : 'default'}>
          {user.user_type}
        </Badge>
      )
    },
    {
      key: 'verified',
      header: 'Verified',
      render: (user: User) => (
        <Badge variant={user.email_verified ? 'default' : 'secondary'}>
          {user.email_verified ? 'Verified' : 'Unverified'}
        </Badge>
      )
    },
    {
      key: 'joined',
      header: 'Joined',
      render: (user: User) => format(new Date(user.created_at), 'MMM dd, yyyy')
    }
  ];

  return (
    <>
      <div className="container max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            User Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage all platform users and their profiles
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Users ({users.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading users...</div>
            ) : (
              <DataTable
                data={users}
                columns={columns}
                onRowClick={(user) => {
                  setSelectedUser(user);
                  setEditMode(false);
                }}
                searchPlaceholder="Search users..."
                showDateFilter
                getItemId={(user) => user.id}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editMode ? 'Edit User' : 'User Details'}</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-6">
              {!editMode ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge variant={selectedUser.user_type === 'admin' ? 'destructive' : 'default'}>
                      {selectedUser.user_type}
                    </Badge>
                    <Badge variant={selectedUser.email_verified ? 'default' : 'secondary'}>
                      {selectedUser.email_verified ? 'Verified' : 'Unverified'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{selectedUser.full_name || 'Name not set'}</p>
                    {selectedUser.company_name && (
                      <p className="text-muted-foreground mt-1">{selectedUser.company_name}</p>
                    )}
                  </div>
                  {selectedUser.phone_number && (
                    <p className="text-muted-foreground">{selectedUser.phone_number}</p>
                  )}
                  {selectedUser.address && (
                    <p className="text-muted-foreground">{selectedUser.address}</p>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">Joined</p>
                    <p>{format(new Date(selectedUser.created_at), 'PPpp')}</p>
                  </div>
                  <Button onClick={() => setEditMode(true)} className="w-full">
                    Edit User
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label>Full Name</Label>
                    <Input
                      value={selectedUser.full_name || ''}
                      onChange={(e) => setSelectedUser({ ...selectedUser, full_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>User Type</Label>
                    <Select
                      value={selectedUser.user_type}
                      onValueChange={(value: any) => setSelectedUser({ ...selectedUser, user_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="client">Client</SelectItem>
                        <SelectItem value="vendor">Vendor</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Phone Number</Label>
                    <Input
                      value={selectedUser.phone_number || ''}
                      onChange={(e) => setSelectedUser({ ...selectedUser, phone_number: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Company Name</Label>
                    <Input
                      value={selectedUser.company_name || ''}
                      onChange={(e) => setSelectedUser({ ...selectedUser, company_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Address</Label>
                    <Input
                      value={selectedUser.address || ''}
                      onChange={(e) => setSelectedUser({ ...selectedUser, address: e.target.value })}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setEditMode(false)} className="flex-1">
                      Cancel
                    </Button>
                    <Button onClick={handleUpdateUser} className="flex-1">
                      Save Changes
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminUsers;
