// Utility functions for formatting data across the application

/**
 * Formats a budget range array into a readable string
 */
export const formatBudgetRange = (budget: [number, number] | null | undefined): string => {
  if (!budget || !Array.isArray(budget) || budget.length !== 2) {
    return 'Budget not specified';
  }
  
  const [min, max] = budget;
  
  const formatAmount = (amount: number): string => {
    if (amount >= 1000000) return `€${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `€${(amount / 1000)}K`;
    return `€${amount}`;
  };
  
  return `${formatAmount(min)} - ${formatAmount(max)}`;
};

/**
 * Formats timeline in months to readable string
 */
export const formatTimeline = (deliveryTime: number | null | undefined): string => {
  if (!deliveryTime) return 'Timeline not specified';
  return `${deliveryTime} months`;
};

/**
 * Formats location with fallback
 */
export const formatLocation = (location: string | null | undefined): string => {
  return location || 'Location not specified';
};

/**
 * Formats client name for vendor display (privacy protection)
 */
export const formatClientName = (fullName: string | null | undefined): string => {
  if (!fullName) return 'Client';
  
  const names = fullName.trim().split(' ');
  if (names.length === 1) return names[0];
  
  const firstName = names[0];
  const lastNameInitial = names[names.length - 1].charAt(0);
  return `${firstName} ${lastNameInitial}.`;
};