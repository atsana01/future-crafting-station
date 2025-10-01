import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AdminPeriodProvider } from '@/contexts/AdminPeriodContext';
import { PeriodSelector } from './PeriodSelector';
import { 
  LayoutDashboard, 
  FileText, 
  Ticket, 
  MessageSquare, 
  Users, 
  Building2, 
  BarChart3, 
  FileBarChart,
  Settings,
  ScrollText,
  LogOut,
  Shield
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AdminLayoutProps {
  children: ReactNode;
}

const navItems = [
  { icon: LayoutDashboard, label: 'Overview', path: '/admin/overview' },
  { icon: FileText, label: 'Quotes', path: '/admin/quotes' },
  { icon: Ticket, label: 'Tickets', path: '/admin/tickets' },
  { icon: MessageSquare, label: 'Chats', path: '/admin/chats' },
  { icon: Users, label: 'Users', path: '/admin/users' },
  { icon: Building2, label: 'Vendors', path: '/admin/vendors' },
  { icon: BarChart3, label: 'Analytics', path: '/admin/analytics' },
  { icon: FileBarChart, label: 'Invoices', path: '/admin/invoices' },
  { icon: Settings, label: 'Settings', path: '/admin/settings' },
  { icon: ScrollText, label: 'Audit Log', path: '/admin/audit' },
];

export const AdminLayout = ({ children }: AdminLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast.success('Signed out successfully');
      navigate('/admin');
    } catch (error) {
      toast.error('Failed to sign out');
    }
  };

  return (
    <AdminPeriodProvider>
      <div className="flex h-screen bg-gradient-hero">
        {/* Sidebar */}
        <aside className="w-64 border-r border-border bg-background">
        <div className="flex h-16 items-center gap-3 border-b border-border px-6">
          <div className="p-2 bg-gradient-primary rounded-lg">
            <Shield className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold bg-gradient-primary bg-clip-text text-transparent">
              Admin Portal
            </h1>
            <p className="text-xs text-muted-foreground">BuildEasy</p>
          </div>
        </div>

        <ScrollArea className="h-[calc(100vh-8rem)]">
          <nav className="space-y-1 p-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </ScrollArea>

        <div className="border-t border-border p-4">
          <Button 
            variant="outline" 
            className="w-full justify-start gap-2"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="border-b border-border bg-background px-6 py-4">
            <PeriodSelector />
          </div>
          {children}
        </main>
      </div>
    </AdminPeriodProvider>
  );
};
