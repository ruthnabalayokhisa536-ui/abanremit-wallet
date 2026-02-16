import { supabase } from "@/integrations/supabase/client";
import { transferService, TransferRequest, TransferResponse } from "./transfer.service";

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
 * 
 * This service now delegates to the enhanced transferService for improved
 * validation, error handling, and rollback capabilities.
 */
export const sendMoneyService = {
  /**
   * Send money to another wallet
   * 
   * Delegates to the enhanced transferService which provides:
   * - Comprehensive validation
   * - Atomic balance updates with rollback
   * - Transaction recording
   * - Agent commission support
   */
  async sendMoney(request: SendMoneyRequest): Promise<SendMoneyResponse> {
    // Delegate to the enhanced transfer service
    const transferRequest: TransferRequest = {
      recipientWalletNumber: request.recipientWalletNumber,
      amount: request.amount,
      description: request.description,
      pin: request.pin,
      agentId: request.agentId,
    };

    const result: TransferResponse = await transferService.executeTransfer(transferRequest);

    // Map the response to SendMoneyResponse format (same structure)
    return {
      success: result.success,
      message: result.message,
      transactionId: result.transactionId,
      receiptReference: result.receiptReference,
      error: result.error,
    };
  },

  /**
   * Get send money history
   * 
   * Delegates to transferService.getTransferHistory()
   */
  async getSendMoneyHistory(limit = 50): Promise<any[]> {
    return transferService.getTransferHistory(limit);
  },

  /**
   * Validate recipient wallet number
   * 
   * Delegates to walletValidatorService
   */
  async validateRecipient(walletNumber: string): Promise<{ valid: boolean; name?: string; error?: string }> {
    try {
      // Get current user's wallet to check for self-transfer
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return {
          valid: false,
          error: "User not authenticated",
        };
      }

      const { data: senderWallet } = await supabase
        .from("wallets")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_agent_wallet", false)
        .single();

      if (!senderWallet) {
        return {
          valid: false,
          error: "Sender wallet not found",
        };
      }

      // Use the wallet validator service
      const { walletValidatorService } = await import("./wallet-validator.service");
      return walletValidatorService.validateRecipient(walletNumber, senderWallet.id);
    } catch (error) {
      return {
        valid: false,
        error: "Error validating wallet",
      };
    }
  },
};

export default sendMoneyService;
