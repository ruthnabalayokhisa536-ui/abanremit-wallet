import { describe, it, expect } from 'vitest';
import {
  calculateTransferFee,
  calculateTotalDeduction,
  getFeeBreakdown
} from './fee-calculator.service';

describe('Fee Calculator Service', () => {
  describe('calculateTransferFee', () => {
    it('should apply minimum fee of 5 for small amounts', () => {
      expect(calculateTransferFee(100)).toBe(5);
      expect(calculateTransferFee(500)).toBe(5);
      expect(calculateTransferFee(999)).toBe(5);
    });

    it('should calculate 0.5% fee for mid-range amounts', () => {
      expect(calculateTransferFee(2000)).toBe(10);
      expect(calculateTransferFee(4000)).toBe(20);
      expect(calculateTransferFee(6000)).toBe(30);
    });

    it('should apply maximum fee of 50 for large amounts', () => {
      expect(calculateTransferFee(15000)).toBe(50);
      expect(calculateTransferFee(20000)).toBe(50);
      expect(calculateTransferFee(100000)).toBe(50);
    });

    it('should handle boundary cases correctly', () => {
      // Exactly at minimum threshold (1000 * 0.005 = 5)
      expect(calculateTransferFee(1000)).toBe(5);
      
      // Just above minimum threshold
      expect(calculateTransferFee(1001)).toBeCloseTo(5.005, 2);
      
      // Exactly at maximum threshold (10000 * 0.005 = 50)
      expect(calculateTransferFee(10000)).toBe(50);
      
      // Just below maximum threshold
      expect(calculateTransferFee(9999)).toBeCloseTo(49.995, 2);
    });

    it('should handle zero and very small amounts', () => {
      expect(calculateTransferFee(0)).toBe(5);
      expect(calculateTransferFee(1)).toBe(5);
      expect(calculateTransferFee(10)).toBe(5);
    });

    it('should handle decimal amounts correctly', () => {
      expect(calculateTransferFee(2500.50)).toBeCloseTo(12.5025, 2);
      expect(calculateTransferFee(5000.75)).toBeCloseTo(25.00375, 2);
    });
  });

  describe('calculateTotalDeduction', () => {
    it('should return amount plus minimum fee for small amounts', () => {
      expect(calculateTotalDeduction(100)).toBe(105);
      expect(calculateTotalDeduction(500)).toBe(505);
    });

    it('should return amount plus calculated fee for mid-range amounts', () => {
      expect(calculateTotalDeduction(2000)).toBe(2010);
      expect(calculateTotalDeduction(4000)).toBe(4020);
    });

    it('should return amount plus maximum fee for large amounts', () => {
      expect(calculateTotalDeduction(15000)).toBe(15050);
      expect(calculateTotalDeduction(100000)).toBe(100050);
    });

    it('should handle decimal amounts correctly', () => {
      expect(calculateTotalDeduction(2500.50)).toBeCloseTo(2513.0025, 2);
    });
  });

  describe('getFeeBreakdown', () => {
    it('should return correct breakdown for small amounts', () => {
      const breakdown = getFeeBreakdown(100);
      expect(breakdown).toEqual({
        amount: 100,
        fee: 5,
        total: 105
      });
    });

    it('should return correct breakdown for mid-range amounts', () => {
      const breakdown = getFeeBreakdown(2000);
      expect(breakdown).toEqual({
        amount: 2000,
        fee: 10,
        total: 2010
      });
    });

    it('should return correct breakdown for large amounts', () => {
      const breakdown = getFeeBreakdown(15000);
      expect(breakdown).toEqual({
        amount: 15000,
        fee: 50,
        total: 15050
      });
    });

    it('should return correct breakdown with decimal precision', () => {
      const breakdown = getFeeBreakdown(2500.50);
      expect(breakdown.amount).toBe(2500.50);
      expect(breakdown.fee).toBeCloseTo(12.5025, 2);
      expect(breakdown.total).toBeCloseTo(2513.0025, 2);
    });
  });
});
