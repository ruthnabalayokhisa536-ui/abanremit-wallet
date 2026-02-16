import { supabase } from "@/integrations/supabase/client";
import { transactionPinService } from "../transaction-pin.service";

export interface WithdrawRequest {
  amount: number;
  method: "bank" | "mpesa" | "agent";
  destination: string; // Bank account, M-Pesa number, or agent ID
  pin: string; // Transaction PIN
  agentId?: string; // If withdraw is facilitated by agent
}

export interface WithdrawResponse {
  success: boolean;
  message: string;
  transactionId?: string;
  receiptReference?: string;
  error?: string;
}

/**
 * Withdrawal Service
 * Handles money withdrawals with PIN validation and commission calculation
 */
export const withdrawService = {
  /**
   * Withdraw money from wallet
   */
  async withdraw(request: WithdrawRequest): Promise<WithdrawResponse> {
    try {
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        return {
          success: false,
          message: "User not authenticated",
          error: "AUTH_ERROR",
        };
      }

      // Validate amount
      if (request.amount <= 0) {
        return {
          success: false,
          message: "Amount must be greater than 0",
          error: "INVALID_AMOUNT",
        };
      }

      // Validate transaction PIN
      try {
        const isValidPin = await transactionPinService.validatePin(request.pin);
        if (!isValidPin) {
          return {
            success: false,
            message: "Invalid transaction PIN",
            error: "INVALID_PIN",
          };
        }
      } catch (error: any) {
        return {
          success: false,
          message: error.message || "PIN validation failed",
          error: "PIN_VALIDATION_ERROR",
        };
      }

      // Get user's wallet
      const { data: wallet, error: walletError } = await supabase
        .from("wallets")
        .select("id, balance, wallet_number")
        .eq("user_id", user.id)
        .eq("is_agent_wallet", false)
        .single();

      if (walletError || !wallet) {
        return {
          success: false,
          message: "Wallet not found",
          error: "WALLET_NOT_FOUND",
        };
      }

      // Check sufficient balance
      if (wallet.balance < request.amount) {
        return {
          success: false,
          message: `Insufficient balance. Available: ${wallet.balance}`,
          error: "INSUFFICIENT_BALANCE",
        };
      }

      // Calculate fee (example: 1% of amount, min 10, max 100)
      const fee = Math.min(Math.max(request.amount * 0.01, 10), 100);
      const totalDeduction = request.amount + fee;

      if (wallet.balance < totalDeduction) {
        return {
          success: false,
          message: `Insufficient balance including fee. Required: ${totalDeduction}, Available: ${wallet.balance}`,
          error: "INSUFFICIENT_BALANCE_WITH_FEE",
        };
      }

      // Deduct from wallet
      const { error: deductError } = await supabase
        .from("wallets")
        .update({
          balance: wallet.balance - totalDeduction,
          updated_at: new Date().toISOString(),
        })
        .eq("id", wallet.id);

      if (deductError) {
        console.error("Error deducting from wallet:", deductError);
        return {
          success: false,
          message: "Failed to process withdrawal",
          error: "DEDUCTION_ERROR",
        };
      }

      // Create transaction record
      const { data: transaction, error: txError } = await supabase
        .from("transactions")
        .insert({
          user_id: user.id,
          wallet_id: wallet.id,
          type: "withdraw",
          amount: request.amount,
          fee: fee,
          balance_after: wallet.balance - totalDeduction,
          description: `Withdrawal via ${request.method} to ${request.destination}`,
          reference: request.destination,
          status: "completed",
          agent_id: request.agentId || null,
        })
        .select("id, receipt_reference")
        .single();

      if (txError) {
        console.error("Error creating transaction:", txError);
        // Rollback wallet deduction
        await supabase
          .from("wallets")
          .update({ balance: wallet.balance })
          .eq("id", wallet.id);

        return {
          success: false,
          message: "Failed to record transaction",
          error: "TRANSACTION_ERROR",
        };
      }

      // Calculate and credit commission if agent facilitated
      if (request.agentId) {
        try {
          await supabase.rpc("calculate_and_credit_commission", {
            p_transaction_id: transaction.id,
            p_transaction_type: "withdraw",
            p_amount: request.amount,
            p_agent_id: request.agentId,
          });
        } catch (commError) {
          console.error("Error calculating commission:", commError);
          // Don't fail the withdrawal, just log the error
        }
      }

      return {
        success: true,
        message: `Successfully withdrew ${request.amount}. Fee: ${fee}`,
        transactionId: transaction.id,
        receiptReference: transaction.receipt_reference,
      };
    } catch (error: any) {
      console.error("Withdrawal error:", error);
      return {
        success: false,
        message: "An error occurred while processing withdrawal",
        error: error.message,
      };
    }
  },

  /**
   * Get withdrawal history
   */
  async getWithdrawalHistory(limit = 50): Promise<any[]> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return [];

      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.user.id)
        .eq("type", "withdraw")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("Error fetching withdrawal history:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("Error fetching withdrawal history:", error);
      return [];
    }
  },
};

export default withdrawService;
