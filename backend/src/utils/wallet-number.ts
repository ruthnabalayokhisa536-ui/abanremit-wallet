/**
 * Wallet number generation utilities
 * 
 * User wallets: WLT888 + 5-digit sequence (WLT88800001, WLT88800002, ...)
 * Agent wallets: WLT777 + 5-digit sequence (WLT77700001, WLT77700002, ...)
 */

export const USER_WALLET_PREFIX = 'WLT888';
export const AGENT_WALLET_PREFIX = 'WLT777';

/**
 * Validates if a wallet number matches the user wallet format
 * @param walletNumber - The wallet number to validate
 * @returns true if valid user wallet format, false otherwise
 */
export function isValidUserWalletNumber(walletNumber: string): boolean {
  const pattern = /^WLT888\d{5}$/;
  return pattern.test(walletNumber);
}

/**
 * Validates if a wallet number matches the agent wallet format
 * @param walletNumber - The wallet number to validate
 * @returns true if valid agent wallet format, false otherwise
 */
export function isValidAgentWalletNumber(walletNumber: string): boolean {
  const pattern = /^WLT777\d{5}$/;
  return pattern.test(walletNumber);
}

/**
 * Generates a wallet number from a sequence number
 * @param isAgent - Whether this is an agent wallet
 * @param sequence - The sequence number (will be padded to 5 digits)
 * @returns The formatted wallet number
 */
export function formatWalletNumber(isAgent: boolean, sequence: number): string {
  const prefix = isAgent ? AGENT_WALLET_PREFIX : USER_WALLET_PREFIX;
  const paddedSequence = sequence.toString().padStart(5, '0');
  return `${prefix}${paddedSequence}`;
}

/**
 * Extracts the sequence number from a wallet number
 * @param walletNumber - The wallet number
 * @returns The sequence number, or null if invalid format
 */
export function extractSequenceNumber(walletNumber: string): number | null {
  if (!isValidUserWalletNumber(walletNumber) && !isValidAgentWalletNumber(walletNumber)) {
    return null;
  }
  const sequenceStr = walletNumber.slice(-5);
  return parseInt(sequenceStr, 10);
}
