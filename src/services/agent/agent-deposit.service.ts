import { supabase } from "@/integrations/supabase/client";

interface AgentDepositParams {
  agentWalletId: string;
  customerWalletNumber: string;
  amount: number;
  method: "wallet" | "mpesa";
  agentPin: string;
}

interface AgentDepositResult {
  success: boolean;
  message: string;
  transactionId?: string;
  commission?: number;
}

export const agentDepositService = {
  async depositToCustomer(params: AgentDepositParams): Promise<AgentDepositResult> {
    try {
      const { agentWalletId, customerWalletNumber, amount, method, agentPin } = params;
      if (amount <= 0) return { success: false, message: "Invalid amount" };

      const { data: agentWallet, error: agentWalletError } = await supabase
        .from("wallets").select("*").eq("id", agentWalletId).single();
      if (agentWalletError || !agentWallet) return { success: false, message: "Agent wallet not found" };
      if (agentWallet.transaction_pin !== agentPin) return { success: false, message: "Invalid PIN" };

      const { data: customerWallet, error: customerWalletError } = await supabase
        .from("wallets").select("*").eq("wallet_id", customerWalletNumber).single();
      if (customerWalletError || !customerWallet) return { success: false, message: "Customer wallet not found" };

      if (method === "wallet" && agentWallet.balance < amount) return { success: false, message: "Insufficient agent balance" };

      const commission = amount * 0.02;
      const transactionId = `AGT-DEP-${Date.now()}`;

      if (method === "wallet") {
        await supabase.from("wallets").update({ balance: agentWallet.balance - amount }).eq("id", agentWalletId);
      }

      await supabase.from("wallets").update({ balance: customerWallet.balance + amount }).eq("id", customerWallet.id);

      const { data: agent } = await supabase.from("agents").select("id").eq("user_id", agentWallet.user_id).single();

      await supabase.from("transactions").insert({
        transaction_id: transactionId,
        sender_wallet_id: method === "wallet" ? agentWalletId : null,
        receiver_wallet_id: customerWallet.id,
        type: "agent_deposit",
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
          commission_percentage: 2,
          base_amount: amount,
          transaction_type: "deposit",
        } as any);
      }

      return { success: true, message: "Deposit successful", transactionId, commission };
    } catch (error: any) {
      console.error("Agent deposit error:", error);
      return { success: false, message: error.message || "Failed to process deposit" };
    }
  },
};
