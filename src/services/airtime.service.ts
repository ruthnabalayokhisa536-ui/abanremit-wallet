import { supabase } from "@/integrations/supabase/client";
import { transactionPinService } from "./transaction-pin.service";
import { instalipaAirtimeService } from "./airtime/instalipa.service";

export interface BuyAirtimeRequest {
  networkId: string;
  phoneNumber: string;
  amount: number;
  pin: string;
  agentId?: string;
}

export interface BuyAirtimeResponse {
  success: boolean;
  message: string;
  transactionId?: string;
  receiptReference?: string;
  error?: string;
}

export const airtimeService = {
  async buyAirtime(request: BuyAirtimeRequest): Promise<BuyAirtimeResponse> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) return { success: false, message: "User not authenticated", error: "AUTH_ERROR" };

      // Validate amount
      if (request.amount < 10) return { success: false, message: "Minimum airtime amount is 10 KES", error: "INVALID_AMOUNT" };
      if (request.amount > 10000) return { success: false, message: "Maximum airtime amount is 10,000 KES", error: "AMOUNT_TOO_HIGH" };
      if (request.amount <= 0) return { success: false, message: "Amount must be positive", error: "INVALID_AMOUNT" };

      // Validate PIN
      const isPinValid = await transactionPinService.validatePin(request.pin);
      if (!isPinValid) return { success: false, message: "Invalid transaction PIN", error: "INVALID_PIN" };

      // Get user's wallet
      const { data: wallet, error: walletError } = await supabase
        .from("wallets").select("id, wallet_id, balance").eq("user_id", user.id).single();
      if (walletError || !wallet) return { success: false, message: "Wallet not found", error: "WALLET_NOT_FOUND" };

      // Get network
      const { data: network, error: networkError } = await supabase
        .from("airtime_networks").select("*").eq("id", request.networkId).single();
      if (networkError || !network) return { success: false, message: "Network not found", error: "NETWORK_NOT_FOUND" };
      if (!network.enabled) return { success: false, message: "Network not available", error: "NETWORK_DISABLED" };

      // Get fee
      const { data: feeData } = await supabase.from("fees").select("*").eq("transaction_type", "airtime").single();
      const fee = feeData ? Number(feeData.flat_fee) + (request.amount * Number(feeData.percentage_fee) / 100) : 0;
      const totalDeduction = request.amount + fee;

      // Check balance
      if (wallet.balance < totalDeduction) {
        return { success: false, message: `Insufficient balance. Need KES ${totalDeduction.toFixed(2)}`, error: "INSUFFICIENT_BALANCE" };
      }

      // Generate transaction reference
      const transactionId = `AIRTIME-${Date.now()}`;

      // Deduct from wallet atomically
      const newBalance = wallet.balance - totalDeduction;
      const { error: deductError } = await supabase.from("wallets").update({ balance: newBalance }).eq("id", wallet.id);
      if (deductError) throw deductError;

      // Create wallet transaction (pending)
      const { data: walletTx, error: walletTxError } = await supabase.from("transactions").insert({
        sender_wallet_id: wallet.id,
        type: "airtime",
        amount: request.amount,
        fee: fee,
        status: "pending",
        balance_after: newBalance,
        metadata: { network: network.name, phone_number: request.phoneNumber },
        reference: transactionId,
      } as any).select("receipt_reference").single();

      if (walletTxError) {
        console.error("Failed to create wallet transaction:", walletTxError);
        // Rollback balance
        await supabase.from("wallets").update({ balance: wallet.balance }).eq("id", wallet.id);
        throw walletTxError;
      }

      // Create airtime transaction (pending)
      const { data: airtimeTx, error: airtimeTxError } = await supabase.from("airtime_transactions").insert({
        user_id: user.id,
        network_id: network.id,
        phone_number: request.phoneNumber,
        amount: request.amount,
        fee: fee,
        status: "pending",
        transaction_id: transactionId,
      } as any).select("id").single();

      if (airtimeTxError) {
        console.error("Failed to create airtime transaction:", airtimeTxError);
        // Rollback balance
        await supabase.from("wallets").update({ balance: wallet.balance }).eq("id", wallet.id);
        throw airtimeTxError;
      }

      // Call Instalipa API via service
      try {
        const instalipaResponse = await instalipaAirtimeService.purchaseAirtime({
          phoneNumber: request.phoneNumber,
          amount: request.amount,
          network: network.code,
          reference: transactionId,
        });

        if (!instalipaResponse.success) {
          console.error("Instalipa purchase failed:", instalipaResponse.message);
          // Update transactions to failed
          await supabase.from("airtime_transactions").update({ 
            status: "failed", 
            result_message: instalipaResponse.message 
          }).eq("id", airtimeTx.id);
          
          await supabase.from("transactions").update({ status: "failed" }).eq("reference", transactionId);
          
          // Refund
          await supabase.from("wallets").update({ balance: wallet.balance }).eq("id", wallet.id);
          
          return {
            success: false,
            message: instalipaResponse.message || "Airtime purchase failed",
            error: instalipaResponse.error,
          };
        }
      } catch (instalipaError: any) {
        console.error("Instalipa API error:", instalipaError);
        // Update transactions to failed
        await supabase.from("airtime_transactions").update({ 
          status: "failed", 
          result_message: instalipaError.message 
        }).eq("id", airtimeTx.id);
        
        await supabase.from("transactions").update({ status: "failed" }).eq("reference", transactionId);
        
        // Refund
        await supabase.from("wallets").update({ balance: wallet.balance }).eq("id", wallet.id);
        
        return {
          success: false,
          message: instalipaError.message || "Failed to connect to airtime provider",
          error: instalipaError.message,
        };
      }

      // Handle agent commission (don't block on failure)
      if (request.agentId) {
        try {
          await supabase.rpc('calculate_and_credit_commission', {
            p_agent_id: request.agentId,
            p_amount: request.amount,
            p_transaction_id: transactionId,
            p_transaction_type: 'airtime',
          });
        } catch (commErr) {
          console.error('Commission calculation failed (non-blocking):', commErr);
        }
      }

      return {
        success: true,
        message: `Airtime purchase of KES ${request.amount} initiated for ${request.phoneNumber}. You will receive a notification when complete.`,
        transactionId,
        receiptReference: (walletTx as any)?.receipt_reference,
      };
    } catch (error: any) {
      console.error("Airtime purchase error:", error);
      return { success: false, message: error.message || "Failed to purchase airtime", error: error.message };
    }
  },

  async getNetworks() {
    try {
      const { data, error } = await supabase.from("airtime_networks").select("*").eq("enabled", true).order("name");
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching networks:", error);
      return [];
    }
  },

  async getAirtimeHistory(limit = 50) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("airtime_transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(limit);
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching airtime history:", error);
      return [];
    }
  },
};

export default airtimeService;
