/**
 * Utility functions for conditional form logic
 */

/**
 * Check if text contains garden/landscaping related keywords
 */
export const hasLandscapingKeywords = (text: string): boolean => {
  if (!text) return false;
  
  const landscapingKeywords = [
    'garden', 'yard', 'patio', 'landscape', 'landscaping',
    'outdoor', 'backyard', 'frontyard', 'deck', 'lawn',
    'plants', 'trees', 'grass', 'irrigation', 'sprinkler',
    'pergola', 'gazebo', 'fence', 'fencing', 'outdoor space'
  ];
  
  const lowerText = text.toLowerCase();
  return landscapingKeywords.some(keyword => lowerText.includes(keyword));
};

/**
 * Check if text contains bathroom related keywords
 */
export const hasBathroomKeywords = (text: string): boolean => {
  if (!text) return false;
  
  const bathroomKeywords = [
    'bathroom', 'bath', 'shower', 'toilet', 'washroom',
    'wc', 'powder room', 'ensuite', 'en-suite', 'lavatory'
  ];
  
  const lowerText = text.toLowerCase();
  return bathroomKeywords.some(keyword => lowerText.includes(keyword));
};

/**
 * Check if user owns buildable land (for Real Estate category logic)
 */
export const shouldShowRealEstate = (formData: any): boolean => {
  // Show Real Estate category only if user answered "No" to owning buildable land
  return formData?.ownsBuildableLand === false || formData?.ownsBuildableLand === 'no';
};

/**
 * Check if landscaping services should be shown
 */
export const shouldShowLandscaping = (projectDescription: string, formData?: any): boolean => {
  return hasLandscapingKeywords(projectDescription) || 
         (formData && hasLandscapingKeywords(JSON.stringify(formData)));
};