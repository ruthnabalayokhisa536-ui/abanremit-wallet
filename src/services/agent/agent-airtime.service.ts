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
  /**
   * Agent sells airtime to customer
   */
  async sellAirtime(params: AgentAirtimeParams): Promise<AgentAirtimeResult> {
    try {
      const { agentWalletId, phoneNumber, amount, networkCode, agentPin } = params;

      // Validate amount
      if (amount < 10) {
        return { success: false, message: "Minimum airtime amount is KES 10" };
      }

      if (amount > 10000) {
        return { success: false, message: "Maximum airtime amount is KES 10,000" };
      }

      // Get agent wallet
      const { data: agentWallet, error: walletError } = await supabase
        .from("wallets")
        .select("*")
        .eq("id", agentWalletId)
        .single();

      if (walletError || !agentWallet) {
        return { success: false, message: "Agent wallet not found" };
      }

      // Verify PIN
      if (agentWallet.transaction_pin !== agentPin) {
        return { success: false, message: "Invalid PIN" };
      }

      // Get network details
      const { data: network, error: networkError } = await supabase
        .from("airtime_networks")
        .select("*")
        .eq("code", networkCode)
        .eq("enabled", true)
        .single();

      if (networkError || !network) {
        return { success: false, message: "Network not available" };
      }

      // Calculate commission (network commission rate, typically 2-5%)
      const commission = amount * network.commission_rate;

      // Check agent balance
      if (agentWallet.balance < amount) {
        return {
          success: false,
          message: `Insufficient balance. Need KES ${amount.toFixed(2)}`,
        };
      }

      const transactionId = `AGT-AIR-${Date.now()}`;

      // Deduct from agent wallet
      const { error: deductError } = await supabase
        .from("wallets")
        .update({ balance: agentWallet.balance - amount })
        .eq("id", agentWalletId);

      if (deductError) throw deductError;

      // Get agent record
      const { data: agent } = await supabase
        .from("agents")
        .select("id")
        .eq("user_id", agentWallet.user_id)
        .single();

      // Record airtime transaction
      const { error: airtimeError } = await supabase
        .from("airtime_transactions")
        .insert({
          transaction_id: transactionId,
          wallet_id: agentWalletId,
          phone_number: phoneNumber,
          network_code: networkCode,
          amount: amount,
          status: "completed",
          agent_id: agent?.id,
          commission_amount: commission,
        });

      if (airtimeError) throw airtimeError;

      // Record in transactions table
      const { error: txError } = await supabase
        .from("transactions")
        .insert({
          transaction_id: transactionId,
          sender_wallet_id: agentWalletId,
          receiver_wallet_id: null,
          type: "agent_airtime",
          amount: amount,
          fee: 0,
          status: "completed",
          description: `Agent airtime sale - ${network.name} to ${phoneNumber}`,
          agent_id: agent?.id,
          commission_amount: commission,
        });

      if (txError) throw txError;

      // Update agent commission balance
      if (agent) {
        const { data: agentData } = await supabase
          .from("agents")
          .select("commission_balance")
          .eq("id", agent.id)
          .single();

        if (agentData) {
          await supabase
            .from("agents")
            .update({ commission_balance: agentData.commission_balance + commission })
            .eq("id", agent.id);
        }

        // Record commission transaction
        await supabase
          .from("commission_transactions")
          .insert({
            agent_id: agent.id,
            transaction_id: transactionId,
            commission_amount: commission,
            transaction_type: "airtime",
          });
      }

      // TODO: Integrate with actual airtime API (Africa's Talking, etc.)
      // For now, we just record the transaction

      return {
        success: true,
        message: "Airtime purchase successful",
        transactionId,
        commission,
      };
    } catch (error: any) {
      console.error("Agent airtime error:", error);
      return {
        success: false,
        message: error.message || "Failed to process airtime purchase",
      };
    }
  },
};
