import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  FileQuestion, 
  AlertCircle, 
  Clock,
  User,
  Building
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface FormalRFIModalProps {
  isOpen: boolean;
  onClose: () => void;
  quoteRequestId: string;
  projectTitle: string;
  clientId: string;
  vendorId?: string;
  isVendor?: boolean;
}

const FormalRFIModal: React.FC<FormalRFIModalProps> = ({
  isOpen,
  onClose,
  quoteRequestId,
  projectTitle,
  clientId,
  vendorId,
  isVendor = false
}) => {
  const [rfiData, setRfiData] = useState({
    subject: '',
    urgency: 'normal' as 'low' | 'normal' | 'high' | 'critical',
    category: 'technical' as 'technical' | 'commercial' | 'schedule' | 'design' | 'compliance' | 'other',
    description: '',
    responseRequired: true,
    responseDeadline: ''
  });
  const [loading, setLoading] = useState(false);

  const urgencyOptions = [
    { value: 'low', label: 'Low', color: 'bg-green-100 text-green-800' },
    { value: 'normal', label: 'Normal', color: 'bg-blue-100 text-blue-800' },
    { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800' },
    { value: 'critical', label: 'Critical', color: 'bg-red-100 text-red-800' }
  ];

  const categoryOptions = [
    { value: 'technical', label: 'Technical Specifications' },
    { value: 'commercial', label: 'Commercial Terms' },
    { value: 'schedule', label: 'Project Schedule' },
    { value: 'design', label: 'Design Requirements' },
    { value: 'compliance', label: 'Compliance & Regulations' },
    { value: 'other', label: 'Other' }
  ];

  const handleSubmitRFI = async () => {
    if (!rfiData.subject.trim() || !rfiData.description.trim()) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('messages')
        .insert({
          quote_request_id: quoteRequestId,
          sender_id: isVendor ? vendorId : clientId,
          recipient_id: isVendor ? clientId : vendorId,
          message_type: 'text',
          message_content: JSON.stringify({
            subject: rfiData.subject,
            urgency: rfiData.urgency,
            category: rfiData.category,
            description: rfiData.description,
            responseRequired: rfiData.responseRequired,
            responseDeadline: rfiData.responseDeadline
          })
        });

      if (error) throw error;

      toast({
        title: 'RFI Submitted',
        description: 'Your Request for Information has been sent successfully',
      });

      onClose();
      setRfiData({
        subject: '',
        urgency: 'normal',
        category: 'technical',
        description: '',
        responseRequired: true,
        responseDeadline: ''
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to submit RFI',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <FileQuestion className="w-6 h-6 text-primary" />
            Request for Information (RFI)
            <Badge variant="outline" className="ml-auto">Formal Document</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Project Context */}
          <Card className="bg-muted/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Building className="w-4 h-4" />
                Project Context
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium">{projectTitle}</p>
              <p className="text-xs text-muted-foreground mt-1">
                RFI Reference: RFI-{quoteRequestId.slice(-8).toUpperCase()}
              </p>
            </CardContent>
          </Card>

          {/* RFI Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="subject" className="text-sm font-medium">
                  Subject <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="subject"
                  value={rfiData.subject}
                  onChange={(e) => setRfiData({ ...rfiData, subject: e.target.value })}
                  placeholder="Brief description of the information needed"
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-sm font-medium">
                  Category <span className="text-red-500">*</span>
                </Label>
                <RadioGroup
                  value={rfiData.category}
                  onValueChange={(value) => setRfiData({ ...rfiData, category: value as any })}
                  className="mt-2"
                >
                  {categoryOptions.map((option) => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={option.value} id={option.value} />
                      <Label htmlFor={option.value} className="text-sm">{option.label}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">
                  Urgency Level <span className="text-red-500">*</span>
                </Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {urgencyOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setRfiData({ ...rfiData, urgency: option.value as any })}
                      className={`p-2 rounded-md text-sm font-medium transition-colors ${
                        rfiData.urgency === option.value
                          ? option.color
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="responseDeadline" className="text-sm font-medium">
                  Response Required By
                </Label>
                <Input
                  id="responseDeadline"
                  type="date"
                  value={rfiData.responseDeadline}
                  onChange={(e) => setRfiData({ ...rfiData, responseDeadline: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Leave blank if no specific deadline
                </p>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description" className="text-sm font-medium">
              Detailed Description <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="description"
              value={rfiData.description}
              onChange={(e) => setRfiData({ ...rfiData, description: e.target.value })}
              placeholder="Provide detailed information about what you need clarification on:
- Specific technical requirements
- Materials or methods to be used
- Compliance requirements
- Schedule implications
- Any supporting documentation needed"
              rows={6}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Be as specific as possible to ensure you receive the information needed
            </p>
          </div>

          {/* Guidelines */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-blue-800 mb-2">RFI Best Practices</p>
                  <ul className="text-blue-700 space-y-1 text-xs">
                    <li>• Be specific and provide context for your request</li>
                    <li>• Include any relevant drawings, specifications, or references</li>
                    <li>• Specify if this impacts project schedule or cost</li>
                    <li>• Allow reasonable time for a comprehensive response</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmitRFI}
            disabled={loading}
            className="bg-gradient-primary"
          >
            {loading ? 'Submitting...' : 'Submit RFI'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FormalRFIModal;