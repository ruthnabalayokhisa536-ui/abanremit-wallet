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
  /**
   * Agent deposits money to customer wallet
   */
  async depositToCustomer(params: AgentDepositParams): Promise<AgentDepositResult> {
    try {
      const { agentWalletId, customerWalletNumber, amount, method, agentPin } = params;

      // Validate amount
      if (amount <= 0) {
        return { success: false, message: "Invalid amount" };
      }

      // Get agent wallet
      const { data: agentWallet, error: agentWalletError } = await supabase
        .from("wallets")
        .select("*")
        .eq("id", agentWalletId)
        .single();

      if (agentWalletError || !agentWallet) {
        return { success: false, message: "Agent wallet not found" };
      }

      // Verify PIN
      if (agentWallet.transaction_pin !== agentPin) {
        return { success: false, message: "Invalid PIN" };
      }

      // Get customer wallet by wallet_id
      const { data: customerWallet, error: customerWalletError } = await supabase
        .from("wallets")
        .select("*")
        .eq("wallet_id", customerWalletNumber)
        .single();

      if (customerWalletError || !customerWallet) {
        return { success: false, message: "Customer wallet not found" };
      }

      // Check agent balance (only for wallet method)
      if (method === "wallet" && agentWallet.balance < amount) {
        return { success: false, message: "Insufficient agent balance" };
      }

      // Calculate commission (2% of deposit amount)
      const commission = amount * 0.02;

      const transactionId = `AGT-DEP-${Date.now()}`;

      // Deduct from agent wallet (if wallet method)
      if (method === "wallet") {
        const { error: deductError } = await supabase
          .from("wallets")
          .update({ balance: agentWallet.balance - amount })
          .eq("id", agentWalletId);

        if (deductError) throw deductError;
      }

      // Credit customer wallet
      const { error: creditError } = await supabase
        .from("wallets")
        .update({ balance: customerWallet.balance + amount })
        .eq("id", customerWallet.id);

      if (creditError) throw creditError;

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
          sender_wallet_id: method === "wallet" ? agentWalletId : null,
          receiver_wallet_id: customerWallet.id,
          type: "agent_deposit",
          amount: amount,
          fee: 0,
          status: "completed",
          description: `Agent deposit via ${method}`,
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
            transaction_type: "deposit",
          });
      }

      return {
        success: true,
        message: "Deposit successful",
        transactionId,
        commission,
      };
    } catch (error: any) {
      console.error("Agent deposit error:", error);
      return {
        success: false,
        message: error.message || "Failed to process deposit",
      };
    }
  },
};
