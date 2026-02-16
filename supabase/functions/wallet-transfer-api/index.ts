import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Transfer Request Interface
 */
interface TransferRequest {
  recipientWalletNumber: string;
  amount: number;
  description?: string;
  pin: string;
  agentId?: string;
}

/**
 * Transfer Response Interface
 */
interface TransferResponse {
  success: boolean;
  message: string;
  transactionId?: string;
  receiptReference?: string;
  newBalance?: number;
  error?: string;
}

/**
 * Wallet-to-Wallet Transfer API
 * 
 * Provides endpoints for:
 * - POST /wallet-to-wallet: Execute a wallet-to-wallet transfer
 * - GET /history: Retrieve transfer history
 * - POST /validate-recipient: Validate recipient wallet number
 * 
 * Requirements: Task 14.1 - API endpoint implementation
 */

/**
 * Validate wallet number format
 * Requirements: 1.1
 */
function validateWalletFormat(walletNumber: string): boolean {
  const pattern = /^WLT(888|777)\d{5}$/;
  return pattern.test(walletNumber);
}

/**
 * Calculate transfer fee
 * Requirements: 6.1, 6.2, 6.3
 */
function calculateTransferFee(amount: number): number {
  const feePercentage = 0.005; // 0.5%
  const minFee = 5;
  const maxFee = 50;
  
  const calculatedFee = amount * feePercentage;
  return Math.max(minFee, Math.min(maxFee, calculatedFee));
}

/**
 * Execute wallet-to-wallet transfer
 */
async function executeTransfer(
  request: TransferRequest,
  supabase: any,
  userId: string
): Promise<TransferResponse> {
  try {
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
      .eq("user_id", userId)
      .eq("is_agent_wallet", false)
      .single();

    if (senderWalletError || !senderWallet) {
      return {
        success: false,
        message: "Sender wallet not found",
        error: "SENDER_WALLET_NOT_FOUND",
      };
    }

    // Validate recipient wallet format (Requirements 1.1)
    if (!validateWalletFormat(request.recipientWalletNumber)) {
      return {
        success: false,
        message: "Invalid wallet number format",
        error: "INVALID_WALLET_FORMAT",
      };
    }

    // Get recipient wallet details (Requirements 1.2, 1.5, 9.2)
    const { data: recipientWallet, error: recipientError } = await supabase
      .from("wallets")
      .select(`
        id,
        wallet_number,
        user_id,
        balance,
        profiles!inner(full_name)
      `)
      .eq("wallet_number", request.recipientWalletNumber)
      .single();

    if (recipientError || !recipientWallet) {
      return {
        success: false,
        message: "Recipient wallet not found. Please check the wallet number.",
        error: "RECIPIENT_WALLET_NOT_FOUND",
      };
    }

    // Check for self-transfer (Requirement 1.4)
    if (senderWallet.id === recipientWallet.id) {
      return {
        success: false,
        message: "Cannot send money to yourself",
        error: "SELF_TRANSFER",
      };
    }

    // Calculate fee and total deduction (Requirements 3.1, 6.1, 6.2, 6.3)
    const fee = calculateTransferFee(request.amount);
    const totalDeduction = request.amount + fee;

    // Validate balance (Requirements 3.2)
    if (senderWallet.balance < totalDeduction) {
      return {
        success: false,
        message: `Insufficient balance. Required: KES ${totalDeduction.toFixed(2)} (Amount: KES ${request.amount.toFixed(2)} + Fee: KES ${fee.toFixed(2)}), Available: KES ${senderWallet.balance.toFixed(2)}`,
        error: "INSUFFICIENT_BALANCE",
      };
    }

    // Validate transaction PIN (Requirements 2.1, 2.2, 2.3, 2.6)
    const { data: pinValidation, error: pinError } = await supabase.rpc(
      "validate_transaction_pin",
      {
        p_user_id: userId,
        p_pin: request.pin,
      }
    );

    if (pinError) {
      console.error("PIN validation error:", pinError);
      return {
        success: false,
        message: "PIN validation failed",
        error: "PIN_VALIDATION_ERROR",
      };
    }

    if (!pinValidation) {
      // Check if account is locked
      const { data: pinData } = await supabase
        .from("transaction_pins")
        .select("locked_until, failed_attempts")
        .eq("user_id", userId)
        .single();

      if (pinData?.locked_until && new Date(pinData.locked_until) > new Date()) {
        return {
          success: false,
          message: "Account locked due to too many failed attempts. Try again later.",
          error: "ACCOUNT_LOCKED",
        };
      }

      return {
        success: false,
        message: "Invalid transaction PIN",
        error: "INVALID_PIN",
      };
    }

    // Store original balance for rollback
    const senderOriginalBalance = senderWallet.balance;

    // Deduct from sender (Requirements 4.1, 4.4)
    const { data: updatedSender, error: deductError } = await supabase
      .from("wallets")
      .update({
        balance: senderWallet.balance - totalDeduction,
        updated_at: new Date().toISOString(),
      })
      .eq("id", senderWallet.id)
      .select("balance")
      .single();

    if (deductError || !updatedSender) {
      console.error("Deduction error:", deductError);
      return {
        success: false,
        message: "Failed to process transfer",
        error: "DEDUCTION_ERROR",
      };
    }

    const senderNewBalance = updatedSender.balance;

    // Credit recipient (Requirements 4.2, 4.4)
    const { data: updatedRecipient, error: creditError } = await supabase
      .from("wallets")
      .update({
        balance: recipientWallet.balance + request.amount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", recipientWallet.id)
      .select("balance")
      .single();

    if (creditError || !updatedRecipient) {
      console.error("Credit error, rolling back:", creditError);
      
      // Rollback sender deduction (Requirement 4.3)
      await supabase
        .from("wallets")
        .update({
          balance: senderOriginalBalance,
          updated_at: new Date().toISOString(),
        })
        .eq("id", senderWallet.id);

      return {
        success: false,
        message: "Failed to credit recipient",
        error: "CREDIT_ERROR",
      };
    }

    const recipientNewBalance = updatedRecipient.balance;

    // Create sender transaction record (Requirements 5.1, 5.2, 5.6, 5.7)
    let senderTransactionId: string | undefined;
    let receiptReference: string | undefined;

    try {
      const { data: senderRecord, error: senderRecordError } = await supabase
        .from("transactions")
        .insert({
          user_id: userId,
          wallet_id: senderWallet.id,
          type: "send_money",
          amount: -request.amount, // Negative for debit
          fee: fee,
          balance_after: senderNewBalance,
          description: request.description || `Sent to ${request.recipientWalletNumber}`,
          reference: request.recipientWalletNumber,
          status: "completed",
          agent_id: request.agentId || null,
        })
        .select("id, receipt_reference")
        .single();

      if (!senderRecordError && senderRecord) {
        senderTransactionId = senderRecord.id;
        receiptReference = senderRecord.receipt_reference;
      }
    } catch (error) {
      console.error("Error creating sender transaction record:", error);
      // Don't fail the transfer (Requirement 9.5)
    }

    // Create recipient transaction record (Requirements 5.3, 5.4, 5.6, 5.7)
    try {
      await supabase
        .from("transactions")
        .insert({
          user_id: recipientWallet.user_id,
          wallet_id: recipientWallet.id,
          type: "receive_money",
          amount: request.amount, // Positive for credit
          fee: 0, // No fee for recipient
          balance_after: recipientNewBalance,
          description: request.description || `Received from ${senderWallet.wallet_number}`,
          reference: senderWallet.wallet_number,
          status: "completed",
        });
    } catch (error) {
      console.error("Error creating recipient transaction record:", error);
      // Don't fail the transfer (Requirement 9.5)
    }

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
        // Don't fail the transfer (Requirement 7.3)
      }
    }

    // Return success response (Requirements 8.1, 10.1)
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
}

/**
 * Get transfer history
 * Requirements: 10.2, 10.3, 10.4, 10.5
 */
async function getTransferHistory(
  supabase: any,
  userId: string,
  limit = 50,
  offset = 0
): Promise<any> {
  try {
    // Enforce maximum limit
    const effectiveLimit = Math.min(limit, 100);

    // Query transactions (Requirements 10.2, 10.4, 10.5)
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .in("type", ["send_money", "receive_money"])
      .order("created_at", { ascending: false })
      .range(offset, offset + effectiveLimit - 1);

    if (error) {
      console.error("Error fetching transfer history:", error);
      return {
        success: false,
        error: "Failed to fetch transfer history",
        transactions: [],
      };
    }

    return {
      success: true,
      transactions: data || [],
      total: data?.length || 0,
    };
  } catch (error: any) {
    console.error("Error fetching transfer history:", error);
    return {
      success: false,
      error: error.message,
      transactions: [],
    };
  }
}

/**
 * Validate recipient wallet
 * Requirements: 1.1, 1.2, 1.5
 */
async function validateRecipient(
  supabase: any,
  walletNumber: string
): Promise<any> {
  try {
    // Validate format
    if (!validateWalletFormat(walletNumber)) {
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
      name: data.profiles?.full_name || "Unknown",
    };
  } catch (error: any) {
    console.error("Error validating recipient:", error);
    return {
      valid: false,
      error: error.message || "Error validating wallet",
    };
  }
}

/**
 * Main request handler
 */
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with user's auth token
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get authenticated user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = new URL(req.url);
    const path = url.pathname;

    // Route: POST /wallet-to-wallet - Execute transfer
    if (path.includes("/wallet-to-wallet") && req.method === "POST") {
      const requestData: TransferRequest = await req.json();

      // Validate required fields
      if (!requestData.recipientWalletNumber || !requestData.amount || !requestData.pin) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Missing required fields: recipientWalletNumber, amount, pin" 
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const response = await executeTransfer(requestData, supabaseClient, user.id);
      
      return new Response(
        JSON.stringify(response),
        { 
          status: response.success ? 200 : 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Route: GET /history - Get transfer history
    if (path.includes("/history") && req.method === "GET") {
      const limit = parseInt(url.searchParams.get("limit") || "50");
      const offset = parseInt(url.searchParams.get("offset") || "0");

      const response = await getTransferHistory(supabaseClient, user.id, limit, offset);
      
      return new Response(
        JSON.stringify(response),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Route: POST /validate-recipient - Validate recipient wallet
    if (path.includes("/validate-recipient") && req.method === "POST") {
      const { walletNumber } = await req.json();

      if (!walletNumber) {
        return new Response(
          JSON.stringify({ valid: false, error: "Missing walletNumber" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const response = await validateRecipient(supabaseClient, walletNumber);
      
      return new Response(
        JSON.stringify(response),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Unknown route
    return new Response(
      JSON.stringify({ success: false, error: "Route not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("API Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
