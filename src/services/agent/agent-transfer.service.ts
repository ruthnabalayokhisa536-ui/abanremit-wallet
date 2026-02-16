import { supabase } from "@/integrations/supabase/client";

interface AgentTransferParams {
  agentWalletId: string;
  recipientWalletNumber: string;
  amount: number;
  agentPin: string;
  transferType: "user" | "agent" | "phone";
  phoneNumber?: string;
}

interface AgentTransferResult {
  success: boolean;
  message: string;
  transactionId?: string;
  commission?: number;
  fee?: number;
}

export const agentTransferService = {
  async transfer(params: AgentTransferParams): Promise<AgentTransferResult> {
    try {
      const { agentWalletId, recipientWalletNumber, amount, agentPin, transferType, phoneNumber } = params;
      if (amount <= 0) return { success: false, message: "Invalid amount" };

      const feePercent = amount * 0.005;
      const fee = Math.max(5, Math.min(50, feePercent));
      const commission = amount * 0.01;
      const totalDeduction = amount + fee;

      const { data: agentWallet, error: walletError } = await supabase
        .from("wallets").select("*").eq("id", agentWalletId).single();
      if (walletError || !agentWallet) return { success: false, message: "Agent wallet not found" };
      if (agentWallet.transaction_pin !== agentPin) return { success: false, message: "Invalid PIN" };
      if (agentWallet.balance < totalDeduction) return { success: false, message: `Insufficient balance. Need KES ${totalDeduction.toFixed(2)} (amount + fee)` };

      const { data: recipientWallet, error: recipientError } = await supabase
        .from("wallets").select("*").eq("wallet_id", recipientWalletNumber).single();
      if (recipientError || !recipientWallet) return { success: false, message: "Recipient wallet not found" };

      const transactionId = `AGT-TRF-${Date.now()}`;

      await supabase.from("wallets").update({ balance: agentWallet.balance - totalDeduction }).eq("id", agentWalletId);
      await supabase.from("wallets").update({ balance: recipientWallet.balance + amount }).eq("id", recipientWallet.id);

      const { data: agent } = await supabase.from("agents").select("id").eq("user_id", agentWallet.user_id).single();

      await supabase.from("transactions").insert({
        transaction_id: transactionId,
        sender_wallet_id: agentWalletId,
        receiver_wallet_id: recipientWallet.id,
        type: `agent_transfer_${transferType}`,
        amount: amount,
        fee: fee,
        status: "completed",
        agent_id: agent?.id || null,
        commission_amount: commission,
        metadata: { transferType, phoneNumber },
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
          commission_percentage: 1,
          base_amount: amount,
          transaction_type: "transfer",
        } as any);
      }

      return { success: true, message: "Transfer successful", transactionId, commission, fee };
    } catch (error: any) {
      console.error("Agent transfer error:", error);
      return { success: false, message: error.message || "Failed to process transfer" };
    }
  },
};
