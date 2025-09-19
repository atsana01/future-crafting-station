/**
 * Formats a full name to show FirstName LastInitial for privacy
 * Example: "John Smith" becomes "John S."
 */
export const formatPrivateName = (fullName: string): string => {
  if (!fullName?.trim()) return 'Anonymous';
  
  const parts = fullName.trim().split(' ');
  if (parts.length === 1) return parts[0];
  
  const firstName = parts[0];
  const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
  
  return `${firstName} ${lastInitial}.`;
};

/**
 * Safely extracts initials from a name
 */
export const getInitials = (name: string): string => {
  if (!name?.trim()) return '?';
  
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
};