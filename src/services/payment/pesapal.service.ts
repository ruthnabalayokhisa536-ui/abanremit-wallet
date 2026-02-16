import { supabase } from "@/integrations/supabase/client";

export interface PesaPalDepositRequest {
  amount: number;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
}

export interface PesaPalDepositResponse {
  success: boolean;
  message: string;
  redirectUrl?: string;
  orderTrackingId?: string;
  error?: string;
}

export interface PesaPalTransaction {
  id: string;
  user_id: string;
  wallet_id: string;
  order_tracking_id: string;
  merchant_reference: string;
  amount: number;
  currency: string;
  payment_method?: string;
  payment_status_code?: number;
  payment_status_description?: string;
  status: "pending" | "completed" | "failed" | "cancelled";
  created_at: string;
  updated_at: string;
}

/**
 * PesaPal Payment Service
 * Handles PesaPal payments (cards, mobile money, bank transfers)
 */
export const pesapalService = {
  /**
   * Initiate PesaPal payment
   */
  async initiateDeposit(request: PesaPalDepositRequest): Promise<PesaPalDepositResponse> {
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

      // Get user's wallet
      const { data: wallet, error: walletError } = await supabase
        .from("wallets")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (walletError || !wallet) {
        return {
          success: false,
          message: "Wallet not found",
          error: "WALLET_NOT_FOUND",
        };
      }

      // Validate amount
      if (request.amount < 10) {
        return {
          success: false,
          message: "Minimum deposit amount is KES 10",
          error: "INVALID_AMOUNT",
        };
      }

      if (request.amount > 500000) {
        return {
          success: false,
          message: "Maximum deposit amount is KES 500,000",
          error: "AMOUNT_TOO_HIGH",
        };
      }

      // Validate email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(request.email)) {
        return {
          success: false,
          message: "Invalid email address",
          error: "INVALID_EMAIL",
        };
      }

      // Validate phone
      const phoneRegex = /^(\+?254|0)?[17]\d{8}$/;
      if (!phoneRegex.test(request.phone.replace(/\s/g, ""))) {
        return {
          success: false,
          message: "Invalid phone number. Use format: 0712345678 or 254712345678",
          error: "INVALID_PHONE",
        };
      }

      // Get PesaPal API URL
      const pesapalApiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pesapal-api`;

      // Get session token
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !sessionData.session) {
        return {
          success: false,
          message: "Authentication session expired. Please log in again.",
          error: "SESSION_EXPIRED",
        };
      }

      // Call PesaPal Edge Function
      const response = await fetch(pesapalApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({
          amount: request.amount,
          userId: user.id,
          walletId: wallet.id,
          email: request.email,
          phone: request.phone,
          firstName: request.firstName,
          lastName: request.lastName,
        }),
      });

      // Check if function is deployed
      if (response.status === 404) {
        return {
          success: false,
          message: "PesaPal service not available. Please contact support.",
          error: "FUNCTION_NOT_DEPLOYED",
        };
      }

      const data = await response.json();

      if (!response.ok || !data.success) {
        return {
          success: false,
          message: data.error || "Failed to initiate PesaPal payment",
          error: data.error,
        };
      }

      return {
        success: true,
        message: data.message || "Redirecting to PesaPal payment page...",
        redirectUrl: data.redirectUrl,
        orderTrackingId: data.orderTrackingId,
      };
    } catch (error: any) {
      console.error("PesaPal deposit error:", error);
      return {
        success: false,
        message: "An error occurred while processing your request",
        error: error.message,
      };
    }
  },

  /**
   * Check PesaPal transaction status
   */
  async checkTransactionStatus(orderTrackingId: string): Promise<PesaPalTransaction | null> {
    try {
      const { data, error } = await supabase
        .from("pesapal_transactions")
        .select("*")
        .eq("order_tracking_id", orderTrackingId)
        .single();

      if (error) {
        console.error("Error checking transaction status:", error);
        return null;
      }

      return data as PesaPalTransaction;
    } catch (error) {
      console.error("Error checking transaction status:", error);
      return null;
    }
  },

  /**
   * Get user's PesaPal transaction history
   */
  async getUserTransactions(userId: string, limit = 50): Promise<PesaPalTransaction[]> {
    try {
      const { data, error } = await supabase
        .from("pesapal_transactions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("Error fetching transactions:", error);
        return [];
      }

      return (data || []) as PesaPalTransaction[];
    } catch (error) {
      console.error("Error fetching transactions:", error);
      return [];
    }
  },

  /**
   * Subscribe to real-time transaction updates
   */
  subscribeToTransactionUpdates(
    orderTrackingId: string,
    callback: (transaction: PesaPalTransaction) => void
  ) {
    const channel = supabase
      .channel(`pesapal-transaction-${orderTrackingId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "pesapal_transactions",
          filter: `order_tracking_id=eq.${orderTrackingId}`,
        },
        (payload) => {
          callback(payload.new as PesaPalTransaction);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
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

export default pesapalService;
