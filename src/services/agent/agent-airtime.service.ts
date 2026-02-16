import { supabase } from "@/integrations/supabase/client";

interface AgentAirtimeParams {
  agentWalletId: string;
  phoneNumber: string;
  amount: number;
  networkCode: string;
  agentPin: string;
}

interface AgentAirtimeResult {
  success: boolean;
  message: string;
  transactionId?: string;
  commission?: number;
}

export const agentAirtimeService = {
  async sellAirtime(params: AgentAirtimeParams): Promise<AgentAirtimeResult> {
    try {
      const { agentWalletId, phoneNumber, amount, networkCode, agentPin } = params;

      if (amount < 10) return { success: false, message: "Minimum airtime amount is KES 10" };
      if (amount > 10000) return { success: false, message: "Maximum airtime amount is KES 10,000" };

      const { data: agentWallet, error: walletError } = await supabase
        .from("wallets").select("*").eq("id", agentWalletId).single();
      if (walletError || !agentWallet) return { success: false, message: "Agent wallet not found" };
      if (agentWallet.transaction_pin !== agentPin) return { success: false, message: "Invalid PIN" };

      const { data: network, error: networkError } = await supabase
        .from("airtime_networks").select("*").eq("code", networkCode).eq("enabled", true).single();
      if (networkError || !network) return { success: false, message: "Network not available" };

      const commission = amount * network.commission_rate;
      if (agentWallet.balance < amount) return { success: false, message: `Insufficient balance. Need KES ${amount.toFixed(2)}` };

      const transactionId = `AGT-AIR-${Date.now()}`;

      await supabase.from("wallets").update({ balance: agentWallet.balance - amount }).eq("id", agentWalletId);

      const { data: agent } = await supabase.from("agents").select("id").eq("user_id", agentWallet.user_id).single();

      // Record airtime transaction - use correct schema columns
      await supabase.from("airtime_transactions").insert({
        user_id: agentWallet.user_id,
        phone_number: phoneNumber,
        network_id: network.id,
        amount: amount,
        status: "completed",
        agent_id: agent?.id || null,
        commission: commission,
      } as any);

      // Record in transactions table
      await supabase.from("transactions").insert({
        transaction_id: transactionId,
        sender_wallet_id: agentWalletId,
        type: "agent_airtime",
        amount: amount,
        fee: 0,
        status: "completed",
        agent_id: agent?.id || null,
        commission_amount: commission,
      } as any);

      if (agent) {
        const { data: agentData } = await supabase.from("agents").select("commission_balance").eq("id", agent.id).single();
        if (agentData) {
          await supabase.from("agents").update({ commission_balance: agentData.commission_balance + commission }).eq("id", agent.id);
        }
        await supabase.from("commission_transactions").insert({
          agent_id: agent.id,
          agent_wallet_id: agentWalletId,
          transaction_id: transactionId,
          commission_amount: commission,
          commission_percentage: network.commission_rate * 100,
          base_amount: amount,
          transaction_type: "airtime",
        } as any);
      }

      return { success: true, message: "Airtime purchase successful", transactionId, commission };
    } catch (error: any) {
      console.error("Agent airtime error:", error);
      return { success: false, message: error.message || "Failed to process airtime purchase" };
    }
  },
};
