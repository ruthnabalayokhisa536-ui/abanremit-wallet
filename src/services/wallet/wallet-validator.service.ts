import { supabase } from "@/integrations/supabase/client";

/**
 * Wallet Validator Service
 * Handles wallet number format validation, existence checking, and wallet details retrieval
 * 
 * Requirements: 1.1, 1.2, 1.4, 1.5
 */

export interface WalletValidationResult {
  valid: boolean;
  name?: string;
  error?: string;
}

export interface WalletDetails {
  id: string;
  wallet_number: string;
  user_id: string;
  balance: number;
  full_name: string;
}

export const walletValidatorService = {
  /**
   * Validates wallet number format
   * Requirements: 1.1
   * 
   * @param walletNumber - The wallet number to validate
   * @returns true if format matches /^WLT(888|777)\d{5}$/, false otherwise
   */
  validateFormat(walletNumber: string): boolean {
    const pattern = /^WLT(888|777)\d{5}$/;
    return pattern.test(walletNumber);
  },

  /**
   * Validates if a wallet exists in the database and retrieves recipient name
   * Requirements: 1.2, 1.5
   * 
   * @param walletNumber - The wallet number to validate
   * @returns Validation result with recipient name if valid
   */
  async validateExists(walletNumber: string): Promise<WalletValidationResult> {
    try {
      // First validate format
      if (!this.validateFormat(walletNumber)) {
        return {
          valid: false,
          error: "Invalid wallet number format",
        };
      }

      // Query database for wallet with joined profile data
      const { data, error } = await supabase
        .from("wallets")
        .select(`
          wallet_number,
          user_id,
          profiles!inner(full_name)
        `)
        .eq("wallet_number", walletNumber)
        .single();

      if (error || !data) {
        return {
          valid: false,
          error: "Recipient wallet not found. Please check the wallet number.",
        };
      }

      return {
        valid: true,
        name: (data.profiles as any)?.full_name || "Unknown",
      };
    } catch (error) {
      console.error("Error validating wallet existence:", error);
      return {
        valid: false,
        error: "Error validating wallet",
      };
    }
  },

  /**
   * Retrieves complete wallet details including balance and user information
   * Requirements: 1.2, 1.5
   * 
   * @param walletNumber - The wallet number to retrieve details for
   * @returns Wallet details or null if not found
   */
  async getWalletDetails(walletNumber: string): Promise<WalletDetails | null> {
    try {
      // First validate format
      if (!this.validateFormat(walletNumber)) {
        return null;
      }

      // Query database for complete wallet details
      const { data, error } = await supabase
        .from("wallets")
        .select(`
          id,
          wallet_number,
          user_id,
          balance,
          profiles!inner(full_name)
        `)
        .eq("wallet_number", walletNumber)
        .single();

      if (error || !data) {
        return null;
      }

      return {
        id: data.id,
        wallet_number: data.wallet_number,
        user_id: data.user_id,
        balance: data.balance,
        full_name: (data.profiles as any)?.full_name || "Unknown",
      };
    } catch (error) {
      console.error("Error retrieving wallet details:", error);
      return null;
    }
  },

  /**
   * Detects if a transfer is a self-transfer
   * Requirements: 1.4
   * 
   * @param senderWalletId - The sender's wallet ID
   * @param recipientWalletId - The recipient's wallet ID
   * @returns true if sender and recipient are the same, false otherwise
   */
  isSelfTransfer(senderWalletId: string, recipientWalletId: string): boolean {
    return senderWalletId === recipientWalletId;
  },

  /**
   * Validates recipient wallet and checks for self-transfer
   * Requirements: 1.2, 1.4, 1.5
   * 
   * @param recipientWalletNumber - The recipient's wallet number
   * @param senderWalletId - The sender's wallet ID
   * @returns Validation result with error if self-transfer detected
   */
  async validateRecipient(
    recipientWalletNumber: string,
    senderWalletId: string
  ): Promise<WalletValidationResult> {
    // Validate existence and get details
    const existsResult = await this.validateExists(recipientWalletNumber);
    
    if (!existsResult.valid) {
      return existsResult;
    }

    // Get recipient wallet details to check for self-transfer
    const recipientDetails = await this.getWalletDetails(recipientWalletNumber);
    
    if (!recipientDetails) {
      return {
        valid: false,
        error: "Recipient wallet not found. Please check the wallet number.",
      };
    }

    // Check for self-transfer
    if (this.isSelfTransfer(senderWalletId, recipientDetails.id)) {
      return {
        valid: false,
        error: "Cannot send money to yourself",
      };
    }

    return {
      valid: true,
      name: recipientDetails.full_name,
    };
  },
};

export default walletValidatorService;
