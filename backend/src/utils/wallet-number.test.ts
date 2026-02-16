import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  isValidUserWalletNumber,
  isValidAgentWalletNumber,
  formatWalletNumber,
  extractSequenceNumber,
  USER_WALLET_PREFIX,
  AGENT_WALLET_PREFIX,
} from './wallet-number';

/**
 * Property-Based Tests for Wallet Number Format Validation
 * 
 * These tests validate Requirements 2.1 and 2.2 from the design document:
 * - Property 1: User Wallet Number Format
 * - Property 2: Agent Wallet Number Format
 */

describe('Feature: standalone-postgresql-backend, Property 1: User Wallet Number Format', () => {
  it('should match pattern WLT888\\d{5} for any user wallet created with approved KYC', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 99999 }), // Generate sequence numbers 0-99999
        (sequence) => {
          const walletNumber = formatWalletNumber(false, sequence);
          
          // Validate format: WLT888 followed by exactly 5 digits
          expect(walletNumber).toMatch(/^WLT888\d{5}$/);
          expect(isValidUserWalletNumber(walletNumber)).toBe(true);
          
          // Validate structure
          expect(walletNumber).toHaveLength(11); // WLT888 (6) + 5 digits
          expect(walletNumber.startsWith(USER_WALLET_PREFIX)).toBe(true);
          
          // Validate sequence is properly padded
          const extractedSequence = extractSequenceNumber(walletNumber);
          expect(extractedSequence).toBe(sequence);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject wallet numbers that do not match user wallet format', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.string(), // Random strings
          fc.constant('WLT777'), // Agent prefix without digits
          fc.constant('WLT888'), // User prefix without digits
          fc.constant('WLT888123456'), // Too many digits
          fc.constant('WLT8881234'), // Too few digits
          fc.constant('WLT888abcde'), // Non-numeric suffix
          fc.constant('wlt88800001'), // Wrong case
          fc.constant('WLT88800001 '), // Trailing space
          fc.constant(' WLT88800001'), // Leading space
        ),
        (invalidWalletNumber) => {
          // Skip if it happens to be a valid format
          if (/^WLT888\d{5}$/.test(invalidWalletNumber)) {
            return true;
          }
          
          expect(isValidUserWalletNumber(invalidWalletNumber)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Feature: standalone-postgresql-backend, Property 2: Agent Wallet Number Format', () => {
  it('should match pattern WLT777\\d{5} for any agent wallet created', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 99999 }), // Generate sequence numbers 0-99999
        (sequence) => {
          const walletNumber = formatWalletNumber(true, sequence);
          
          // Validate format: WLT777 followed by exactly 5 digits
          expect(walletNumber).toMatch(/^WLT777\d{5}$/);
          expect(isValidAgentWalletNumber(walletNumber)).toBe(true);
          
          // Validate structure
          expect(walletNumber).toHaveLength(11); // WLT777 (6) + 5 digits
          expect(walletNumber.startsWith(AGENT_WALLET_PREFIX)).toBe(true);
          
          // Validate sequence is properly padded
          const extractedSequence = extractSequenceNumber(walletNumber);
          expect(extractedSequence).toBe(sequence);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject wallet numbers that do not match agent wallet format', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.string(), // Random strings
          fc.constant('WLT888'), // User prefix without digits
          fc.constant('WLT777'), // Agent prefix without digits
          fc.constant('WLT777123456'), // Too many digits
          fc.constant('WLT7771234'), // Too few digits
          fc.constant('WLT777abcde'), // Non-numeric suffix
          fc.constant('wlt77700001'), // Wrong case
          fc.constant('WLT77700001 '), // Trailing space
          fc.constant(' WLT77700001'), // Leading space
        ),
        (invalidWalletNumber) => {
          // Skip if it happens to be a valid format
          if (/^WLT777\d{5}$/.test(invalidWalletNumber)) {
            return true;
          }
          
          expect(isValidAgentWalletNumber(invalidWalletNumber)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Wallet Number Format - Additional Properties', () => {
  it('should ensure user and agent wallet numbers are mutually exclusive', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 9999 }),
        (sequence) => {
          const userWallet = formatWalletNumber(false, sequence);
          const agentWallet = formatWalletNumber(true, sequence);
          
          // User wallet should not be valid as agent wallet
          expect(isValidAgentWalletNumber(userWallet)).toBe(false);
          
          // Agent wallet should not be valid as user wallet
          expect(isValidUserWalletNumber(agentWallet)).toBe(false);
          
          // They should be different
          expect(userWallet).not.toBe(agentWallet);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should properly pad sequence numbers with leading zeros', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 999 }), // Test small numbers that need padding
        (sequence) => {
          const userWallet = formatWalletNumber(false, sequence);
          const agentWallet = formatWalletNumber(true, sequence);
          
          // Both should have exactly 11 characters
          expect(userWallet).toHaveLength(11);
          expect(agentWallet).toHaveLength(11);
          
          // Extract and verify sequence
          const userSeq = extractSequenceNumber(userWallet);
          const agentSeq = extractSequenceNumber(agentWallet);
          
          expect(userSeq).toBe(sequence);
          expect(agentSeq).toBe(sequence);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle boundary values correctly', () => {
    // Test minimum value (0)
    const minUserWallet = formatWalletNumber(false, 0);
    expect(minUserWallet).toBe('WLT88800000');
    expect(isValidUserWalletNumber(minUserWallet)).toBe(true);
    
    const minAgentWallet = formatWalletNumber(true, 0);
    expect(minAgentWallet).toBe('WLT77700000');
    expect(isValidAgentWalletNumber(minAgentWallet)).toBe(true);
    
    // Test maximum value (99999)
    const maxUserWallet = formatWalletNumber(false, 99999);
    expect(maxUserWallet).toBe('WLT88899999');
    expect(isValidUserWalletNumber(maxUserWallet)).toBe(true);
    
    const maxAgentWallet = formatWalletNumber(true, 99999);
    expect(maxAgentWallet).toBe('WLT77799999');
    expect(isValidAgentWalletNumber(maxAgentWallet)).toBe(true);
  });
});

/**
 * Unit Tests for Specific Examples
 */
describe('Wallet Number Format - Unit Tests', () => {
  describe('User Wallet Numbers', () => {
    it('should validate correct user wallet numbers', () => {
      expect(isValidUserWalletNumber('WLT88800001')).toBe(true);
      expect(isValidUserWalletNumber('WLT88800000')).toBe(true);
      expect(isValidUserWalletNumber('WLT88809999')).toBe(true);
      expect(isValidUserWalletNumber('WLT88801234')).toBe(true);
    });

    it('should reject invalid user wallet numbers', () => {
      expect(isValidUserWalletNumber('WLT77700001')).toBe(false); // Agent prefix
      expect(isValidUserWalletNumber('WLT888001')).toBe(false); // Too few digits
      expect(isValidUserWalletNumber('WLT88800001 ')).toBe(false); // Trailing space
      expect(isValidUserWalletNumber('WLT888abcd')).toBe(false); // Non-numeric
      expect(isValidUserWalletNumber('wlt88800001')).toBe(false); // Wrong case
      expect(isValidUserWalletNumber('')).toBe(false); // Empty string
    });
  });

  describe('Agent Wallet Numbers', () => {
    it('should validate correct agent wallet numbers', () => {
      expect(isValidAgentWalletNumber('WLT77700001')).toBe(true);
      expect(isValidAgentWalletNumber('WLT77700000')).toBe(true);
      expect(isValidAgentWalletNumber('WLT77709999')).toBe(true);
      expect(isValidAgentWalletNumber('WLT77701234')).toBe(true);
    });

    it('should reject invalid agent wallet numbers', () => {
      expect(isValidAgentWalletNumber('WLT88800001')).toBe(false); // User prefix
      expect(isValidAgentWalletNumber('WLT777001')).toBe(false); // Too few digits
      expect(isValidAgentWalletNumber('WLT77700001 ')).toBe(false); // Trailing space
      expect(isValidAgentWalletNumber('WLT777abcd')).toBe(false); // Non-numeric
      expect(isValidAgentWalletNumber('wlt77700001')).toBe(false); // Wrong case
      expect(isValidAgentWalletNumber('')).toBe(false); // Empty string
    });
  });

  describe('formatWalletNumber', () => {
    it('should format user wallet numbers correctly', () => {
      expect(formatWalletNumber(false, 1)).toBe('WLT88800001');
      expect(formatWalletNumber(false, 0)).toBe('WLT88800000');
      expect(formatWalletNumber(false, 9999)).toBe('WLT88809999');
      expect(formatWalletNumber(false, 42)).toBe('WLT88800042');
    });

    it('should format agent wallet numbers correctly', () => {
      expect(formatWalletNumber(true, 1)).toBe('WLT77700001');
      expect(formatWalletNumber(true, 0)).toBe('WLT77700000');
      expect(formatWalletNumber(true, 9999)).toBe('WLT77709999');
      expect(formatWalletNumber(true, 42)).toBe('WLT77700042');
    });
  });

  describe('extractSequenceNumber', () => {
    it('should extract sequence from valid user wallet numbers', () => {
      expect(extractSequenceNumber('WLT88800001')).toBe(1);
      expect(extractSequenceNumber('WLT88800000')).toBe(0);
      expect(extractSequenceNumber('WLT88809999')).toBe(9999);
      expect(extractSequenceNumber('WLT88800042')).toBe(42);
    });

    it('should extract sequence from valid agent wallet numbers', () => {
      expect(extractSequenceNumber('WLT77700001')).toBe(1);
      expect(extractSequenceNumber('WLT77700000')).toBe(0);
      expect(extractSequenceNumber('WLT77709999')).toBe(9999);
      expect(extractSequenceNumber('WLT77700042')).toBe(42);
    });

    it('should return null for invalid wallet numbers', () => {
      expect(extractSequenceNumber('invalid')).toBe(null);
      expect(extractSequenceNumber('WLT888001')).toBe(null);
      expect(extractSequenceNumber('')).toBe(null);
    });
  });
});
