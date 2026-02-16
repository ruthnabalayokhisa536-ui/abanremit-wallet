import { supabase } from "@/integrations/supabase/client";
import { transactionPinService } from "../transaction-pin.service";

export interface SendMoneyRequest {
  recipientWalletNumber: string;
  amount: number;
  description?: string;
  pin: string; // Transaction PIN
  agentId?: string; // If transfer is facilitated by agent
}

export interface SendMoneyResponse {
  success: boolean;
  message: string;
  transactionId?: string;
  receiptReference?: string;
  error?: string;
}

/**
 * Send Money Service
 * Handles peer-to-peer money transfers with PIN validation and commission calculation
 */
export const sendMoneyService = {
  /**
   * Send money to another wallet
   */
  async sendMoney(request: SendMoneyRequest): Promise<SendMoneyResponse> {
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

      // Get sender's wallet
      const { data: senderWallet, error: senderWalletError } = await supabase
        .from("wallets")
        .select("id, balance, wallet_number, user_id")
        .eq("user_id", user.id)
        .eq("is_agent_wallet", false)
        .single();

      if (senderWalletError || !senderWallet) {
        return {
          success: false,
          message: "Sender wallet not found",
          error: "SENDER_WALLET_NOT_FOUND",
        };
      }

      // Get recipient's wallet
      const { data: recipientWallet, error: recipientWalletError } = await supabase
        .from("wallets")
        .select("id, balance, wallet_number, user_id")
        .eq("wallet_number", request.recipientWalletNumber)
        .eq("is_agent_wallet", false)
        .single();

      if (recipientWalletError || !recipientWallet) {
        return {
          success: false,
          message: "Recipient wallet not found. Please check the wallet number.",
          error: "RECIPIENT_WALLET_NOT_FOUND",
        };
      }

      // Check if trying to send to self
      if (senderWallet.id === recipientWallet.id) {
        return {
          success: false,
          message: "Cannot send money to yourself",
          error: "SELF_TRANSFER",
        };
      }

      // Calculate fee (example: 0.5% of amount, min 5, max 50)
      const fee = Math.min(Math.max(request.amount * 0.005, 5), 50);
      const totalDeduction = request.amount + fee;

      // Check sufficient balance
      if (senderWallet.balance < totalDeduction) {
        return {
          success: false,
          message: `Insufficient balance. Required: ${totalDeduction} (Amount: ${request.amount} + Fee: ${fee}), Available: ${senderWallet.balance}`,
          error: "INSUFFICIENT_BALANCE",
        };
      }

      // Deduct from sender
      const { error: deductError } = await supabase
        .from("wallets")
        .update({
          balance: senderWallet.balance - totalDeduction,
          updated_at: new Date().toISOString(),
        })
        .eq("id", senderWallet.id);

      if (deductError) {
        console.error("Error deducting from sender:", deductError);
        return {
          success: false,
          message: "Failed to process transfer",
          error: "DEDUCTION_ERROR",
        };
      }

      // Credit recipient
      const { error: creditError } = await supabase
        .from("wallets")
        .update({
          balance: recipientWallet.balance + request.amount,
          updated_at: new Date().toISOString(),
        })
        .eq("id", recipientWallet.id);

      if (creditError) {
        console.error("Error crediting recipient:", creditError);
        // Rollback sender deduction
        await supabase
          .from("wallets")
          .update({ balance: senderWallet.balance })
          .eq("id", senderWallet.id);

        return {
          success: false,
          message: "Failed to credit recipient",
          error: "CREDIT_ERROR",
        };
      }

      // Create sender transaction record
      const { data: senderTx, error: senderTxError } = await supabase
        .from("transactions")
        .insert({
          user_id: user.id,
          wallet_id: senderWallet.id,
          type: "send_money",
          amount: -request.amount, // Negative for debit
          fee: fee,
          balance_after: senderWallet.balance - totalDeduction,
          description: request.description || `Sent to ${request.recipientWalletNumber}`,
          reference: request.recipientWalletNumber,
          status: "completed",
          agent_id: request.agentId || null,
        })
        .select("id, receipt_reference")
        .single();

      if (senderTxError) {
        console.error("Error creating sender transaction:", senderTxError);
      }

      // Create recipient transaction record
      const { error: recipientTxError } = await supabase
        .from("transactions")
        .insert({
          user_id: recipientWallet.user_id,
          wallet_id: recipientWallet.id,
          type: "receive_money",
          amount: request.amount, // Positive for credit
          fee: 0,
          balance_after: recipientWallet.balance + request.amount,
          description: request.description || `Received from ${senderWallet.wallet_number}`,
          reference: senderWallet.wallet_number,
          status: "completed",
        })
        .select("id");

      if (recipientTxError) {
        console.error("Error creating recipient transaction:", recipientTxError);
      }

      // Calculate and credit commission if agent facilitated
      if (request.agentId && senderTx) {
        try {
          await supabase.rpc("calculate_and_credit_commission", {
            p_transaction_id: senderTx.id,
            p_transaction_type: "send_money",
            p_amount: request.amount,
            p_agent_id: request.agentId,
          });
        } catch (commError) {
          console.error("Error calculating commission:", commError);
          // Don't fail the transfer, just log the error
        }
      }

      return {
        success: true,
        message: `Successfully sent ${request.amount} to ${request.recipientWalletNumber}. Fee: ${fee}`,
        transactionId: senderTx?.id,
        receiptReference: senderTx?.receipt_reference,
      };
    } catch (error: any) {
      console.error("Send money error:", error);
      return {
        success: false,
        message: "An error occurred while processing transfer",
        error: error.message,
      };
    }
  },

  /**
   * Get send money history
   */
  async getSendMoneyHistory(limit = 50): Promise<any[]> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return [];

      const { data, error } = await (supabase as any)
        .from("transactions")
        .select("*")
        .eq("user_id", user.user.id)
        .in("type", ["send_money", "receive_money"])
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("Error fetching send money history:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("Error fetching send money history:", error);
      return [];
    }
  },

  /**
   * Validate recipient wallet number
   */
  async validateRecipient(walletNumber: string): Promise<{ valid: boolean; name?: string; error?: string }> {
    try {
      const { data, error } = await supabase
        .from("wallets")
        .select(`
          wallet_number,
          user_id,
          profiles!inner(full_name)
        `)
        .eq("wallet_number", walletNumber)
        .eq("is_agent_wallet", false)
        .single();

      if (error || !data) {
        return {
          valid: false,
          error: "Wallet not found",
        };
      }

      return {
        valid: true,
        name: (data.profiles as any)?.full_name || "Unknown",
      };
    } catch (error) {
      return {
        valid: false,
        error: "Error validating wallet",
      };
    }
  },
};

export default sendMoneyService;
