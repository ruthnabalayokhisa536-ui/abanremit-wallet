import { supabase } from "@/integrations/supabase/client";

export interface MPesaDepositRequest {
  phoneNumber: string;
  amount: number;
  accountReference?: string;
  transactionDesc?: string;
}

export interface MPesaDepositResponse {
  success: boolean;
  message: string;
  checkoutRequestId?: string;
  merchantRequestId?: string;
  error?: string;
}

export interface MPesaTransaction {
  id: string;
  user_id: string;
  merchant_request_id: string;
  checkout_request_id: string;
  phone_number: string;
  amount: number;
  account_reference: string;
  transaction_desc: string;
  mpesa_receipt_number?: string;
  transaction_date?: string;
  result_code?: number;
  result_desc?: string;
  status: "pending" | "completed" | "failed" | "cancelled";
  created_at: string;
  updated_at: string;
}

/**
 * M-Pesa Payment Service
 * Handles M-Pesa STK Push deposits and transaction tracking
 */
export const mpesaService = {
  /**
   * Initiate M-Pesa STK Push for deposit (via Render Proxy)
   */
  async initiateDeposit(request: MPesaDepositRequest): Promise<MPesaDepositResponse> {
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
      if (request.amount < 1) {
        return {
          success: false,
          message: "Minimum deposit amount is KES 1",
          error: "INVALID_AMOUNT",
        };
      }

      if (request.amount > 150000) {
        return {
          success: false,
          message: "Maximum deposit amount is KES 150,000",
          error: "AMOUNT_TOO_HIGH",
        };
      }

      // Validate phone number
      const phoneRegex = /^(\+?254|0)?[17]\d{8}$/;
      if (!phoneRegex.test(request.phoneNumber.replace(/\s/g, ""))) {
        return {
          success: false,
          message: "Invalid phone number. Use format: 0712345678 or 254712345678",
          error: "INVALID_PHONE",
        };
      }

      // Use M-Pesa Proxy Server on Render
      const mpesaProxyUrl = "https://mpesa-proxy-server-2.onrender.com/stkpush";

      console.log("Initiating M-Pesa STK Push via proxy...");

      const response = await fetch(mpesaProxyUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: request.phoneNumber,
          amount: request.amount,
          userId: user.id,
          accountReference: request.accountReference || `WALLET-${user.id.slice(0, 8)}`,
          transactionDesc: request.transactionDesc || "Wallet Deposit",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("M-Pesa proxy error:", errorData);
        throw new Error(errorData.error || errorData.message || `Proxy error: ${response.status}`);
      }

      const data = await response.json();
      console.log("M-Pesa STK Response:", data);

      if (!data.success) {
        throw new Error(data.error || data.message || "STK Push failed");
      }

      // Show detailed success message
      const successMessage = data.checkoutRequestId 
        ? `✅ STK Push sent successfully!\n\n📱 Check your phone (${this.formatPhoneNumber(request.phoneNumber)})\n💳 Enter your M-Pesa PIN to complete payment\n\n⏱️ You have 60 seconds to complete the transaction`
        : "STK Push sent. Please check your phone and enter your M-Pesa PIN.";

      return {
        success: true,
        message: successMessage,
        checkoutRequestId: data.checkoutRequestId,
        merchantRequestId: data.merchantRequestId,
      };
    } catch (error: any) {
      console.error("M-Pesa deposit error:", error);
      return {
        success: false,
        message: error.message || "An error occurred while processing your request",
        error: error.message,
      };
    }
  },

  /**
   * Check M-Pesa transaction status
   */
  async checkTransactionStatus(checkoutRequestId: string): Promise<MPesaTransaction | null> {
    try {
      const { data, error } = await (supabase
        .from("mpesa_transactions" as any)
        .select("*")
        .eq("checkout_request_id", checkoutRequestId)
        .single());

      if (error) {
        console.error("Error checking transaction status:", error);
        return null;
      }

      return data as unknown as MPesaTransaction;
    } catch (error) {
      console.error("Error checking transaction status:", error);
      return null;
    }
  },

  /**
   * Get user's M-Pesa transaction history
   */
  async getUserTransactions(userId: string, limit = 50): Promise<MPesaTransaction[]> {
    try {
      const { data, error } = await (supabase
        .from("mpesa_transactions" as any)
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit));

      if (error) {
        console.error("Error fetching transactions:", error);
        return [];
      }

      return (data || []) as unknown as MPesaTransaction[];
    } catch (error) {
      console.error("Error fetching transactions:", error);
      return [];
    }
  },

  /**
   * Poll transaction status until completed or timeout
   */
  async pollTransactionStatus(
    checkoutRequestId: string,
    maxAttempts = 30,
    intervalMs = 2000
  ): Promise<MPesaTransaction | null> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const transaction = await this.checkTransactionStatus(checkoutRequestId);

      if (transaction && transaction.status !== "pending") {
        return transaction;
      }

      // Wait before next attempt
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    return null; // Timeout
  },

  /**
   * Subscribe to real-time transaction updates
   */
  subscribeToTransactionUpdates(
    checkoutRequestId: string,
    callback: (transaction: MPesaTransaction) => void
  ) {
    const channel = supabase
      .channel(`mpesa-transaction-${checkoutRequestId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "mpesa_transactions",
          filter: `checkout_request_id=eq.${checkoutRequestId}`,
        },
        (payload) => {
          callback(payload.new as MPesaTransaction);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  },

  /**
   * Format phone number for display
   */
  formatPhoneNumber(phone: string): string {
    const cleaned = phone.replace(/\D/g, "");
    
    if (cleaned.startsWith("254")) {
      return `+254 ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9)}`;
    }
    
    if (cleaned.startsWith("0")) {
      return `0${cleaned.slice(1, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
    }
    
    return phone;
  },

  /**
   * Get transaction status color
   */
  getStatusColor(status: string): string {
    switch (status) {
      case "completed":
        return "text-green-600 bg-green-50";
      case "failed":
        return "text-red-600 bg-red-50";
      case "pending":
        return "text-yellow-600 bg-yellow-50";
      case "cancelled":
        return "text-gray-600 bg-gray-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  },

  /**
   * Get transaction status label
   */
  getStatusLabel(status: string): string {
    switch (status) {
      case "completed":
        return "Completed";
      case "failed":
        return "Failed";
      case "pending":
        return "Pending";
      case "cancelled":
        return "Cancelled";
      default:
        return status;
    }
  },
};

export default mpesaService;
