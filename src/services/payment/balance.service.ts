import { supabase } from "@/integrations/supabase/client";
import { calculateTransferFee } from "@/services/wallet/fee-calculator.service";

/**
 * Balance validation service for real-time balance checks
 */
export const balanceService = {
  /**
   * Check if wallet has sufficient balance for transaction
   */
  async checkSufficientBalance(
    walletId: string,
    amount: number,
    fee: number = 0
  ): Promise<{ sufficient: boolean; currentBalance: number; message: string }> {
    try {
      const totalRequired = amount + fee;

      // Real-time balance check
      const { data: wallet, error } = await supabase
        .from("wallets")
        .select("balance")
        .eq("id", walletId)
        .single();

      if (error || !wallet) {
        return {
          sufficient: false,
          currentBalance: 0,
          message: "Wallet not found",
        };
      }

      const currentBalance = Number(wallet.balance);

      if (currentBalance < totalRequired) {
        return {
          sufficient: false,
          currentBalance,
          message: "Insufficient funds",
        };
      }

      if (currentBalance === 0) {
        return {
          sufficient: false,
          currentBalance: 0,
          message: "Zero balance - insufficient funds",
        };
      }

      return {
        sufficient: true,
        currentBalance,
        message: "Sufficient balance",
      };
    } catch (error) {
      console.error("Balance check error:", error);
      return {
        sufficient: false,
        currentBalance: 0,
        message: "Error checking balance",
      };
    }
  },

  /**
   * Get current wallet balance in real-time
   */
  async getCurrentBalance(walletId: string): Promise<number> {
    try {
      const { data: wallet } = await supabase
        .from("wallets")
        .select("balance")
        .eq("id", walletId)
        .single();

      return wallet ? Number(wallet.balance) : 0;
    } catch (error) {
      console.error("Get balance error:", error);
      return 0;
    }
  },

  /**
   * Format balance display message
   */
  formatBalanceMessage(balance: number, required: number): string {
    if (balance === 0) {
      return "Zero balance - insufficient funds";
    }
    if (balance < required) {
      const shortfall = required - balance;
      return `Insufficient funds. You need KES ${shortfall.toFixed(2)} more`;
    }
    return "Sufficient balance";
  },

  /**
   * Validate balance for wallet-to-wallet transfer
   * 
   * Performs comprehensive validation including:
   * - Zero and negative amount validation
   * - Balance sufficiency check (balance >= amount + fee)
   * - Detailed error messages with amounts
   * 
   * Requirements: 3.2, 3.4, 3.5
   * 
   * @param walletId - The wallet ID to check
   * @param amount - The transfer amount
   * @returns Validation result with detailed error messages
   */
  async validateTransferBalance(
    walletId: string,
    amount: number
  ): Promise<{
    valid: boolean;
    currentBalance?: number;
    fee?: number;
    totalRequired?: number;
    message: string;
  }> {
    try {
      // Validate amount is positive (Requirements 3.4, 3.5)
      if (amount <= 0) {
        return {
          valid: false,
          message: "Amount must be greater than 0",
        };
      }

      // Calculate fee and total required
      const fee = calculateTransferFee(amount);
      const totalRequired = amount + fee;

      // Get current wallet balance
      const { data: wallet, error } = await supabase
        .from("wallets")
        .select("balance")
        .eq("id", walletId)
        .single();

      if (error || !wallet) {
        return {
          valid: false,
          message: "Wallet not found",
        };
      }

      const currentBalance = Number(wallet.balance);

      // Check if balance is sufficient (Requirement 3.2)
      if (currentBalance < totalRequired) {
        const shortfall = totalRequired - currentBalance;
        return {
          valid: false,
          currentBalance,
          fee,
          totalRequired,
          message: `Insufficient balance. Required: KES ${totalRequired.toFixed(
            2
          )} (Amount: KES ${amount.toFixed(2)} + Fee: KES ${fee.toFixed(
            2
          )}), Available: KES ${currentBalance.toFixed(
            2
          )}, Shortfall: KES ${shortfall.toFixed(2)}`,
        };
      }

      return {
        valid: true,
        currentBalance,
        fee,
        totalRequired,
        message: "Sufficient balance for transfer",
      };
    } catch (error) {
      console.error("Transfer balance validation error:", error);
      return {
        valid: false,
        message: "Error validating balance",
      };
    }
  },

  /**
   * Deduct amount from sender's wallet
   * 
   * Atomically deducts the total amount (transfer amount + fee) from the sender's
   * wallet balance and updates the timestamp. Stores the original balance before
   * deduction for potential rollback.
   * 
   * Requirements: 4.1, 4.4
   * 
   * @param walletId - The sender's wallet ID
   * @param amount - The transfer amount
   * @param fee - The transaction fee
   * @returns Result with success status, new balance, and original balance for rollback
   */
  async deductFromSender(
    walletId: string,
    amount: number,
    fee: number
  ): Promise<{
    success: boolean;
    newBalance?: number;
    originalBalance?: number;
    error?: string;
  }> {
    try {
      const totalDeduction = amount + fee;

      // Get current balance first (for rollback)
      const { data: currentWallet, error: fetchError } = await supabase
        .from("wallets")
        .select("balance")
        .eq("id", walletId)
        .single();

      if (fetchError || !currentWallet) {
        return {
          success: false,
          error: "Sender wallet not found",
        };
      }

      const originalBalance = Number(currentWallet.balance);
      const newBalance = originalBalance - totalDeduction;

      // Atomically update balance and timestamp
      const { data: updatedWallet, error: updateError } = await supabase
        .from("wallets")
        .update({
          balance: newBalance,
          updated_at: new Date().toISOString(),
        })
        .eq("id", walletId)
        .select("balance")
        .single();

      if (updateError || !updatedWallet) {
        return {
          success: false,
          error: "Failed to deduct from sender wallet",
        };
      }

      return {
        success: true,
        newBalance: Number(updatedWallet.balance),
        originalBalance,
      };
    } catch (error) {
      console.error("Sender deduction error:", error);
      return {
        success: false,
        error: "Error deducting from sender",
      };
    }
  },

  /**
   * Credit amount to recipient's wallet
   * 
   * Atomically credits the transfer amount to the recipient's wallet balance
   * and updates the timestamp.
   * 
   * Requirements: 4.2, 4.4
   * 
   * @param walletId - The recipient's wallet ID
   * @param amount - The transfer amount to credit
   * @returns Result with success status and new balance
   */
  async creditToRecipient(
    walletId: string,
    amount: number
  ): Promise<{
    success: boolean;
    newBalance?: number;
    error?: string;
  }> {
    try {
      // Get current balance
      const { data: currentWallet, error: fetchError } = await supabase
        .from("wallets")
        .select("balance")
        .eq("id", walletId)
        .single();

      if (fetchError || !currentWallet) {
        return {
          success: false,
          error: "Recipient wallet not found",
        };
      }

      const currentBalance = Number(currentWallet.balance);
      const newBalance = currentBalance + amount;

      // Atomically update balance and timestamp
      const { data: updatedWallet, error: updateError } = await supabase
        .from("wallets")
        .update({
          balance: newBalance,
          updated_at: new Date().toISOString(),
        })
        .eq("id", walletId)
        .select("balance")
        .single();

      if (updateError || !updatedWallet) {
        return {
          success: false,
          error: "Failed to credit recipient wallet",
        };
      }

      return {
        success: true,
        newBalance: Number(updatedWallet.balance),
      };
    } catch (error) {
      console.error("Recipient credit error:", error);
      return {
        success: false,
        error: "Error crediting recipient",
      };
    }
  },

  /**
   * Rollback sender deduction
   * 
   * Restores the sender's wallet to its original balance in case the recipient
   * credit operation fails. This ensures atomicity of the transfer operation.
   * 
   * Requirements: 4.3
   * 
   * @param walletId - The sender's wallet ID
   * @param originalBalance - The balance to restore
   * @returns Result with success status
   */
  async rollbackSenderDeduction(
    walletId: string,
    originalBalance: number
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const { error: updateError } = await supabase
        .from("wallets")
        .update({
          balance: originalBalance,
          updated_at: new Date().toISOString(),
        })
        .eq("id", walletId);

      if (updateError) {
        console.error("CRITICAL: Rollback failed for wallet", walletId, updateError);
        return {
          success: false,
          error: "Failed to rollback sender deduction",
        };
      }

      return {
        success: true,
      };
    } catch (error) {
      console.error("CRITICAL: Rollback error for wallet", walletId, error);
      return {
        success: false,
        error: "Error rolling back sender deduction",
      };
    }
  },
};
