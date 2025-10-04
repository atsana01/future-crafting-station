/**
 * Cyprus VAT Calculator
 * 
 * Implements Cyprus VAT rules for construction and renovation services:
 * - Standard rate: 19%
 * - Reduced rate (renovation): 5% for private dwellings ≥3 years old, materials ≤50%
 * - Reduced rate (primary residence): 5% for first 130m², 19% for remainder
 * - Reverse charge: B2B construction services (0% with mandatory note)
 * 
 * References:
 * - Cyprus VAT Act
 * - EU VAT Directive Art. 47 (place of supply for immovable property)
 * - Cyprus Ministry of Finance circulars on reduced rates
 */

export interface VATResult {
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  total: number;
  vatBasis: 'standard19' | 'reduced5_renovation' | 'reduced5_primary_residence' | 'reverse_charge';
  breakdown?: VATBreakdown[];
  warnings?: string[];
  reverseChargeNote?: string;
}

export interface VATBreakdown {
  description: string;
  amount: number;
  vatRate: number;
  vatAmount: number;
}

export interface RenovationVATParams {
  amount: number;
  dwellingAgeYears: number;
  materialsPercentage: number;
}

export interface PrimaryResidenceVATParams {
  amount: number;
  totalAreaSqm: number;
  pricePerSqm?: number;
}

/**
 * Calculate standard 19% VAT
 */
export function calculateStandardVAT(amount: number): VATResult {
  const subtotal = amount;
  const vatRate = 19;
  const vatAmount = (amount * vatRate) / 100;
  const total = amount + vatAmount;

  return {
    subtotal,
    vatRate,
    vatAmount: parseFloat(vatAmount.toFixed(2)),
    total: parseFloat(total.toFixed(2)),
    vatBasis: 'standard19'
  };
}

/**
 * Calculate 5% reduced VAT for renovation of private dwellings
 * 
 * Conditions:
 * - Private residence (not commercial)
 * - Building ≥ 3 years from first occupation
 * - Materials cost ≤ 50% of total value
 * - Repairs, renovation, alteration (and extensions since 20 Aug 2020)
 * 
 * @param params - Renovation parameters
 * @returns VAT calculation result with warnings if conditions not met
 */
export function calculateRenovationVAT(params: RenovationVATParams): VATResult {
  const { amount, dwellingAgeYears, materialsPercentage } = params;
  const warnings: string[] = [];

  // Check eligibility
  if (dwellingAgeYears < 3) {
    warnings.push('Dwelling must be at least 3 years old for reduced rate. Using standard 19% rate.');
    return { ...calculateStandardVAT(amount), warnings };
  }

  if (materialsPercentage > 50) {
    warnings.push('Materials exceed 50% of total value. Using standard 19% rate.');
    return { ...calculateStandardVAT(amount), warnings };
  }

  // Apply 5% reduced rate
  const subtotal = amount;
  const vatRate = 5;
  const vatAmount = (amount * vatRate) / 100;
  const total = amount + vatAmount;

  return {
    subtotal,
    vatRate,
    vatAmount: parseFloat(vatAmount.toFixed(2)),
    total: parseFloat(total.toFixed(2)),
    vatBasis: 'reduced5_renovation',
    warnings
  };
}

/**
 * Calculate VAT for primary residence construction (mixed rates)
 * 
 * Conditions:
 * - First 130 m² at 5%
 * - Remainder at 19%
 * - Subject to value/size limits
 * 
 * @param params - Primary residence parameters
 * @returns VAT calculation result with breakdown
 */
export function calculatePrimaryResidenceVAT(params: PrimaryResidenceVATParams): VATResult {
  const { amount, totalAreaSqm, pricePerSqm } = params;
  const warnings: string[] = [];
  const breakdown: VATBreakdown[] = [];

  const REDUCED_AREA_LIMIT = 130; // m²
  const reducedAreaApplicable = Math.min(totalAreaSqm, REDUCED_AREA_LIMIT);
  const standardAreaApplicable = Math.max(0, totalAreaSqm - REDUCED_AREA_LIMIT);

  // Calculate price per sqm if not provided
  const effectivePricePerSqm = pricePerSqm || (amount / totalAreaSqm);

  // Amount for first 130m² (5% VAT)
  const reducedAmount = reducedAreaApplicable * effectivePricePerSqm;
  const reducedVat = (reducedAmount * 5) / 100;

  breakdown.push({
    description: `First ${reducedAreaApplicable.toFixed(0)} m² @ 5% VAT`,
    amount: reducedAmount,
    vatRate: 5,
    vatAmount: reducedVat
  });

  // Amount for remainder (19% VAT)
  let standardVat = 0;
  if (standardAreaApplicable > 0) {
    const standardAmount = standardAreaApplicable * effectivePricePerSqm;
    standardVat = (standardAmount * 19) / 100;

    breakdown.push({
      description: `Remaining ${standardAreaApplicable.toFixed(0)} m² @ 19% VAT`,
      amount: standardAmount,
      vatRate: 19,
      vatAmount: standardVat
    });

    warnings.push(
      `Property exceeds 130 m². First 130 m² charged at 5%, remaining ${standardAreaApplicable.toFixed(0)} m² at 19%.`
    );
  }

  const totalVat = reducedVat + standardVat;
  const effectiveVatRate = (totalVat / amount) * 100;

  return {
    subtotal: amount,
    vatRate: parseFloat(effectiveVatRate.toFixed(2)),
    vatAmount: parseFloat(totalVat.toFixed(2)),
    total: parseFloat((amount + totalVat).toFixed(2)),
    vatBasis: 'reduced5_primary_residence',
    breakdown,
    warnings
  };
}

/**
 * Apply reverse charge mechanism (B2B construction services)
 * 
 * When applicable, VAT is accounted for by the recipient (B2B construction services).
 * Invoice shows 0% VAT with mandatory note.
 * 
 * Conditions (vendor should verify):
 * - Both parties registered for VAT
 * - Specific construction services
 * - Domestic (Cyprus) supply
 * 
 * @param amount - Invoice amount
 * @returns VAT result with reverse charge note
 */
export function applyReverseCharge(amount: number): VATResult {
  return {
    subtotal: amount,
    vatRate: 0,
    vatAmount: 0,
    total: amount,
    vatBasis: 'reverse_charge',
    reverseChargeNote:
      'VAT to be accounted for by the recipient under the domestic reverse charge mechanism (Article 13(2)(b) of the Cyprus VAT Law). Both parties must be registered for VAT in Cyprus.',
    warnings: [
      'Reverse charge: Ensure both parties are VAT-registered and service qualifies for reverse charge.'
    ]
  };
}

/**
 * Helper function to validate Cyprus property location
 */
export function isCyprusProperty(location: string): boolean {
  const cyprusKeywords = ['cyprus', 'κύπρος', 'nicosia', 'limassol', 'larnaca', 'paphos', 'famagusta', 'kyrenia'];
  const normalized = location.toLowerCase();
  return cyprusKeywords.some(keyword => normalized.includes(keyword));
}

/**
 * Get appropriate VAT calculator based on scenario
 */
export function getVATCalculator(vatBasis: VATResult['vatBasis']) {
  switch (vatBasis) {
    case 'standard19':
      return calculateStandardVAT;
    case 'reduced5_renovation':
      return (amount: number, params?: RenovationVATParams) =>
        calculateRenovationVAT(params || { amount, dwellingAgeYears: 3, materialsPercentage: 0 });
    case 'reduced5_primary_residence':
      return (amount: number, params?: PrimaryResidenceVATParams) =>
        calculatePrimaryResidenceVAT(params || { amount, totalAreaSqm: 130 });
    case 'reverse_charge':
      return applyReverseCharge;
    default:
      return calculateStandardVAT;
  }
}

/**
 * Validate VAT calculation meets Cyprus regulations
 */
export function validateVATCalculation(result: VATResult): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // VAT rates must be exactly 0%, 5%, or 19%
  if (![0, 5, 19].includes(result.vatRate) && result.vatBasis !== 'reduced5_primary_residence') {
    errors.push(`Invalid VAT rate: ${result.vatRate}%. Must be 0%, 5%, or 19%.`);
  }

  // Total must equal subtotal + VAT
  const calculatedTotal = result.subtotal + result.vatAmount;
  if (Math.abs(calculatedTotal - result.total) > 0.01) {
    errors.push(`Total amount mismatch: ${result.total} ≠ ${calculatedTotal.toFixed(2)}`);
  }

  // Reverse charge must have 0% VAT
  if (result.vatBasis === 'reverse_charge' && result.vatAmount !== 0) {
    errors.push('Reverse charge invoices must have 0 VAT amount.');
  }

  // Reverse charge must have note
  if (result.vatBasis === 'reverse_charge' && !result.reverseChargeNote) {
    errors.push('Reverse charge invoices must include a legal note.');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Format VAT result for display
 */
export function formatVATResult(result: VATResult): string {
  let output = `Subtotal: €${result.subtotal.toFixed(2)}\n`;
  output += `VAT (${result.vatRate}%): €${result.vatAmount.toFixed(2)}\n`;
  output += `Total: €${result.total.toFixed(2)}\n`;
  output += `Basis: ${result.vatBasis}\n`;

  if (result.breakdown && result.breakdown.length > 0) {
    output += '\nBreakdown:\n';
    result.breakdown.forEach(item => {
      output += `  ${item.description}: €${item.amount.toFixed(2)} + €${item.vatAmount.toFixed(2)} VAT\n`;
    });
  }

  if (result.reverseChargeNote) {
    output += `\nNote: ${result.reverseChargeNote}\n`;
  }

  if (result.warnings && result.warnings.length > 0) {
    output += '\nWarnings:\n';
    result.warnings.forEach(warning => {
      output += `  ⚠️ ${warning}\n`;
    });
  }

  return output;
}
