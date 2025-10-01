import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { QuoteFormProvider } from "@/contexts/QuoteFormContext";
import { EmailConfirmationHandler } from "@/components/EmailConfirmationHandler";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import ErrorBoundary from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import BusinessInformation from "./pages/BusinessInformation";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import Tickets from "./pages/Tickets";
import FAQ from "./pages/FAQ";
import Contact from "./pages/Contact";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Cookies from "./pages/Cookies";
import AcceptableUse from "./pages/AcceptableUse";
import ResetPassword from "./pages/ResetPassword";
import QuotesHistory from "./pages/QuotesHistory";
import VendorPaymentBilling from "./pages/VendorPaymentBilling";
import VendorDashboard from "./pages/VendorDashboard";
import { RoleGuard } from "./components/RoleGuard";
import { useAuth } from "@/contexts/AuthContext";
import Admin from "./pages/Admin";
import AdminDashboard from "./pages/AdminDashboard";
import { AdminGuard } from "./components/AdminGuard";
import { AdminLayout } from "./components/admin/AdminLayout";
import AdminOverview from "./pages/admin/AdminOverview";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminAudit from "./pages/admin/AdminAudit";
import AdminUsersHub from "./pages/admin/AdminUsersHub";
import AdminUsersList from "./pages/admin/AdminUsersList";
import AdminVendorsList from "./pages/admin/AdminVendorsList";
import AdminClientsList from "./pages/admin/AdminClientsList";
import AdminVendorDetail from "./pages/admin/AdminVendorDetail";
import AdminClientDetail from "./pages/admin/AdminClientDetail";

const queryClient = new QueryClient();

// Component for vendor redirect logic - only for authenticated users
const VendorRouteHandler = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  
  // If not authenticated, show the landing page directly
  if (!user) {
    return <>{children}</>;
  }
  
  // If authenticated, check user type and redirect vendors
  return (
    <RoleGuard 
      allowedUserTypes={['client']} 
      fallbackRoute="/vendor-dashboard"
    >
      {children}
    </RoleGuard>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ErrorBoundary>
      <AuthProvider>
        <QuoteFormProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter 
              future={{ 
                v7_startTransition: true, 
                v7_relativeSplatPath: true 
              }}
            >
              <EmailConfirmationHandler />
              <div className="min-h-screen flex flex-col">
              <Routes>
                <Route path="/" element={
                  <VendorRouteHandler>
                    <Index />
                  </VendorRouteHandler>
                } />
                <Route path="/auth" element={<Auth />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/admin-dashboard" element={
                  <AdminGuard>
                    <AdminDashboard />
                  </AdminGuard>
                } />
                <Route path="/admin/overview" element={
                  <AdminGuard>
                    <AdminLayout>
                      <AdminOverview />
                    </AdminLayout>
                  </AdminGuard>
                } />
                
                {/* New Users Hub Structure */}
                <Route path="/admin/users" element={
                  <AdminGuard>
                    <AdminLayout>
                      <AdminUsersHub />
                    </AdminLayout>
                  </AdminGuard>
                } />
                <Route path="/admin/users/admins" element={
                  <AdminGuard>
                    <AdminLayout>
                      <AdminUsersList />
                    </AdminLayout>
                  </AdminGuard>
                } />
                <Route path="/admin/users/vendors" element={
                  <AdminGuard>
                    <AdminLayout>
                      <AdminVendorsList />
                    </AdminLayout>
                  </AdminGuard>
                } />
                <Route path="/admin/users/vendors/:vendorId" element={
                  <AdminGuard>
                    <AdminLayout>
                      <AdminVendorDetail />
                    </AdminLayout>
                  </AdminGuard>
                } />
                <Route path="/admin/users/clients" element={
                  <AdminGuard>
                    <AdminLayout>
                      <AdminClientsList />
                    </AdminLayout>
                  </AdminGuard>
                } />
                <Route path="/admin/users/clients/:clientId" element={
                  <AdminGuard>
                    <AdminLayout>
                      <AdminClientDetail />
                    </AdminLayout>
                  </AdminGuard>
                } />
                
                {/* Legacy redirects */}
                <Route path="/admin/vendors" element={<Navigate to="/admin/users/vendors" replace />} />
                <Route path="/admin/tickets" element={<Navigate to="/admin/users/vendors" replace />} />
                <Route path="/admin/chats" element={<Navigate to="/admin/users/vendors" replace />} />
                <Route path="/admin/quotes" element={<Navigate to="/admin/users/vendors" replace />} />
                <Route path="/admin/invoices" element={<Navigate to="/admin/users/vendors" replace />} />
                <Route path="/admin/analytics" element={
                  <AdminGuard>
                    <AdminLayout>
                      <AdminAnalytics />
                    </AdminLayout>
                  </AdminGuard>
                } />
                <Route path="/admin/settings" element={
                  <AdminGuard>
                    <AdminLayout>
                      <AdminSettings />
                    </AdminLayout>
                  </AdminGuard>
                } />
                <Route path="/admin/audit" element={
                  <AdminGuard>
                    <AdminLayout>
                      <AdminAudit />
                    </AdminLayout>
                  </AdminGuard>
                } />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/*" element={
                  <>
                    <Header />
                    <main className="flex-1">
                      <Routes>
                        <Route path="/faq" element={<FAQ />} />
                        <Route path="/contact" element={<Contact />} />
                        <Route path="/terms" element={<Terms />} />
                        <Route path="/privacy" element={<Privacy />} />
                        <Route path="/cookies" element={<Cookies />} />
                        <Route path="/acceptable-use" element={<AcceptableUse />} />
                        <Route path="/dashboard" element={<Navigate to="/tickets" replace />} />
                        <Route path="/business-information" element={
                          <RoleGuard allowedUserTypes={['vendor']}>
                            <BusinessInformation />
                          </RoleGuard>
                        } />
                        <Route path="/vendor-dashboard" element={
                          <RoleGuard allowedUserTypes={['vendor']}>
                            <VendorDashboard />
                          </RoleGuard>
                        } />
                        <Route path="/profile" element={
                          <RoleGuard allowedUserTypes={['client', 'vendor']}>
                            <Profile />
                          </RoleGuard>
                        } />
                        <Route path="/tickets" element={
                          <RoleGuard allowedUserTypes={['client']}>
                            <Tickets />
                          </RoleGuard>
                        } />
                        <Route path="/quotes-history" element={
                          <RoleGuard allowedUserTypes={['client']}>
                            <QuotesHistory />
                          </RoleGuard>
                        } />
                        <Route path="/payment-billing" element={
                          <RoleGuard allowedUserTypes={['vendor']}>
                            <VendorPaymentBilling />
                          </RoleGuard>
                        } />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </main>
                    <Footer />
                  </>
                } />
              </Routes>
            </div>
          </BrowserRouter>
          </TooltipProvider>
        </QuoteFormProvider>
      </AuthProvider>
    </ErrorBoundary>
  </QueryClientProvider>
);

export default App;