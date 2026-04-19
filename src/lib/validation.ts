/**
 * Celtronics V12 Validation Engine
 * Implements strict B2B security protocols.
 */

/**
 * Validates Polish NIP (Tax Identification Number).
 * Must be 10 digits.
 */
export function validateNip(nip: string): boolean {
  const cleaned = nip.replace(/\D/g, "");
  if (cleaned.length !== 10) return false;
  
  const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned[i]) * weights[i];
  }
  
  const control = sum % 11;
  return control === parseInt(cleaned[9]);
}

/**
 * Calculates Password Entropy/Strength (0-4).
 */
export function calculatePasswordStrength(password: string): number {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score;
}

/**
 * Validates E-mail format.
 */
export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
