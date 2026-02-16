import { supabase } from "@/integrations/supabase/client";
import { walletValidatorService } from "./wallet-validator.service";
import { calculateTransferFee } from "./fee-calculator.service";
import { balanceService } from "../payment/balance.service";
import { transactionRecorderService } from "./transaction-recorder.service";
import { transactionPinService } from "../transaction-pin.service";

/**
 * Transfer Request Interface
 */
export interface TransferRequest {
  recipientWalletNumber: string;
  amount: number;
  description?: string;
  pin: string;
  agentId?: string;
}

/**
 * Transfer Response Interface
 */
export interface TransferResponse {
  success: boolean;
  message: string;
  transactionId?: string;
  receiptReference?: string;
  newBalance?: number;
  error?: string;
}

/**
 * Enhanced Transfer Service
 * 
 * Orchestrates the complete wallet-to-wallet transfer flow with:
 * - Validation phase: wallet validation, amount validation, balance check
 * - Authorization phase: PIN validation
 * - Execution phase: deduct sender, credit recipient, create records
 * - Error handling with rollback on recipient credit failure
 * - Agent commission support
 * 
 * Requirements: 2.1, 2.2, 4.1, 4.2, 4.3, 5.1, 5.3, 7.1, 7.2, 8.1, 9.1, 9.2, 9.3, 9.4, 9.6, 10.1
 */
export const transferService = {
  /**
   * Execute a wallet-to-wallet transfer
   * 
   * This is the main orchestration method that coordinates all phases of the transfer:
   * 1. Validation: Verify user authentication, wallet numbers, amounts, and balances
   * 2. Authorization: Validate transaction PIN
   * 3. Execution: Deduct from sender, credit recipient, create transaction records
   * 4. Commission: Calculate and credit agent commission if applicable
   * 
   * @param request - Transfer request parameters
   * @returns Transfer response with success status and details
   */
  async executeTransfer(request: TransferRequest): Promise<TransferResponse> {
    try {
      // ============================================================
      // VALIDATION PHASE
      // ============================================================

      // Get current user (Requirement 9.1)
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        return {
          success: false,
          message: "User not authenticated",
          error: "AUTH_ERROR",
        };
      }

      // Validate amount (Requirement 3.4, 3.5)
      if (request.amount <= 0) {
        return {
          success: false,
          message: "Amount must be greater than 0",
          error: "INVALID_AMOUNT",
        };
      }

      // Get sender's wallet (Requirement 9.1)
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

      // Validate recipient wallet (Requirements 1.1, 1.2, 1.4, 1.5, 9.2)
      const recipientValidation = await walletValidatorService.validateRecipient(
        request.recipientWalletNumber,
        senderWallet.id
      );

      if (!recipientValidation.valid) {
        return {
          success: false,
          message: recipientValidation.error || "Invalid recipient wallet",
          error: recipientValidation.error === "Cannot send money to yourself" 
            ? "SELF_TRANSFER" 
            : "RECIPIENT_WALLET_NOT_FOUND",
        };
      }

      // Get recipient wallet details (Requirement 9.2)
      const recipientWallet = await walletValidatorService.getWalletDetails(
        request.recipientWalletNumber
      );

      if (!recipientWallet) {
        return {
          success: false,
          message: "Recipient wallet not found. Please check the wallet number.",
          error: "RECIPIENT_WALLET_NOT_FOUND",
        };
      }

      // Calculate fee and validate balance (Requirements 3.1, 3.2, 6.1, 6.2, 6.3)
      const balanceValidation = await balanceService.validateTransferBalance(
        senderWallet.id,
        request.amount
      );

      if (!balanceValidation.valid) {
        return {
          success: false,
          message: balanceValidation.message,
          error: "INSUFFICIENT_BALANCE",
        };
      }

      const fee = balanceValidation.fee!;
      const totalDeduction = balanceValidation.totalRequired!;

      // ============================================================
      // AUTHORIZATION PHASE
      // ============================================================

      // Validate transaction PIN (Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6)
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
        // Handle account locking and other PIN errors (Requirements 2.4, 2.5)
        const errorMessage = error.message || "PIN validation failed";
        
        // Check if account is locked
        if (errorMessage.includes("locked") || errorMessage.includes("too many failed attempts")) {
          return {
            success: false,
            message: "Account locked due to too many failed attempts. Try again later.",
            error: "ACCOUNT_LOCKED",
          };
        }
        
        return {
          success: false,
          message: errorMessage,
          error: "PIN_VALIDATION_ERROR",
        };
      }

      // ============================================================
      // EXECUTION PHASE
      // ============================================================

      // Deduct from sender (Requirements 4.1, 4.4, 9.3)
      const deductionResult = await balanceService.deductFromSender(
        senderWallet.id,
        request.amount,
        fee
      );

      if (!deductionResult.success) {
        return {
          success: false,
          message: deductionResult.error || "Failed to process transfer",
          error: "DEDUCTION_ERROR",
        };
      }

      const senderNewBalance = deductionResult.newBalance!;
      const senderOriginalBalance = deductionResult.originalBalance!;

      // Credit recipient with rollback on failure (Requirements 4.2, 4.3, 4.4, 9.4)
      const creditResult = await balanceService.creditToRecipient(
        recipientWallet.id,
        request.amount
      );

      if (!creditResult.success) {
        console.error("Recipient credit failed, rolling back sender deduction");
        
        // Rollback sender deduction (Requirement 4.3)
        const rollbackResult = await balanceService.rollbackSenderDeduction(
          senderWallet.id,
          senderOriginalBalance
        );

        if (!rollbackResult.success) {
          console.error("CRITICAL: Rollback failed!", rollbackResult.error);
        }

        return {
          success: false,
          message: creditResult.error || "Failed to credit recipient",
          error: "CREDIT_ERROR",
        };
      }

      const recipientNewBalance = creditResult.newBalance!;

      // ============================================================
      // TRANSACTION RECORDING PHASE
      // ============================================================

      let senderTransactionId: string | undefined;
      let receiptReference: string | undefined;

      // Create sender transaction record (Requirements 5.1, 5.2, 5.6, 5.7, 9.5)
      try {
        const senderRecord = await transactionRecorderService.createSenderRecord({
          userId: user.id,
          walletId: senderWallet.id,
          amount: request.amount,
          fee: fee,
          balanceAfter: senderNewBalance,
          recipientWalletNumber: request.recipientWalletNumber,
          description: request.description,
          agentId: request.agentId,
        });

        senderTransactionId = senderRecord.id;
        receiptReference = senderRecord.receipt_reference;
      } catch (error) {
        console.error("Error creating sender transaction record:", error);
        // Don't fail the transfer, just log the error (Requirement 9.5)
      }

      // Create recipient transaction record (Requirements 5.3, 5.4, 5.6, 5.7, 9.5)
      try {
        await transactionRecorderService.createRecipientRecord({
          userId: recipientWallet.user_id,
          walletId: recipientWallet.id,
          amount: request.amount,
          balanceAfter: recipientNewBalance,
          senderWalletNumber: senderWallet.wallet_number,
          description: request.description,
        });
      } catch (error) {
        console.error("Error creating recipient transaction record:", error);
        // Don't fail the transfer, just log the error (Requirement 9.5)
      }

      // ============================================================
      // COMMISSION PHASE (if agent facilitated)
      // ============================================================

      // Calculate and credit agent commission (Requirements 7.1, 7.2, 7.3, 7.4)
      if (request.agentId && senderTransactionId) {
        try {
          await supabase.rpc("calculate_and_credit_commission", {
            p_transaction_id: senderTransactionId,
            p_transaction_type: "send_money",
            p_amount: request.amount,
            p_agent_id: request.agentId,
          });
        } catch (commError) {
          console.error("Error calculating commission:", commError);
          // Don't fail the transfer, just log the error (Requirement 7.3)
        }
      }

      // ============================================================
      // SUCCESS RESPONSE
      // ============================================================

      // Return comprehensive response (Requirements 8.1, 10.1)
      return {
        success: true,
        message: `Successfully sent KES ${request.amount.toFixed(2)} to ${request.recipientWalletNumber}. Fee: KES ${fee.toFixed(2)}`,
        transactionId: senderTransactionId,
        receiptReference: receiptReference,
        newBalance: senderNewBalance,
      };
    } catch (error: any) {
      console.error("Transfer execution error:", error);
      return {
        success: false,
        message: "An error occurred while processing transfer",
        error: error.message || "UNKNOWN_ERROR",
      };
    }
  },

  /**
   * Get transfer history for the current user
   * 
   * Retrieves all send_money and receive_money transactions for the user,
   * ordered by created_at descending, limited to 50 records by default.
   * 
   * Requirements: 10.2, 10.3, 10.4, 10.5
   * 
   * @param limit - Maximum number of records to return (default: 50, max: 100)
   * @param offset - Number of records to skip for pagination (default: 0)
   * @returns Array of transaction records
   */
  async getTransferHistory(limit = 50, offset = 0): Promise<any[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Enforce maximum limit
      const effectiveLimit = Math.min(limit, 100);

      // Query transactions (Requirements 10.2, 10.4, 10.5)
      const { data, error } = await (supabase as any)
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .in("type", ["send_money", "receive_money"])
        .order("created_at", { ascending: false })
        .range(offset, offset + effectiveLimit - 1);

      if (error) {
        console.error("Error fetching transfer history:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("Error fetching transfer history:", error);
      return [];
    }
  },

  /**
   * Validate a transfer request before execution
   * 
   * Performs all validation checks without executing the transfer.
   * Useful for pre-flight validation in the UI.
   * 
   * @param request - Transfer request to validate
   * @returns Validation result with any errors
   */
  async validateTransferRequest(request: TransferRequest): Promise<{
    valid: boolean;
    errors: string[];
    fee?: number;
    totalDeduction?: number;
  }> {
    const errors: string[] = [];

    try {
      // Check authentication
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        errors.push("User not authenticated");
        return { valid: false, errors };
      }

      // Validate amount
      if (request.amount <= 0) {
        errors.push("Amount must be greater than 0");
      }

      // Get sender wallet
      const { data: senderWallet } = await supabase
        .from("wallets")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_agent_wallet", false)
        .single();

      if (!senderWallet) {
        errors.push("Sender wallet not found");
        return { valid: false, errors };
      }

      // Validate recipient
      const recipientValidation = await walletValidatorService.validateRecipient(
        request.recipientWalletNumber,
        senderWallet.id
      );

      if (!recipientValidation.valid) {
        errors.push(recipientValidation.error || "Invalid recipient wallet");
      }

      // Validate balance
      const balanceValidation = await balanceService.validateTransferBalance(
        senderWallet.id,
        request.amount
      );

      if (!balanceValidation.valid) {
        errors.push(balanceValidation.message);
      }

      const fee = balanceValidation.fee || calculateTransferFee(request.amount);
      const totalDeduction = request.amount + fee;

      return {
        valid: errors.length === 0,
        errors,
        fee,
        totalDeduction,
      };
    } catch (error: any) {
      console.error("Validation error:", error);
      errors.push(error.message || "Validation failed");
      return { valid: false, errors };
    }
  },

  /**
   * Calculate fee for a transfer amount
   * 
   * Convenience method to calculate the fee without executing a transfer.
   * 
   * @param amount - Transfer amount
   * @returns Calculated fee
   */
  calculateFee(amount: number): number {
    return calculateTransferFee(amount);
  },
};

export default transferService;
