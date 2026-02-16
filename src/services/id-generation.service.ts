import { supabase } from "@/integrations/supabase/client";

export interface IDGenerationResponse {
  walletId: string;
  agentId?: string;
  agentNumber?: string;
}

/**
 * ID Generation Service
 * Handles generation of unique wallet IDs (WLT888000+) and agent IDs (AGT+uuid)
 * Agent numbers: 777000 + incremental (777001, 777002, etc.)
 */
export const idGenerationService = {
  /**
   * Generate next wallet ID
   * Format: WLT + 6 digits starting from 888001
   * Example: WLT888001, WLT888002, WLT888003, etc.
   */
  async generateWalletId(): Promise<string> {
    try {
      // Get the count of existing wallets to determine next number
      const { count, error } = await supabase
        .from("wallets")
        .select("*", { count: "exact", head: true });

      if (error) {
        throw error;
      }

      // Start from 888001 (1st wallet), 888002 (2nd wallet), etc.
      const nextNumber = (count || 0) + 1;
      const walletId = `WLT${String(888000 + nextNumber).padStart(6, "0")}`;

      // Verify uniqueness (in case of race condition)
      const { data, error: checkError } = await supabase
        .from("wallets")
        .select("id")
        .eq("wallet_id", walletId)
        .maybeSingle();

      if (checkError) throw checkError;

      if (data) {
        // If collision occurs, recursively generate next ID
        return idGenerationService.generateWalletId();
      }

      return walletId;
    } catch (error) {
      console.error("Error generating wallet ID:", error);
      // Fallback to timestamp-based ID
      return `WLT${Date.now().toString().slice(-6)}`;
    }
  },

  /**
   * Generate agent ID and agent number
   * Agent ID: AGT + UUID (for backend)
   * Agent Number: 777000+ incremental (for display)
   * Format:
   * - agentId: AGT-{uuid}
   * - agentNumber: 777001, 777002, 777003, etc.
   */
  async generateAgentIds(): Promise<{ agentId: string; agentNumber: string }> {
    try {
      // Get UUID for agent ID
      const agentId = `AGT-${crypto.randomUUID()}`;

      // Get the count of existing agents
      const { count, error } = await supabase
        .from("agents")
        .select("*", { count: "exact", head: true });

      if (error) {
        throw error;
      }

      // Start from 777001 (1st agent), 777002 (2nd agent), etc.
      const nextNumber = (count || 0) + 1;
      const agentNumber = `${String(777000 + nextNumber).padStart(6, "0")}`;

      // Verify uniqueness of agent number
      const { data, error: checkError } = await supabase
        .from("agents")
        .select("id")
        .eq("agent_number", agentNumber)
        .maybeSingle();

      if (checkError) throw checkError;

      if (data) {
        // If collision occurs, recursively generate next ID
        return idGenerationService.generateAgentIds();
      }

      return { agentId, agentNumber };
    } catch (error) {
      console.error("Error generating agent IDs:", error);
      // Fallback
      return {
        agentId: `AGT-${crypto.randomUUID()}`,
        agentNumber: `${777000 + Math.floor(Math.random() * 9999)}`,
      };
    }
  },

  /**
   * Get next wallet ID without incrementing
   * (For preview purposes before actual creation)
   */
  async getNextWalletIdPreview(): Promise<string> {
    try {
      const { count, error } = await supabase
        .from("wallets")
        .select("*", { count: "exact", head: true });

      if (error) throw error;

      const nextNumber = (count || 0) + 1;
      return `WLT${String(888000 + nextNumber).padStart(6, "0")}`;
    } catch (error) {
      console.error("Error getting wallet ID preview:", error);
      return "WLT888001";
    }
  },

  /**
   * Create wallet with generated ID
   */
  async createWalletWithId(userId: string): Promise<string | null> {
    try {
      const walletId = await idGenerationService.generateWalletId();

      const { data, error } = await supabase
        .from("wallets")
        .insert({
          user_id: userId,
          wallet_id: walletId,
          balance: 0,
          status: "active",
        })
        .select("wallet_id")
        .single();

      if (error) {
        console.error("Error creating wallet:", error);
        return null;
      }

      return data?.wallet_id || walletId;
    } catch (error) {
      console.error("Error creating wallet with ID:", error);
      return null;
    }
  },

  /**
   * Create agent profile with generated IDs
   */
  async createAgentWithIds(
    userId: string,
    businessName?: string
  ): Promise<{ agentId: string; agentNumber: string } | null> {
    try {
      const { agentId, agentNumber } = await idGenerationService.generateAgentIds();

      const { data, error } = await supabase
        .from("agents")
        .insert({
          user_id: userId,
          agent_id: agentId,
          agent_number: agentNumber,
          business_name: businessName,
          commission_balance: 0,
          status: "active",
        })
        .select("agent_id, agent_number")
        .single();

      if (error) {
        console.error("Error creating agent:", error);
        return null;
      }

      return {
        agentId: data?.agent_id || agentId,
        agentNumber: data?.agent_number || agentNumber,
      };
    } catch (error) {
      console.error("Error creating agent with IDs:", error);
      return null;
    }
  },
};

export default idGenerationService;
