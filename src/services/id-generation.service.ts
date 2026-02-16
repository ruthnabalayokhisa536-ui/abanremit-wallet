import { supabase } from "@/integrations/supabase/client";

export interface IDGenerationResponse {
  walletId: string;
  agentId?: string;
  agentNumber?: string;
}

export const idGenerationService = {
  async generateWalletId(): Promise<string> {
    try {
      const { count, error } = await supabase.from("wallets").select("*", { count: "exact", head: true });
      if (error) throw error;
      const nextNumber = (count || 0) + 1;
      const walletId = `WLT${String(888000 + nextNumber).padStart(6, "0")}`;

      const { data } = await supabase.from("wallets").select("id").eq("wallet_id", walletId).maybeSingle();
      if (data) return idGenerationService.generateWalletId();
      return walletId;
    } catch (error) {
      console.error("Error generating wallet ID:", error);
      return `WLT${Date.now().toString().slice(-6)}`;
    }
  },

  async generateAgentIds(): Promise<{ agentId: string; agentNumber: string }> {
    try {
      const agentId = `AGT-${crypto.randomUUID()}`;
      const { count, error } = await supabase.from("agents").select("*", { count: "exact", head: true });
      if (error) throw error;
      const nextNumber = (count || 0) + 1;
      const agentNumber = `${String(777000 + nextNumber).padStart(6, "0")}`;

      // Check uniqueness using agent_id column (which exists in schema)
      const { data } = await supabase.from("agents").select("id").eq("agent_id", agentNumber).maybeSingle();
      if (data) return idGenerationService.generateAgentIds();
      return { agentId, agentNumber };
    } catch (error) {
      console.error("Error generating agent IDs:", error);
      return { agentId: `AGT-${crypto.randomUUID()}`, agentNumber: `${777000 + Math.floor(Math.random() * 9999)}` };
    }
  },

  async getNextWalletIdPreview(): Promise<string> {
    try {
      const { count, error } = await supabase.from("wallets").select("*", { count: "exact", head: true });
      if (error) throw error;
      return `WLT${String(888000 + (count || 0) + 1).padStart(6, "0")}`;
    } catch (error) {
      return "WLT888001";
    }
  },

  async createWalletWithId(userId: string): Promise<string | null> {
    try {
      const walletId = await idGenerationService.generateWalletId();
      const { data, error } = await supabase
        .from("wallets").insert({ user_id: userId, wallet_id: walletId, balance: 0, status: "active" })
        .select("wallet_id").single();
      if (error) { console.error("Error creating wallet:", error); return null; }
      return (data as any)?.wallet_id || walletId;
    } catch (error) {
      console.error("Error creating wallet with ID:", error);
      return null;
    }
  },

  async createAgentWithIds(userId: string, businessName?: string): Promise<{ agentId: string; agentNumber: string } | null> {
    try {
      const { agentId, agentNumber } = await idGenerationService.generateAgentIds();
      const { data, error } = await supabase
        .from("agents").insert({
          user_id: userId, agent_id: agentId, business_name: businessName,
          commission_balance: 0, status: "active",
        } as any)
        .select("agent_id")
        .single();
      if (error) { console.error("Error creating agent:", error); return null; }
      return { agentId: (data as any)?.agent_id || agentId, agentNumber };
    } catch (error) {
      console.error("Error creating agent with IDs:", error);
      return null;
    }
  },
};

export default idGenerationService;
