import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  AlertCircle, 
  CheckCircle, 
  ArrowRight, 
  ArrowLeft,
  Info 
} from 'lucide-react';
import {
  calculateStandardVAT,
  calculateRenovationVAT,
  calculatePrimaryResidenceVAT,
  applyReverseCharge,
  isCyprusProperty,
  type VATResult
} from '@/utils/vatCalculator';

interface VATWizardProps {
  amount: number;
  propertyLocation?: string;
  onComplete: (result: VATResult, additionalData?: any) => void;
  onCancel: () => void;
}

const VATWizard = ({ amount, propertyLocation = '', onComplete, onCancel }: VATWizardProps) => {
  const [step, setStep] = useState(1);
  const [vatBasis, setVatBasis] = useState<VATResult['vatBasis']>('standard19');
  const [dwellingAgeYears, setDwellingAgeYears] = useState<number>(3);
  const [materialsPercentage, setMaterialsPercentage] = useState<number>(30);
  const [totalAreaSqm, setTotalAreaSqm] = useState<number>(130);
  const [pricePerSqm, setPricePerSqm] = useState<number>(0);
  const [isPrivateResidence, setIsPrivateResidence] = useState(true);
  const [isBtoB, setIsBtoB] = useState(false);
  const [bothVATRegistered, setBothVATRegistered] = useState(false);
  const [result, setResult] = useState<VATResult | null>(null);

  const isCyprus = isCyprusProperty(propertyLocation);

  const calculateVAT = (): VATResult => {
    switch (vatBasis) {
      case 'standard19':
        return calculateStandardVAT(amount);
      
      case 'reduced5_renovation':
        return calculateRenovationVAT({
          amount,
          dwellingAgeYears,
          materialsPercentage
        });
      
      case 'reduced5_primary_residence':
        return calculatePrimaryResidenceVAT({
          amount,
          totalAreaSqm,
          pricePerSqm: pricePerSqm || undefined
        });
      
      case 'reverse_charge':
        return applyReverseCharge(amount);
      
      default:
        return calculateStandardVAT(amount);
    }
  };

  const handleCalculate = () => {
    const vatResult = calculateVAT();
    setResult(vatResult);
    setStep(4);
  };

  const handleConfirm = () => {
    if (result) {
      const additionalData = {
        dwelling_age_years: vatBasis === 'reduced5_renovation' ? dwellingAgeYears : null,
        materials_percentage: vatBasis === 'reduced5_renovation' ? materialsPercentage : null,
        property_area_sqm: vatBasis === 'reduced5_primary_residence' ? totalAreaSqm : null,
        place_of_supply: propertyLocation,
        property_location: propertyLocation
      };
      onComplete(result, additionalData);
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center flex-1">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
              step >= s ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground text-muted-foreground'
            }`}>
              {s}
            </div>
            {s < 4 && <div className={`flex-1 h-1 mx-2 ${step > s ? 'bg-primary' : 'bg-muted'}`} />}
          </div>
        ))}
      </div>

      {/* Step 1: Property Location Verification */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Property Location</CardTitle>
            <CardDescription>
              For construction/renovation services, VAT is determined by where the property is located
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="location">Property Location</Label>
              <Input
                id="location"
                value={propertyLocation}
                disabled
                className="mt-1"
              />
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                {isCyprus ? (
                  <span className="text-green-700">
                    ✓ Cyprus property detected. Cyprus VAT rules will apply (place of supply: Cyprus).
                  </span>
                ) : (
                  <span className="text-orange-700">
                    ⚠️ Property location unclear. Please verify this is a Cyprus-based project to ensure correct VAT treatment.
                  </span>
                )}
              </AlertDescription>
            </Alert>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <strong>Legal Note:</strong> For services related to immovable property (construction, renovation), 
                the place of supply is where the property is located (EU VAT Directive Art. 47). 
                This determines which country's VAT rules apply.
              </AlertDescription>
            </Alert>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={onCancel}>Cancel</Button>
              <Button onClick={() => setStep(2)}>
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: VAT Path Selection */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 2: Select VAT Treatment</CardTitle>
            <CardDescription>
              Choose the appropriate VAT basis for this project
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <RadioGroup value={vatBasis} onValueChange={(v) => setVatBasis(v as VATResult['vatBasis'])}>
              <div className="space-y-3">
                <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="standard19" id="standard19" />
                  <Label htmlFor="standard19" className="flex-1 cursor-pointer">
                    <div className="font-medium flex items-center gap-2">
                      Standard Rate (19%)
                      <Badge variant="secondary">Most Common</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Default rate for construction and renovation services
                    </p>
                  </Label>
                </div>

                <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="reduced5_renovation" id="reduced5_renovation" />
                  <Label htmlFor="reduced5_renovation" className="flex-1 cursor-pointer">
                    <div className="font-medium">Reduced Rate - Renovation (5%)</div>
                    <p className="text-sm text-muted-foreground mt-1">
                      For renovation/repair of private dwellings ≥3 years old
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      ✓ Includes extensions (since 20 Aug 2020) • Materials must be ≤50% of value
                    </p>
                  </Label>
                </div>

                <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="reduced5_primary_residence" id="reduced5_primary" />
                  <Label htmlFor="reduced5_primary" className="flex-1 cursor-pointer">
                    <div className="font-medium">Reduced Rate - Primary Residence (5%/19%)</div>
                    <p className="text-sm text-muted-foreground mt-1">
                      For construction of primary residence (5% for first 130 m², 19% for remainder)
                    </p>
                  </Label>
                </div>

                <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="reverse_charge" id="reverse_charge" />
                  <Label htmlFor="reverse_charge" className="flex-1 cursor-pointer">
                    <div className="font-medium">Domestic Reverse Charge (0%)</div>
                    <p className="text-sm text-muted-foreground mt-1">
                      B2B construction services where recipient accounts for VAT
                    </p>
                    <p className="text-xs text-orange-600 mt-1">
                      ⚠️ Both parties must be VAT-registered in Cyprus
                    </p>
                  </Label>
                </div>
              </div>
            </RadioGroup>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button onClick={() => setStep(3)}>
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Additional Requirements */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 3: Additional Information</CardTitle>
            <CardDescription>
              {vatBasis === 'reduced5_renovation' && 'Renovation eligibility requirements'}
              {vatBasis === 'reduced5_primary_residence' && 'Primary residence details'}
              {vatBasis === 'reverse_charge' && 'Reverse charge verification'}
              {vatBasis === 'standard19' && 'Confirm VAT calculation'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {vatBasis === 'reduced5_renovation' && (
              <div className="space-y-4">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>5% Renovation Rate Checklist:</strong>
                    <ul className="list-disc ml-4 mt-2 text-sm space-y-1">
                      <li>Private residence (not commercial property)</li>
                      <li>Building is at least 3 years old from first occupation</li>
                      <li>Repair, renovation, alteration, or extension work</li>
                      <li>Materials cost does not exceed 50% of total value</li>
                    </ul>
                  </AlertDescription>
                </Alert>

                <div>
                  <Label htmlFor="dwellingAge">Dwelling Age (years since first occupation)</Label>
                  <Input
                    id="dwellingAge"
                    type="number"
                    min="0"
                    value={dwellingAgeYears}
                    onChange={(e) => setDwellingAgeYears(Number(e.target.value))}
                    className="mt-1"
                  />
                  {dwellingAgeYears < 3 && (
                    <p className="text-sm text-destructive mt-1">
                      ⚠️ Dwelling must be at least 3 years old for reduced rate
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="materialsPercent">Materials as % of Total Value</Label>
                  <Input
                    id="materialsPercent"
                    type="number"
                    min="0"
                    max="100"
                    value={materialsPercentage}
                    onChange={(e) => setMaterialsPercentage(Number(e.target.value))}
                    className="mt-1"
                  />
                  {materialsPercentage > 50 && (
                    <p className="text-sm text-destructive mt-1">
                      ⚠️ Materials exceed 50% threshold for reduced rate
                    </p>
                  )}
                </div>

                <div className="flex items-start space-x-2">
                  <Checkbox 
                    id="privateResidence" 
                    checked={isPrivateResidence}
                    onCheckedChange={(checked) => setIsPrivateResidence(checked as boolean)}
                  />
                  <Label htmlFor="privateResidence" className="text-sm cursor-pointer">
                    I confirm this is a private residence (not commercial property)
                  </Label>
                </div>
              </div>
            )}

            {vatBasis === 'reduced5_primary_residence' && (
              <div className="space-y-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Primary Residence Rate:</strong> The first 130 m² is charged at 5%, 
                    with any remaining area at the standard 19% rate.
                  </AlertDescription>
                </Alert>

                <div>
                  <Label htmlFor="totalArea">Total Property Area (m²)</Label>
                  <Input
                    id="totalArea"
                    type="number"
                    min="0"
                    value={totalAreaSqm}
                    onChange={(e) => setTotalAreaSqm(Number(e.target.value))}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="pricePerSqm">Price per m² (optional, for breakdown)</Label>
                  <Input
                    id="pricePerSqm"
                    type="number"
                    min="0"
                    value={pricePerSqm}
                    onChange={(e) => setPricePerSqm(Number(e.target.value))}
                    placeholder={`Calculated: €${(amount / totalAreaSqm).toFixed(2)}/m²`}
                    className="mt-1"
                  />
                </div>

                {totalAreaSqm > 130 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Property exceeds 130 m². Invoice will show split rates:
                      <ul className="list-disc ml-4 mt-2 text-sm">
                        <li>First 130 m² @ 5% VAT</li>
                        <li>Remaining {(totalAreaSqm - 130).toFixed(0)} m² @ 19% VAT</li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {vatBasis === 'reverse_charge' && (
              <div className="space-y-4">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Reverse Charge Requirements:</strong>
                    <ul className="list-disc ml-4 mt-2 text-sm">
                      <li>Both supplier and customer must be VAT-registered in Cyprus</li>
                      <li>Service must qualify for reverse charge (construction services)</li>
                      <li>Invoice must include legal note about reverse charge</li>
                      <li>Customer becomes liable to account for VAT</li>
                    </ul>
                  </AlertDescription>
                </Alert>

                <div className="flex items-start space-x-2">
                  <Checkbox 
                    id="btoB" 
                    checked={isBtoB}
                    onCheckedChange={(checked) => setIsBtoB(checked as boolean)}
                  />
                  <Label htmlFor="btoB" className="text-sm cursor-pointer">
                    This is a business-to-business transaction
                  </Label>
                </div>

                <div className="flex items-start space-x-2">
                  <Checkbox 
                    id="bothVATReg" 
                    checked={bothVATRegistered}
                    onCheckedChange={(checked) => setBothVATRegistered(checked as boolean)}
                  />
                  <Label htmlFor="bothVATReg" className="text-sm cursor-pointer">
                    Both parties are VAT-registered in Cyprus
                  </Label>
                </div>

                {!isBtoB || !bothVATRegistered && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Reverse charge cannot be applied. Please select a different VAT treatment.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {vatBasis === 'standard19' && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Standard 19% VAT will be applied to the full amount of €{amount.toFixed(2)}.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button 
                onClick={handleCalculate}
                disabled={
                  (vatBasis === 'reverse_charge' && (!isBtoB || !bothVATRegistered)) ||
                  (vatBasis === 'reduced5_renovation' && !isPrivateResidence)
                }
              >
                Calculate VAT <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Review & Confirm */}
      {step === 4 && result && (
        <Card>
          <CardHeader>
            <CardTitle>Step 4: Review & Confirm</CardTitle>
            <CardDescription>
              Please review the VAT calculation before proceeding
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted p-6 rounded-lg space-y-3">
              <div className="flex justify-between text-lg">
                <span className="font-medium">Subtotal:</span>
                <span>€{result.subtotal.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between text-lg">
                <span className="font-medium">VAT ({result.vatRate}%):</span>
                <span>€{result.vatAmount.toFixed(2)}</span>
              </div>
              
              <div className="border-t pt-3 flex justify-between text-2xl font-bold">
                <span>Total:</span>
                <span className="text-primary">€{result.total.toFixed(2)}</span>
              </div>

              <div className="pt-2">
                <Badge variant="outline">{result.vatBasis}</Badge>
              </div>
            </div>

            {result.breakdown && result.breakdown.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">VAT Breakdown:</h4>
                {result.breakdown.map((item, idx) => (
                  <div key={idx} className="text-sm flex justify-between py-1">
                    <span className="text-muted-foreground">{item.description}</span>
                    <span>€{item.amount.toFixed(2)} + €{item.vatAmount.toFixed(2)} VAT</span>
                  </div>
                ))}
              </div>
            )}

            {result.reverseChargeNote && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  <strong>Legal Note:</strong> {result.reverseChargeNote}
                </AlertDescription>
              </Alert>
            )}

            {result.warnings && result.warnings.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Warnings:</strong>
                  <ul className="list-disc ml-4 mt-2 text-sm">
                    {result.warnings.map((warning, idx) => (
                      <li key={idx}>{warning}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <strong>Important:</strong> Invoice must be issued within 30 days of the tax point 
                (usually completion/delivery date) per Cyprus VAT regulations.
              </AlertDescription>
            </Alert>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(3)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button onClick={handleConfirm} className="bg-primary">
                Confirm & Continue <CheckCircle className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default VATWizard;
