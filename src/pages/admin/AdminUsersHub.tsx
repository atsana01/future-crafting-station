import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, Building2, User } from 'lucide-react';

const AdminUsersHub = () => {
  const navigate = useNavigate();

  const userCategories = [
    {
      icon: Shield,
      title: 'Users (Admins)',
      description: 'Manage administrator accounts',
      path: '/admin/users/admins',
      gradient: 'from-red-500 to-orange-500'
    },
    {
      icon: Building2,
      title: 'Vendors',
      description: 'Manage vendor profiles and performance',
      path: '/admin/users/vendors',
      gradient: 'from-blue-500 to-cyan-500'
    },
    {
      icon: User,
      title: 'Clients',
      description: 'Manage client accounts and projects',
      path: '/admin/users/clients',
      gradient: 'from-green-500 to-emerald-500'
    }
  ];

  return (
    <div className="container max-w-7xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          User Management
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage all platform users, vendors, and clients
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {userCategories.map((category) => {
          const Icon = category.icon;
          return (
            <Card 
              key={category.path}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate(category.path)}
            >
              <CardContent className="pt-6 pb-8">
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${category.gradient} flex items-center justify-center mb-4`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{category.title}</h3>
                <p className="text-muted-foreground text-sm">{category.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default AdminUsersHub;
