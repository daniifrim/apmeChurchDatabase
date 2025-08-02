/**
 * User utility functions for consistent user-related operations
 */

/**
 * Get user initials from first and last name
 * @param firstName - User's first name
 * @param lastName - User's last name
 * @returns Uppercase initials or 'U' if no names provided
 */
export const getUserInitials = (
  firstName?: string | null,
  lastName?: string | null
): string => {
  const first = firstName?.trim()[0] || '';
  const last = lastName?.trim()[0] || '';
  return (first + last).toUpperCase() || 'U';
};

/**
 * Format user display name from first and last name
 * @param firstName - User's first name
 * @param lastName - User's last name
 * @param email - Fallback email if names not available
 * @returns Formatted display name
 */
export const getUserDisplayName = (
  firstName?: string | null,
  lastName?: string | null,
  email?: string | null
): string => {
  if (firstName && lastName) {
    return `${firstName} ${lastName}`.trim();
  }
  if (firstName) {
    return firstName;
  }
  if (lastName) {
    return lastName;
  }
  return email || 'User';
};

/**
 * Format role display name from role string
 * @param role - User role string
 * @returns Formatted role name
 */
export const getRoleDisplayName = (role?: string | null): string => {
  if (!role) return 'User';
  
  const roleMap: Record<string, string> = {
    administrator: 'Administrator',
    mobilizer: 'Mobilizer',
    missionary: 'Missionary',
  };
  
  return roleMap[role.toLowerCase()] || role.charAt(0).toUpperCase() + role.slice(1);
};