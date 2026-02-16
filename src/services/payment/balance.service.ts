import { supabase } from "@/integrations/supabase/client";

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
};
