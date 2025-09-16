import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit3, Search, FileCheck, Hammer, ArrowRight, ChevronRight } from 'lucide-react';

const HowItWorks = () => {
  const steps = [
    {
      number: '01',
      title: 'Describe Your Project',
      description: 'Tell us what you want to build in simple terms. Our AI will help match you with the right professionals.',
      icon: Edit3,
      color: 'bg-blue-500'
    },
    {
      number: '02', 
      title: 'Get Matched',
      description: 'Our intelligent system analyzes your project and connects you with verified professionals who specialize in your needs.',
      icon: Search,
      color: 'bg-purple-500'
    },
    {
      number: '03',
      title: 'Review Proposals', 
      description: 'Compare detailed quotes, timelines, and vendor profiles. Ask questions and request additional information.',
      icon: FileCheck,
      color: 'bg-green-500'
    },
    {
      number: '04',
      title: 'Start Building',
      description: 'Accept your preferred proposal and begin your project with confidence. Track progress and communicate easily.',
      icon: Hammer,
      color: 'bg-orange-500'
    }
  ];

  return (
    <section className="py-16 px-4">
      <div className="container max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            How It Works
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            From idea to reality in four simple steps. Our platform makes it easy to connect with the right professionals for your project.
          </p>
        </div>

        <div className="relative">
          {/* Desktop Flow Line */}
          <div className="hidden md:block absolute top-24 left-1/2 transform -translate-x-1/2 w-full max-w-4xl">
            <div className="absolute inset-0 flex justify-between items-center px-12">
              <div className="flex-1 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500"></div>
              <div className="flex-1 h-0.5 bg-gradient-to-r from-purple-500 to-green-500 ml-8"></div>
              <div className="flex-1 h-0.5 bg-gradient-to-r from-green-500 to-orange-500 ml-8"></div>
            </div>
          </div>

          <div className="grid md:grid-cols-4 gap-8 relative">
            {steps.map((step, index) => (
              <div key={step.number} className="relative">
                <Card className="text-center hover:shadow-elegant transition-all duration-300 hover:-translate-y-2 group">
                  <CardContent className="p-8">
                    {/* Step Number */}
                    <div className={`w-16 h-16 ${step.color} rounded-full flex items-center justify-center mx-auto mb-6 text-white font-bold text-lg relative z-10 group-hover:scale-110 transition-transform`}>
                      {step.number}
                    </div>

                    {/* Icon */}
                    <div className="mb-6">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto group-hover:bg-primary/20 transition-colors">
                        <step.icon className="w-6 h-6 text-primary" />
                      </div>
                    </div>

                    {/* Content */}
                    <h3 className="font-semibold text-xl mb-3 group-hover:text-primary transition-colors">
                      {step.title}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {step.description}
                    </p>
                  </CardContent>
                </Card>

                {/* Mobile Arrow */}
                {index < steps.length - 1 && (
                  <div className="md:hidden flex justify-center my-4">
                    <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center mt-16">
          <div className="inline-flex items-center gap-4 p-6 bg-gradient-to-r from-primary/10 to-accent/10 rounded-2xl border border-primary/20">
            <div>
              <h3 className="font-semibold text-lg mb-2">Ready to get started?</h3>
              <p className="text-muted-foreground text-sm">Join thousands of clients who have successfully completed their projects</p>
            </div>
            <Button className="bg-gradient-primary shrink-0">
              Start Your Project
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;