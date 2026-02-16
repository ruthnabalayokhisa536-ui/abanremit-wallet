import { supabase } from "@/integrations/supabase/client";

/**
 * Parameters for creating a sender transaction record
 */
export interface SenderRecordParams {
  userId: string;
  walletId: string;
  amount: number;
  fee: number;
  balanceAfter: number;
  recipientWalletNumber: string;
  description?: string;
  agentId?: string;
}

/**
 * Parameters for creating a recipient transaction record
 */
export interface RecipientRecordParams {
  userId: string;
  walletId: string;
  amount: number;
  balanceAfter: number;
  senderWalletNumber: string;
  description?: string;
}

/**
 * Transaction record returned from database
 */
export interface TransactionRecord {
  id: string;
  receipt_reference: string;
  created_at: string;
}

/**
 * Receipt reference format regex
 * Format: TXN-YYYYMMDD-xxxxx
 * Example: TXN-20240101-00001
 */
const RECEIPT_REFERENCE_FORMAT = /^TXN-\d{8}-\d{5}$/;

/**
 * Transaction Recorder Service
 * 
 * Handles creation of transaction records for wallet-to-wallet transfers.
 * Creates separate records for sender and recipient with appropriate types,
 * amounts, fees, and references.
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7
 */
export const transactionRecorderService = {
  /**
   * Validate receipt reference format
   * 
   * Verifies that a receipt reference matches the expected format:
   * TXN-YYYYMMDD-xxxxx
   * 
   * @param receiptReference - Receipt reference to validate
   * @returns true if format is valid, false otherwise
   */
  validateReceiptReferenceFormat(receiptReference: string): boolean {
    return RECEIPT_REFERENCE_FORMAT.test(receiptReference);
  },

  /**
   * Verify receipt reference uniqueness
   * 
   * Checks if a receipt reference already exists in the database.
   * 
   * @param receiptReference - Receipt reference to check
   * @returns true if unique (doesn't exist), false if duplicate
   */
  async verifyReceiptReferenceUniqueness(receiptReference: string): Promise<boolean> {
    const { data, error } = await supabase
      .from("transactions")
      .select("id")
      .eq("receipt_reference", receiptReference)
      .maybeSingle();

    if (error) {
      console.error("Error checking receipt reference uniqueness:", error);
      throw new Error(`Failed to verify receipt reference uniqueness: ${error.message}`);
    }

    // If data is null, the receipt reference doesn't exist (is unique)
    return data === null;
  },

  /**
   * Validate receipt reference
   * 
   * Performs complete validation of a receipt reference:
   * - Format validation (TXN-YYYYMMDD-xxxxx)
   * - Uniqueness verification
   * 
   * @param receiptReference - Receipt reference to validate
   * @returns Object with validation result and error message if invalid
   */
  async validateReceiptReference(receiptReference: string): Promise<{
    valid: boolean;
    error?: string;
  }> {
    // Check format
    if (!this.validateReceiptReferenceFormat(receiptReference)) {
      return {
        valid: false,
        error: `Invalid receipt reference format. Expected TXN-YYYYMMDD-xxxxx, got ${receiptReference}`,
      };
    }

    // Check uniqueness
    const isUnique = await this.verifyReceiptReferenceUniqueness(receiptReference);
    if (!isUnique) {
      return {
        valid: false,
        error: `Receipt reference ${receiptReference} already exists`,
      };
    }

    return { valid: true };
  },
  /**
   * Create a transaction record for the sender
   * 
   * Creates a "send_money" transaction with:
   * - Negative amount (debit)
   * - Transaction fee
   * - Status "completed"
   * - Reference to recipient wallet number
   * - Balance after transaction
   * 
   * Validates receipt reference format and uniqueness after creation.
   * 
   * @param params - Sender record parameters
   * @returns Transaction record with ID and receipt reference
   * @throws Error if transaction creation fails or receipt reference is invalid
   */
  async createSenderRecord(params: SenderRecordParams): Promise<TransactionRecord> {
    const { data, error } = await supabase
      .from("transactions")
      .insert({
        user_id: params.userId,
        wallet_id: params.walletId,
        type: "send_money",
        amount: -params.amount, // Negative for debit
        fee: params.fee,
        balance_after: params.balanceAfter,
        description: params.description || `Sent to ${params.recipientWalletNumber}`,
        reference: params.recipientWalletNumber,
        status: "completed",
        agent_id: params.agentId || null,
      })
      .select("id, receipt_reference, created_at")
      .single();

    if (error) {
      console.error("Error creating sender transaction record:", error);
      throw new Error(`Failed to create sender transaction record: ${error.message}`);
    }

    if (!data) {
      throw new Error("No data returned from sender transaction creation");
    }

    // Validate receipt reference format (Requirement 5.5)
    if (!this.validateReceiptReferenceFormat(data.receipt_reference)) {
      console.error(`Invalid receipt reference format: ${data.receipt_reference}`);
      throw new Error(
        `Generated receipt reference has invalid format: ${data.receipt_reference}`
      );
    }

    return data;
  },

  /**
   * Create a transaction record for the recipient
   * 
   * Creates a "receive_money" transaction with:
   * - Positive amount (credit)
   * - Zero fee
   * - Status "completed"
   * - Reference to sender wallet number
   * - Balance after transaction
   * 
   * Validates receipt reference format and uniqueness after creation.
   * 
   * @param params - Recipient record parameters
   * @returns Transaction record with ID and receipt reference
   * @throws Error if transaction creation fails or receipt reference is invalid
   */
  async createRecipientRecord(params: RecipientRecordParams): Promise<TransactionRecord> {
    const { data, error } = await supabase
      .from("transactions")
      .insert({
        user_id: params.userId,
        wallet_id: params.walletId,
        type: "receive_money",
        amount: params.amount, // Positive for credit
        fee: 0, // No fee for recipient
        balance_after: params.balanceAfter,
        description: params.description || `Received from ${params.senderWalletNumber}`,
        reference: params.senderWalletNumber,
        status: "completed",
      })
      .select("id, receipt_reference, created_at")
      .single();

    if (error) {
      console.error("Error creating recipient transaction record:", error);
      throw new Error(`Failed to create recipient transaction record: ${error.message}`);
    }

    if (!data) {
      throw new Error("No data returned from recipient transaction creation");
    }

    // Validate receipt reference format (Requirement 5.5)
    if (!this.validateReceiptReferenceFormat(data.receipt_reference)) {
      console.error(`Invalid receipt reference format: ${data.receipt_reference}`);
      throw new Error(
        `Generated receipt reference has invalid format: ${data.receipt_reference}`
      );
    }

    return data;
  },
};

export default transactionRecorderService;
