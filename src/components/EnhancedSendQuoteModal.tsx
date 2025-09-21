import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  DollarSign, 
  Clock, 
  FileText, 
  Calendar, 
  Shield, 
  Briefcase,
  AlertCircle,
  Plus,
  Minus
} from 'lucide-react';
import { validateInput, sanitizeInput, logSecurityEvent } from '@/utils/security';

interface SendQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  quoteRequestId: string;
  projectTitle: string;
  onQuoteSent: () => void;
}

interface CostBreakdownItem {
  item: string;
  amount: number;
  description: string;
}

interface Milestone {
  name: string;
  percentage: number;
  description: string;
}

const EnhancedSendQuoteModal: React.FC<SendQuoteModalProps> = ({
  isOpen,
  onClose,
  quoteRequestId,
  projectTitle,
  onQuoteSent
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    totalAmount: '',
    estimatedTimeline: '',
    startDate: '',
    durationWeeks: '',
    notes: '',
    siteVisitRequired: false,
    insuranceWillBeUsed: false,
    insuranceProvider: '',
    validityDate: '',
    assumptionsDependencies: '',
    inclusions: [''],
    exclusions: [''],
  });

  const [costBreakdown, setCostBreakdown] = useState<CostBreakdownItem[]>([
    { item: '', amount: 0, description: '' }
  ]);

  const [milestones, setMilestones] = useState<Milestone[]>([
    { name: '', percentage: 0, description: '' }
  ]);

  const [paymentTerms, setPaymentTerms] = useState({
    depositPercentage: '25',
    schedule: 'milestone-based',
    netDays: '30'
  });

  const addCostItem = () => {
    setCostBreakdown([...costBreakdown, { item: '', amount: 0, description: '' }]);
  };

  const removeCostItem = (index: number) => {
    if (costBreakdown.length > 1) {
      setCostBreakdown(costBreakdown.filter((_, i) => i !== index));
    }
  };

  const updateCostItem = (index: number, field: keyof CostBreakdownItem, value: string | number) => {
    const updated = [...costBreakdown];
    updated[index] = { ...updated[index], [field]: value };
    setCostBreakdown(updated);
  };

  const addMilestone = () => {
    setMilestones([...milestones, { name: '', percentage: 0, description: '' }]);
  };

  const removeMilestone = (index: number) => {
    if (milestones.length > 1) {
      setMilestones(milestones.filter((_, i) => i !== index));
    }
  };

  const updateMilestone = (index: number, field: keyof Milestone, value: string | number) => {
    const updated = [...milestones];
    updated[index] = { ...updated[index], [field]: value };
    setMilestones(updated);
  };

  const addInclusion = () => {
    setFormData(prev => ({ ...prev, inclusions: [...prev.inclusions, ''] }));
  };

  const removeInclusion = (index: number) => {
    setFormData(prev => ({ 
      ...prev, 
      inclusions: prev.inclusions.filter((_, i) => i !== index) 
    }));
  };

  const updateInclusion = (index: number, value: string) => {
    const updated = [...formData.inclusions];
    updated[index] = value;
    setFormData(prev => ({ ...prev, inclusions: updated }));
  };

  const addExclusion = () => {
    setFormData(prev => ({ ...prev, exclusions: [...prev.exclusions, ''] }));
  };

  const removeExclusion = (index: number) => {
    setFormData(prev => ({ 
      ...prev, 
      exclusions: prev.exclusions.filter((_, i) => i !== index) 
    }));
  };

  const updateExclusion = (index: number, value: string) => {
    const updated = [...formData.exclusions];
    updated[index] = value;
    setFormData(prev => ({ ...prev, exclusions: updated }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.totalAmount || !formData.estimatedTimeline) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    const totalAmount = parseFloat(formData.totalAmount);
    if (isNaN(totalAmount) || totalAmount <= 0) {
      toast({
        title: 'Error',
        description: 'Please enter a valid quote amount',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    
    try {
      // Create the full quote record
      const quoteInsertData = {
        quote_request_id: quoteRequestId,
        total_amount: totalAmount,
        estimated_timeline: sanitizeInput(formData.estimatedTimeline),
        start_date: formData.startDate || null,
        duration_weeks: formData.durationWeeks ? parseInt(formData.durationWeeks) : null,
        cost_breakdown: costBreakdown.filter(item => item.item && item.amount) as any,
        milestones: milestones.filter(m => m.name && m.percentage) as any,
        payment_schedule: paymentTerms as any,
        validity_date: formData.validityDate || null,
        site_visit_required: formData.siteVisitRequired,
        insurance_will_be_used: formData.insuranceWillBeUsed,
        insurance_provider_used: formData.insuranceProvider || null,
        assumptions_dependencies: sanitizeInput(formData.assumptionsDependencies),
        inclusions: formData.inclusions.filter(inc => inc.trim()),
        exclusions: formData.exclusions.filter(exc => exc.trim()),
        notes_to_client: sanitizeInput(formData.notes)
      };

      const { data: quoteData, error: quoteError } = await supabase
        .from('quotes')
        .insert(quoteInsertData)
        .select()
        .single();

      if (quoteError) throw quoteError;

      // Update the quote request to reference the latest quote
      const { error: updateError } = await supabase
        .from('quote_requests')
        .update({
          quoted_amount: totalAmount,
          estimated_timeline: sanitizeInput(formData.estimatedTimeline),
          status: 'quoted',
          responded_at: new Date().toISOString()
        })
        .eq('id', quoteRequestId);

      if (updateError) throw updateError;

      await logSecurityEvent('enhanced_quote_submitted', 'quotes', quoteData.id, {
        quote_amount: totalAmount,
        quote_request_id: quoteRequestId
      });

      toast({
        title: 'Quote Sent',
        description: 'Your detailed quote has been sent to the client successfully.',
      });

      onQuoteSent();
      onClose();
      // Reset form
      setFormData({
        totalAmount: '',
        estimatedTimeline: '',
        startDate: '',
        durationWeeks: '',
        notes: '',
        siteVisitRequired: false,
        insuranceWillBeUsed: false,
        insuranceProvider: '',
        validityDate: '',
        assumptionsDependencies: '',
        inclusions: [''],
        exclusions: [''],
      });
      setCostBreakdown([{ item: '', amount: 0, description: '' }]);
      setMilestones([{ name: '', percentage: 0, description: '' }]);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send quote',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            Send Detailed Quote for "{projectTitle}"
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Quote Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="totalAmount" className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Total Quote Amount (EUR) *
              </Label>
              <Input
                id="totalAmount"
                type="number"
                step="0.01"
                placeholder="Enter total amount"
                value={formData.totalAmount}
                onChange={(e) => setFormData(prev => ({ ...prev, totalAmount: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimatedTimeline" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Estimated Timeline *
              </Label>
              <Input
                id="estimatedTimeline"
                placeholder="e.g., 6-8 weeks, 3 months"
                value={formData.estimatedTimeline}
                onChange={(e) => setFormData(prev => ({ ...prev, estimatedTimeline: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Proposed Start Date
              </Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="validityDate" className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Quote Valid Until
              </Label>
              <Input
                id="validityDate"
                type="date"
                value={formData.validityDate}
                onChange={(e) => setFormData(prev => ({ ...prev, validityDate: e.target.value }))}
              />
            </div>
          </div>

          {/* Cost Breakdown */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Cost Breakdown</h3>
              <Button type="button" onClick={addCostItem} size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </div>
            
            {costBreakdown.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-4">
                  <Input
                    placeholder="Item description"
                    value={item.item}
                    onChange={(e) => updateCostItem(index, 'item', e.target.value)}
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Amount"
                    value={item.amount || ''}
                    onChange={(e) => updateCostItem(index, 'amount', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="col-span-5">
                  <Input
                    placeholder="Additional details"
                    value={item.description}
                    onChange={(e) => updateCostItem(index, 'description', e.target.value)}
                  />
                </div>
                <div className="col-span-1">
                  <Button
                    type="button"
                    onClick={() => removeCostItem(index)}
                    size="sm"
                    variant="ghost"
                    disabled={costBreakdown.length === 1}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Payment Terms */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Payment Terms</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Deposit Percentage</Label>
                <Select value={paymentTerms.depositPercentage} onValueChange={(value) => setPaymentTerms(prev => ({ ...prev, depositPercentage: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">No Deposit</SelectItem>
                    <SelectItem value="25">25%</SelectItem>
                    <SelectItem value="50">50%</SelectItem>
                    <SelectItem value="75">75%</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Payment Schedule</Label>
                <Select value={paymentTerms.schedule} onValueChange={(value) => setPaymentTerms(prev => ({ ...prev, schedule: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="milestone-based">Milestone Based</SelectItem>
                    <SelectItem value="upfront">Full Upfront</SelectItem>
                    <SelectItem value="completion">On Completion</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Net Payment Days</Label>
                <Select value={paymentTerms.netDays} onValueChange={(value) => setPaymentTerms(prev => ({ ...prev, netDays: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">Net 15</SelectItem>
                    <SelectItem value="30">Net 30</SelectItem>
                    <SelectItem value="45">Net 45</SelectItem>
                    <SelectItem value="60">Net 60</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Project Checkboxes */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="siteVisit"
                checked={formData.siteVisitRequired}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, siteVisitRequired: !!checked }))}
              />
              <Label htmlFor="siteVisit">Site visit required before starting</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="insurance"
                checked={formData.insuranceWillBeUsed}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, insuranceWillBeUsed: !!checked }))}
              />
              <Label htmlFor="insurance" className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Insurance will be used for this project
              </Label>
            </div>

            {formData.insuranceWillBeUsed && (
              <div className="ml-6 space-y-2">
                <Label htmlFor="insuranceProvider">Insurance Provider</Label>
                <Input
                  id="insuranceProvider"
                  placeholder="Name of insurance company"
                  value={formData.insuranceProvider}
                  onChange={(e) => setFormData(prev => ({ ...prev, insuranceProvider: e.target.value }))}
                />
              </div>
            )}
          </div>

          {/* Inclusions */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-green-600">What's Included</h3>
              <Button type="button" onClick={addInclusion} size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Add Inclusion
              </Button>
            </div>
            
            {formData.inclusions.map((inclusion, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  placeholder="What's included in this quote..."
                  value={inclusion}
                  onChange={(e) => updateInclusion(index, e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  onClick={() => removeInclusion(index)}
                  size="sm"
                  variant="ghost"
                  disabled={formData.inclusions.length === 1}
                >
                  <Minus className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>

          {/* Exclusions */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-red-600">What's NOT Included</h3>
              <Button type="button" onClick={addExclusion} size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Add Exclusion
              </Button>
            </div>
            
            {formData.exclusions.map((exclusion, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  placeholder="What's NOT included..."
                  value={exclusion}
                  onChange={(e) => updateExclusion(index, e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  onClick={() => removeExclusion(index)}
                  size="sm"
                  variant="ghost"
                  disabled={formData.exclusions.length === 1}
                >
                  <Minus className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>

          {/* Additional Notes */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="assumptions" className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Assumptions & Dependencies
              </Label>
              <Textarea
                id="assumptions"
                placeholder="List any assumptions or dependencies for this quote..."
                value={formData.assumptionsDependencies}
                onChange={(e) => setFormData(prev => ({ ...prev, assumptionsDependencies: e.target.value }))}
                className="min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Additional Notes to Client
              </Label>
              <Textarea
                id="notes"
                placeholder="Include any additional details, terms, or clarifications..."
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="min-h-[100px]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-gradient-primary">
              {loading ? 'Sending...' : 'Send Detailed Quote'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EnhancedSendQuoteModal;