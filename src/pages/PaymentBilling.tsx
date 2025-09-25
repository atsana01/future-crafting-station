import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, 
  DollarSign, 
  FileText, 
  Shield, 
  CheckCircle2,
  AlertCircle,
  Clock,
  Download,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const PaymentBilling = () => {
  const [subscriptionStatus, setSubscriptionStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);

  useEffect(() => {
    checkSubscriptionStatus();
  }, []);

  const checkSubscriptionStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      if (error) throw error;
      setSubscriptionStatus(data);
    } catch (error) {
      console.error('Error checking subscription:', error);
      toast({
        title: 'Error',
        description: 'Failed to check subscription status',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planType: 'pro' | 'enterprise') => {
    setUpgrading(planType);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { planType }
      });
      
      if (error) throw error;
      
      // Open checkout in new tab
      window.open(data.url, '_blank');
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast({
        title: 'Error',
        description: 'Failed to start checkout process',
        variant: 'destructive',
      });
    } finally {
      setUpgrading(null);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error) throw error;
      window.open(data.url, '_blank');
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast({
        title: 'Error',
        description: 'Failed to open subscription management',
        variant: 'destructive',
      });
    }
  };

  const getCurrentPlanName = () => {
    if (!subscriptionStatus) return 'Free Plan';
    if (!subscriptionStatus.subscribed) return 'Free Plan';
    return subscriptionStatus.plan_type === 'pro' ? 'Pro Plan' : 'Enterprise Plan';
  };

  const getCurrentPlanPrice = () => {
    if (!subscriptionStatus?.subscribed) return '$0';
    return subscriptionStatus.plan_type === 'pro' ? '$29' : '$99';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="container max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <CreditCard className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Payment & Billing
              </h1>
              <p className="text-muted-foreground mt-1">
                Manage your payments and billing information
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Current Plan */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Current Plan
              </CardTitle>
              <CardDescription>
                Your current subscription and usage details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg">
                <div>
                  <h3 className="font-semibold text-lg">{getCurrentPlanName()}</h3>
                  <p className="text-muted-foreground">
                    {subscriptionStatus?.subscribed 
                      ? 'Your active subscription' 
                      : 'Perfect for getting started'
                    }
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      {subscriptionStatus?.subscribed 
                        ? 'Unlimited Quote Requests' 
                        : '5 Quote Requests'
                      }
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      {subscriptionStatus?.subscribed 
                        ? 'Priority Support' 
                        : 'Basic Support'
                      }
                    </span>
                  </div>
                  {subscriptionStatus?.subscription_end && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Renews on {new Date(subscriptionStatus.subscription_end).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">{getCurrentPlanPrice()}</div>
                  <div className="text-sm text-muted-foreground">per month</div>
                </div>
              </div>
              
              <div className="mt-4 flex gap-2">
                {!subscriptionStatus?.subscribed ? (
                  <Button className="bg-gradient-primary">
                    Upgrade Plan
                  </Button>
                ) : (
                  <Button onClick={handleManageSubscription} variant="outline">
                    Manage Subscription
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Payment Methods */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                Payment Methods
              </CardTitle>
              <CardDescription>
                Manage your payment methods and billing information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium mb-2">No payment methods added</h3>
                <p className="text-muted-foreground mb-4">
                  Add a payment method to upgrade your plan and access premium features
                </p>
                <Button variant="outline">
                  Add Payment Method
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Billing History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Billing History
              </CardTitle>
              <CardDescription>
                View and download your past invoices
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium mb-2">No billing history</h3>
                <p className="text-muted-foreground">
                  Your billing history will appear here once you make your first payment
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Usage Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-primary" />
                Usage Overview
              </CardTitle>
              <CardDescription>
                Track your current usage and limits
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <div>
                      <p className="font-medium">Quote Requests</p>
                      <p className="text-sm text-muted-foreground">Current billing period</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">0 / 5</p>
                    <Badge variant="secondary" className="text-xs">
                      Free Plan
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-accent rounded-full"></div>
                    <div>
                      <p className="font-medium">Messages Sent</p>
                      <p className="text-sm text-muted-foreground">Current billing period</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">0 / Unlimited</p>
                    <Badge variant="secondary" className="text-xs">
                      Free Plan
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Upgrade Options */}
          <Card>
            <CardHeader>
              <CardTitle>Upgrade for More Features</CardTitle>
              <CardDescription>
                Get access to premium features and unlimited usage
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2">Pro Plan</h3>
                  <div className="text-2xl font-bold mb-2">$29<span className="text-sm font-normal">/month</span></div>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      Unlimited Quote Requests
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      Priority Support
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      Advanced Analytics
                    </li>
                  </ul>
                  <Button 
                    className="w-full mt-4 bg-gradient-primary"
                    onClick={() => handleUpgrade('pro')}
                    disabled={upgrading === 'pro' || subscriptionStatus?.plan_type === 'pro'}
                  >
                    {upgrading === 'pro' ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : subscriptionStatus?.plan_type === 'pro' ? (
                      'Current Plan'
                    ) : (
                      'Upgrade to Pro'
                    )}
                  </Button>
                </div>

                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2">Enterprise</h3>
                  <div className="text-2xl font-bold mb-2">$99<span className="text-sm font-normal">/month</span></div>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      Everything in Pro
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      Dedicated Account Manager
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      Custom Integrations
                    </li>
                  </ul>
                  <Button 
                    variant="outline" 
                    className="w-full mt-4"
                    onClick={() => handleUpgrade('enterprise')}
                    disabled={upgrading === 'enterprise' || subscriptionStatus?.plan_type === 'enterprise'}
                  >
                    {upgrading === 'enterprise' ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : subscriptionStatus?.plan_type === 'enterprise' ? (
                      'Current Plan'
                    ) : (
                      'Upgrade to Enterprise'
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PaymentBilling;