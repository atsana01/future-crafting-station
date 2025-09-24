import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  CreditCard, 
  Check, 
  Star, 
  Crown, 
  Zap, 
  TrendingUp,
  Users,
  Clock,
  Shield,
  MessageSquare,
  Trophy,
  Percent
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const VendorPaymentBilling = () => {
  const [currentPlan, setCurrentPlan] = useState('free');
  const [usage, setUsage] = useState({
    quotesThisMonth: 15,
    messagesThisMonth: 45,
    projectsCompleted: 3
  });

  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: 0,
      icon: <Users className="w-6 h-6" />,
      badge: null,
      features: [
        'Up to 10 quotes per month',
        'Basic profile visibility',
        'Standard response time',
        'Email support',
        '2% platform commission',
        'Basic messaging'
      ],
      limits: {
        quotesPerMonth: 10,
        messagesPerMonth: 50,
        commission: 2.0
      }
    },
    {
      id: 'basic',
      name: 'Basic',
      price: 25,
      icon: <Zap className="w-6 h-6" />,
      badge: 'Most Popular',
      features: [
        'Up to 50 quotes per month',
        'Enhanced profile visibility',
        'Priority customer matching',
        'Phone & email support',
        '1.75% platform commission',
        'Advanced messaging features',
        'Quote templates',
        'Basic analytics'
      ],
      limits: {
        quotesPerMonth: 50,
        messagesPerMonth: 200,
        commission: 1.75
      }
    },
    {
      id: 'premium',
      name: 'Premium',
      price: 100,
      icon: <Crown className="w-6 h-6" />,
      badge: 'Best Value',
      features: [
        'Unlimited quotes',
        'Top profile placement',
        'Instant customer notifications',
        'Priority support & dedicated manager',
        '1.5% platform commission',
        'All messaging features',
        'Custom quote templates',
        'Advanced analytics & insights',
        'Featured vendor badge',
        'Priority project matching',
        'Custom portfolio showcase',
        'Marketing support'
      ],
      limits: {
        quotesPerMonth: 999999,
        messagesPerMonth: 999999,
        commission: 1.5
      }
    }
  ];

  const getCurrentPlanDetails = () => {
    return plans.find(plan => plan.id === currentPlan) || plans[0];
  };

  const handleUpgrade = async (planId: string) => {
    const plan = plans.find(p => p.id === planId);
    if (!plan || plan.price === 0) return;

    try {
      // Create Stripe payment link for subscription
      const response = await fetch('/api/create-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId,
          priceAmount: plan.price * 100, // Convert to cents
          currency: 'eur'
        })
      });

      if (response.ok) {
        const { paymentUrl } = await response.json();
        window.open(paymentUrl, '_blank');
      } else {
        throw new Error('Failed to create payment link');
      }
    } catch (error) {
      toast.error('Failed to initiate payment. Please try again.');
    }
  };

  const currentPlanDetails = getCurrentPlanDetails();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Vendor Plans & Billing
            </h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Choose the perfect plan to grow your business and maximize your success on BuildEasy
          </p>
        </div>

        {/* Current Plan Overview */}
        <Card className="mb-8 border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  {currentPlanDetails.icon}
                </div>
                <div>
                  <CardTitle className="flex items-center gap-2">
                    Current Plan: {currentPlanDetails.name}
                    {currentPlanDetails.badge && (
                      <Badge variant="secondary">{currentPlanDetails.badge}</Badge>
                    )}
                  </CardTitle>
                  <p className="text-muted-foreground">
                    {currentPlanDetails.price === 0 
                      ? 'Free forever'
                      : `€${currentPlanDetails.price}/month`
                    }
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-primary">
                  {currentPlanDetails.limits.commission}%
                </p>
                <p className="text-sm text-muted-foreground">Commission Rate</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Quotes This Month</span>
                  <span className="text-sm text-muted-foreground">
                    {usage.quotesThisMonth}/{currentPlanDetails.limits.quotesPerMonth === 999999 ? '∞' : currentPlanDetails.limits.quotesPerMonth}
                  </span>
                </div>
                <Progress 
                  value={currentPlanDetails.limits.quotesPerMonth === 999999 ? 30 : (usage.quotesThisMonth / currentPlanDetails.limits.quotesPerMonth) * 100} 
                  className="h-2"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Messages This Month</span>
                  <span className="text-sm text-muted-foreground">
                    {usage.messagesThisMonth}/{currentPlanDetails.limits.messagesPerMonth === 999999 ? '∞' : currentPlanDetails.limits.messagesPerMonth}
                  </span>
                </div>
                <Progress 
                  value={currentPlanDetails.limits.messagesPerMonth === 999999 ? 25 : (usage.messagesThisMonth / currentPlanDetails.limits.messagesPerMonth) * 100} 
                  className="h-2"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Projects Completed</span>
                  <span className="text-sm text-muted-foreground">{usage.projectsCompleted}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm text-muted-foreground">Keep up the great work!</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upgrade Plans */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {plans.map((plan) => (
            <Card 
              key={plan.id}
              className={`relative transition-all duration-300 hover:shadow-xl ${
                plan.id === 'premium' 
                  ? 'border-2 border-primary shadow-lg transform scale-105' 
                  : plan.id === currentPlan 
                    ? 'border-2 border-primary/50 bg-primary/5'
                    : 'border hover:border-primary/30'
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-gradient-primary text-white px-4 py-1">
                    {plan.badge}
                  </Badge>
                </div>
              )}
              
              <CardHeader className="text-center pb-4">
                <div className="flex justify-center mb-3">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                    plan.id === 'premium' 
                      ? 'bg-gradient-primary text-white' 
                      : 'bg-primary/10 text-primary'
                  }`}>
                    {plan.icon}
                  </div>
                </div>
                <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                <div className="mb-4">
                  <span className="text-4xl font-bold">
                    {plan.price === 0 ? 'Free' : `€${plan.price}`}
                  </span>
                  {plan.price > 0 && (
                    <span className="text-muted-foreground">/month</span>
                  )}
                </div>
                <div className="flex items-center justify-center gap-2 text-sm">
                  <Percent className="w-4 h-4" />
                  <span>{plan.limits.commission}% commission rate</span>
                </div>
              </CardHeader>

              <CardContent>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button 
                  className={`w-full ${
                    plan.id === currentPlan 
                      ? 'bg-muted text-muted-foreground cursor-not-allowed'
                      : plan.id === 'premium'
                        ? 'bg-gradient-primary hover:opacity-90'
                        : ''
                  }`}
                  disabled={plan.id === currentPlan}
                  onClick={() => handleUpgrade(plan.id)}
                >
                  {plan.id === currentPlan 
                    ? 'Current Plan'
                    : plan.price === 0
                      ? 'Downgrade to Free'
                      : `Upgrade to ${plan.name}`
                  }
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Billing History */}
        <Card>
          <CardHeader>
            <CardTitle>Billing History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No billing history available</p>
              <p className="text-sm">Your payment history will appear here once you upgrade to a paid plan</p>
            </div>
          </CardContent>
        </Card>

        {/* Benefits Overview */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="text-center">
            <CardContent className="pt-6">
              <TrendingUp className="w-8 h-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Grow Your Business</h3>
              <p className="text-sm text-muted-foreground">
                Get more projects and increase your revenue with higher visibility
              </p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-6">
              <Shield className="w-8 h-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Lower Commission</h3>
              <p className="text-sm text-muted-foreground">
                Keep more of what you earn with reduced platform fees
              </p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-6">
              <Star className="w-8 h-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Priority Support</h3>
              <p className="text-sm text-muted-foreground">
                Get faster response times and dedicated account management
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default VendorPaymentBilling;