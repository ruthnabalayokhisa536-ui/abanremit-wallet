import { supabase } from "@/integrations/supabase/client";

interface AgentWithdrawParams {
  agentWalletId: string;
  amount: number;
  agentPin: string;
  method: "mpesa" | "bank";
  destination?: string; // phone number or bank account
}

interface AgentWithdrawResult {
  success: boolean;
  message: string;
  transactionId?: string;
  fee?: number;
}

export const agentWithdrawService = {
  /**
   * Agent withdraws money from their wallet
   */
  async withdraw(params: AgentWithdrawParams): Promise<AgentWithdrawResult> {
    try {
      const { agentWalletId, amount, agentPin, method, destination } = params;

      // Validate amount
      if (amount <= 0) {
        return { success: false, message: "Invalid amount" };
      }

      // Calculate fee (1.5%, min 50, max 100)
      const feePercent = amount * 0.015;
      const fee = Math.max(50, Math.min(100, feePercent));
      const totalDeduction = amount + fee;

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

      // Check balance
      if (agentWallet.balance < totalDeduction) {
        return {
          success: false,
          message: `Insufficient balance. Need KES ${totalDeduction.toFixed(2)} (amount + fee)`,
        };
      }

      const transactionId = `AGT-WD-${Date.now()}`;

      // Deduct from agent wallet
      const { error: deductError } = await supabase
        .from("wallets")
        .update({ balance: agentWallet.balance - totalDeduction })
        .eq("id", agentWalletId);

      if (deductError) throw deductError;

      // Get agent record
      const { data: agent } = await supabase
        .from("agents")
        .select("id")
        .eq("user_id", agentWallet.user_id)
        .single();

      // Record transaction
      const { error: txError } = await supabase
        .from("transactions")
        .insert({
          transaction_id: transactionId,
          sender_wallet_id: agentWalletId,
          receiver_wallet_id: null,
          type: "agent_withdraw",
          amount: amount,
          fee: fee,
          status: "completed",
          description: `Agent withdrawal via ${method}${destination ? ` to ${destination}` : ""}`,
          agent_id: agent?.id,
          metadata: {
            method,
            destination,
          },
        });

      if (txError) throw txError;

      return {
        success: true,
        message: "Withdrawal successful",
        transactionId,
        fee,
      };
    } catch (error: any) {
      console.error("Agent withdraw error:", error);
      return {
        success: false,
        message: error.message || "Failed to process withdrawal",
      };
    }
  },
};
