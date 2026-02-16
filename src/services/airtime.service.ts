import { supabase } from "@/integrations/supabase/client";
import { transactionPinService } from "./transaction-pin.service";

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

      if (request.amount < 10) return { success: false, message: "Minimum airtime amount is 10", error: "INVALID_AMOUNT" };
      if (request.amount > 10000) return { success: false, message: "Maximum airtime amount is 10,000", error: "AMOUNT_TOO_HIGH" };

      // Validate PIN
      const isPinValid = await transactionPinService.validatePin(request.pin);
      if (!isPinValid) return { success: false, message: "Invalid transaction PIN", error: "INVALID_PIN" };

      // Get user's wallet
      const { data: wallet, error: walletError } = await supabase
        .from("wallets").select("id, wallet_id, balance").eq("user_id", user.id).single();
      if (walletError || !wallet) return { success: false, message: "Wallet not found", error: "WALLET_NOT_FOUND" };

      // Get network
      const { data: network, error: networkError } = await supabase
        .from("airtime_networks").select("*").eq("id", request.networkId).eq("enabled", true).single();
      if (networkError || !network) return { success: false, message: "Network not available", error: "NETWORK_NOT_FOUND" };

      // Get fee
      const { data: feeData } = await supabase.from("fees").select("*").eq("transaction_type", "airtime").single();
      const fee = feeData ? Number(feeData.flat_fee) + (request.amount * Number(feeData.percentage_fee) / 100) : 0;
      const totalDeduction = request.amount + fee;

      if (wallet.balance < totalDeduction) return { success: false, message: `Insufficient balance. Need KES ${totalDeduction.toFixed(2)}`, error: "INSUFFICIENT_BALANCE" };

      // Deduct from wallet
      const newBalance = wallet.balance - totalDeduction;
      const { error: deductError } = await supabase.from("wallets").update({ balance: newBalance }).eq("id", wallet.id);
      if (deductError) throw deductError;

      const transactionId = `AIR-${Date.now()}`;

      // Create transaction
      const { data: walletTx } = await supabase.from("transactions").insert({
        sender_wallet_id: wallet.id,
        type: "airtime",
        amount: request.amount,
        fee: fee,
        status: "completed",
        balance_after: newBalance,
        metadata: { network: network.name, phone_number: request.phoneNumber },
      } as any).select("receipt_reference").single();

      // Create airtime transaction
      const { data: airtimeTx } = await supabase.from("airtime_transactions").insert({
        user_id: user.id,
        network_id: network.id,
        phone_number: request.phoneNumber,
        amount: request.amount,
        fee: fee,
        status: "completed",
      } as any).select("transaction_id").single();

      // Handle agent commission
      if (request.agentId) {
        try {
          await supabase.rpc('calculate_and_credit_commission', {
            p_agent_id: request.agentId,
            p_amount: request.amount,
            p_transaction_id: transactionId,
            p_transaction_type: 'airtime',
          });
        } catch (commErr) {
          console.error('Commission calculation failed:', commErr);
        }
      }

      // Get profile for notification
      const { data: profile } = await supabase.from("profiles").select("phone, full_name").eq("user_id", user.id).single();

      try {
        const { notificationService } = await import('./notification.service');
        await notificationService.createNotification({
          userId: user.id,
          title: "Airtime Purchase Successful",
          message: `Your airtime purchase of KES ${request.amount} for ${request.phoneNumber} (${network.name}) has been processed. Transaction ID: ${(walletTx as any)?.receipt_reference || (airtimeTx as any)?.transaction_id}`,
          type: "transaction",
          priority: "high",
          sendSMS: true,
          phoneNumber: (profile as any)?.phone,
        });
      } catch (notifError) {
        console.error('Failed to create notification:', notifError);
      }

      return {
        success: true,
        message: `Airtime of KES ${request.amount} sent to ${request.phoneNumber}`,
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
