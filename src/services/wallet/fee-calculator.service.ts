/**
 * Fee Calculator Service
 * 
 * Provides utility functions for calculating transaction fees for wallet-to-wallet transfers.
 * Fee calculation follows the formula: max(5, min(50, amount * 0.005))
 * 
 * Requirements: 6.1, 6.2, 6.3, 3.1
 */

/**
 * Calculate the transaction fee for a wallet-to-wallet transfer
 * 
 * Fee formula: 0.5% of transfer amount with minimum 5 and maximum 50
 * - Minimum fee: 5 (when amount * 0.005 < 5)
 * - Maximum fee: 50 (when amount * 0.005 > 50)
 * - Otherwise: amount * 0.005
 * 
 * @param amount - The transfer amount
 * @returns The calculated fee
 * 
 * @example
 * calculateTransferFee(100)    // Returns 5 (minimum)
 * calculateTransferFee(2000)   // Returns 10 (2000 * 0.005)
 * calculateTransferFee(15000)  // Returns 50 (maximum)
 */
export function calculateTransferFee(amount: number): number {
  const feePercentage = 0.005; // 0.5%
  const minFee = 5;
  const maxFee = 50;
  
  const calculatedFee = amount * feePercentage;
  
  return Math.max(minFee, Math.min(maxFee, calculatedFee));
}

/**
 * Calculate the total deduction from sender's wallet
 * 
 * Total deduction = transfer amount + transaction fee
 * 
 * @param amount - The transfer amount
 * @returns The total amount to be deducted (amount + fee)
 * 
 * @example
 * calculateTotalDeduction(100)   // Returns 105 (100 + 5)
 * calculateTotalDeduction(2000)  // Returns 2010 (2000 + 10)
 * calculateTotalDeduction(15000) // Returns 15050 (15000 + 50)
 */
export function calculateTotalDeduction(amount: number): number {
  const fee = calculateTransferFee(amount);
  return amount + fee;
}

/**
 * Get detailed fee breakdown for a transfer
 * 
 * @param amount - The transfer amount
 * @returns Object containing amount, fee, and total
 * 
 * @example
 * getFeeBreakdown(2000)
 * // Returns: { amount: 2000, fee: 10, total: 2010 }
 */
export function getFeeBreakdown(amount: number): {
  amount: number;
  fee: number;
  total: number;
} {
  const fee = calculateTransferFee(amount);
  const total = amount + fee;
  
  return {
    amount,
    fee,
    total
  };
}
