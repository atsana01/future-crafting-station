import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageCircle, Zap, Users, CheckCircle, ArrowRight } from 'lucide-react';

const HowItWorks = () => {
  const steps = [
    {
      title: "Describe Your Vision",
      description: "Tell us about your project - renovations, extensions, or new builds. Our AI understands your needs.",
      icon: MessageCircle,
      color: "text-primary"
    },
    {
      title: "Instant Matching", 
      description: "Get connected with verified professionals who specialize in your type of project within minutes.",
      icon: Zap,
      color: "text-accent"
    },
    {
      title: "Compare & Choose",
      description: "Review detailed quotes, portfolios, and ratings. Chat directly with professionals before deciding.",
      icon: Users,
      color: "text-purple"
    },
    {
      title: "Build with Confidence",
      description: "Work with your chosen team knowing they're vetted, insured, and committed to quality delivery.",
      icon: CheckCircle,
      color: "text-primary"
    }
  ];

  return (
    <section className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-primary bg-clip-text text-transparent">
            How It Works
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            From concept to completion in four seamless steps
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
          {steps.map((step, index) => (
            <div key={index} className="relative group">
              <Card className="h-full text-center hover:shadow-elegant transition-all duration-300 group-hover:-translate-y-2 border-0 bg-white/50 backdrop-blur-sm">
                <CardContent className="p-8">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-primary flex items-center justify-center mx-auto mb-6 shadow-lg">
                    <step.icon className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="font-bold text-xl mb-4 text-foreground">{step.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </CardContent>
              </Card>
              
              {/* Connector - Desktop */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                  <div className="w-8 h-0.5 bg-gradient-primary opacity-30"></div>
                </div>
              )}
              
              {/* Step Number Badge */}
              <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-gradient-primary text-white text-sm font-bold flex items-center justify-center shadow-lg">
                {index + 1}
              </div>
            </div>
          ))}
        </div>

        {/* Call to Action */}
        <div className="text-center mt-20">
          <h3 className="text-3xl font-bold mb-4">Ready to Transform Your Space?</h3>
          <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
            Join thousands who've brought their visions to life with our trusted network of professionals.
          </p>
          <Button size="lg" className="bg-gradient-primary border-0 px-8 py-3 text-lg hover:shadow-elegant transition-all">
            Start Building Today
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;