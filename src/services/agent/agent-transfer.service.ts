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
  /**
   * Agent transfers money to user wallet, another agent, or phone number
   */
  async transfer(params: AgentTransferParams): Promise<AgentTransferResult> {
    try {
      const { agentWalletId, recipientWalletNumber, amount, agentPin, transferType, phoneNumber } = params;

      // Validate amount
      if (amount <= 0) {
        return { success: false, message: "Invalid amount" };
      }

      // Calculate fee (0.5%, min 5, max 50)
      const feePercent = amount * 0.005;
      const fee = Math.max(5, Math.min(50, feePercent));

      // Calculate commission (1% of transfer amount)
      const commission = amount * 0.01;

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

      // Get recipient wallet
      const { data: recipientWallet, error: recipientError } = await supabase
        .from("wallets")
        .select("*")
        .eq("wallet_id", recipientWalletNumber)
        .single();

      if (recipientError || !recipientWallet) {
        return { success: false, message: "Recipient wallet not found" };
      }

      const transactionId = `AGT-TRF-${Date.now()}`;

      // Deduct from agent wallet
      const { error: deductError } = await supabase
        .from("wallets")
        .update({ balance: agentWallet.balance - totalDeduction })
        .eq("id", agentWalletId);

      if (deductError) throw deductError;

      // Credit recipient wallet
      const { error: creditError } = await supabase
        .from("wallets")
        .update({ balance: recipientWallet.balance + amount })
        .eq("id", recipientWallet.id);

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
          sender_wallet_id: agentWalletId,
          receiver_wallet_id: recipientWallet.id,
          type: `agent_transfer_${transferType}`,
          amount: amount,
          fee: fee,
          status: "completed",
          description: `Agent transfer to ${transferType}${phoneNumber ? ` (${phoneNumber})` : ""}`,
          agent_id: agent?.id,
          commission_amount: commission,
          metadata: {
            transferType,
            phoneNumber,
          },
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
            transaction_type: "transfer",
          });
      }

      return {
        success: true,
        message: "Transfer successful",
        transactionId,
        commission,
        fee,
      };
    } catch (error: any) {
      console.error("Agent transfer error:", error);
      return {
        success: false,
        message: error.message || "Failed to process transfer",
      };
    }
  },
};
