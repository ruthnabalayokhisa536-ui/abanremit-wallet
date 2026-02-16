import { supabase } from "@/integrations/supabase/client";
import { transactionPinService } from "./transaction-pin.service";

export interface BuyAirtimeRequest {
  networkId: string;
  phoneNumber: string;
  amount: number;
  pin: string; // Transaction PIN
  agentId?: string; // If purchase is facilitated by agent
}

export interface BuyAirtimeResponse {
  success: boolean;
  message: string;
  transactionId?: string;
  receiptReference?: string;
  error?: string;
}

/**
 * Airtime Service
 * Handles airtime purchases with PIN validation and commission calculation
 */
export const airtimeService = {
  /**
   * Buy airtime
   */
  async buyAirtime(request: BuyAirtimeRequest): Promise<BuyAirtimeResponse> {
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
      if (request.amount < 10) {
        return {
          success: false,
          message: "Minimum airtime amount is 10",
          error: "INVALID_AMOUNT",
        };
      }

      if (request.amount > 10000) {
        return {
          success: false,
          message: "Maximum airtime amount is 10,000",
          error: "AMOUNT_TOO_HIGH",
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

      // Get network details
      const { data: network, error: networkError } = await supabase
        .from("airtime_networks")
        .select("*")
        .eq("id", request.networkId)
        .eq("enabled", true)
        .single();

      if (networkError || !network) {
        return {
          success: false,
          message: "Network not found or disabled",
          error: "NETWORK_NOT_FOUND",
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

      // Calculate fee (example: 2% of amount)
      const fee = request.amount * 0.02;
      const totalDeduction = request.amount + fee;

      // Check sufficient balance
      if (wallet.balance < totalDeduction) {
        return {
          success: false,
          message: `Insufficient balance. Required: ${totalDeduction}, Available: ${wallet.balance}`,
          error: "INSUFFICIENT_BALANCE",
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
          message: "Failed to process airtime purchase",
          error: "DEDUCTION_ERROR",
        };
      }

      // Create airtime transaction record
      const { data: airtimeTx, error: airtimeTxError } = await supabase
        .from("airtime_transactions")
        .insert({
          user_id: user.id,
          network_id: request.networkId,
          phone_number: request.phoneNumber,
          amount: request.amount,
          fee: fee,
          commission: network.commission_rate,
          agent_id: request.agentId || null,
          type: "purchase",
          status: "completed",
        })
        .select("id, transaction_id")
        .single();

      if (airtimeTxError) {
        console.error("Error creating airtime transaction:", airtimeTxError);
        // Rollback wallet deduction
        await supabase
          .from("wallets")
          .update({ balance: wallet.balance })
          .eq("id", wallet.id);

        return {
          success: false,
          message: "Failed to record airtime transaction",
          error: "TRANSACTION_ERROR",
        };
      }

      // Create wallet transaction record
      const { data: walletTx, error: walletTxError } = await supabase
        .from("transactions")
        .insert({
          sender_wallet_id: wallet.id,
          type: "airtime",
          amount: request.amount,
          fee: fee,
          balance_after: wallet.balance - totalDeduction,
          metadata: {
            description: `Airtime purchase - ${network.name} - ${request.phoneNumber}`,
            network: network.name,
            phone_number: request.phoneNumber
          },
          status: "completed",
          agent_id: request.agentId || null,
        })
        .select("id, receipt_reference")
        .single();

      if (walletTxError) {
        console.error("Error creating wallet transaction:", walletTxError);
      }

      // Calculate and credit commission if agent facilitated
      if (request.agentId && walletTx) {
        try {
          await supabase.rpc("calculate_and_credit_commission", {
            p_transaction_id: walletTx.id,
            p_transaction_type: "airtime",
            p_amount: request.amount,
            p_agent_id: request.agentId,
          });
        } catch (commError) {
          console.error("Error calculating commission:", commError);
          // Don't fail the purchase, just log the error
        }
      }

      // INTEGRATION: Instalipa Airtime API
      const { default: instalipaAirtimeService } = await import('./airtime/instalipa.service');
      
      const airtimeResult = await instalipaAirtimeService.purchaseAirtime({
        phoneNumber: request.phoneNumber,
        amount: request.amount,
        network: network.code,
        reference: airtimeTx.transaction_id,
      });

      if (!airtimeResult.success) {
        // Rollback transaction
        await supabase.from("wallets").update({ balance: wallet.balance }).eq("id", wallet.id);
        await supabase.from("airtime_transactions").update({ 
          status: 'failed',
          result_message: airtimeResult.message 
        }).eq("id", airtimeTx.id);
        
        return {
          success: false,
          message: airtimeResult.message,
          error: airtimeResult.error,
        };
      }

      // Update transaction with API response
      await supabase.from("airtime_transactions").update({
        status: airtimeResult.status || 'pending',
        result_message: airtimeResult.message,
      }).eq("id", airtimeTx.id);

      // Get user's phone number for SMS
      const { data: profile } = await supabase
        .from("profiles")
        .select("phone_number")
        .eq("user_id", user.id)
        .single();

      // Create notification in database
      try {
        const { notificationService } = await import('./notification.service');
        await notificationService.createNotification({
          userId: user.id,
          title: "Airtime Purchase Successful",
          message: `Your airtime purchase of KES ${request.amount} for ${request.phoneNumber} (${network.name}) has been processed. Transaction ID: ${walletTx?.receipt_reference || airtimeTx.transaction_id}`,
          type: "transaction",
          priority: "high",
          sendSMS: true,
          phoneNumber: profile?.phone_number,
        });
        console.log('Notification created successfully');
      } catch (notifError) {
        console.error('Failed to create notification:', notifError);
        // Don't fail the purchase if notification fails
      }

      return {
        success: true,
        message: `Successfully purchased ${request.amount} airtime for ${request.phoneNumber}`,
        transactionId: walletTx?.id,
        receiptReference: walletTx?.receipt_reference,
      };
    } catch (error: any) {
      console.error("Buy airtime error:", error);
      return {
        success: false,
        message: "An error occurred while processing airtime purchase",
        error: error.message,
      };
    }
  },

  /**
   * Get available networks
   */
  async getNetworks(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from("airtime_networks")
        .select("*")
        .eq("enabled", true)
        .order("name");

      if (error) {
        // Suppress AbortError in development
        if (error.message?.includes('AbortError')) {
          console.debug('[Airtime] Request aborted (normal in development)');
          return [];
        }
        console.error("Error fetching networks:", error);
        return [];
      }

      return data || [];
    } catch (error: any) {
      // Suppress AbortError in development
      if (error?.message?.includes('AbortError')) {
        console.debug('[Airtime] Request aborted (normal in development)');
        return [];
      }
      console.error("Error fetching networks:", error);
      return [];
    }
  },

  /**
   * Get airtime purchase history
   */
  async getAirtimeHistory(limit = 50): Promise<any[]> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return [];

      const { data, error } = await supabase
        .from("airtime_transactions")
        .select(`
          *,
          airtime_networks(name, code)
        `)
        .eq("user_id", user.user.id)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("Error fetching airtime history:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("Error fetching airtime history:", error);
      return [];
    }
  },
};

export default airtimeService;
