import { supabase } from "@/integrations/supabase/client";

interface RoleChangeResult {
  success: boolean;
  message: string;
  agent_id?: string;
}

export const roleManagementService = {
  /**
   * Promote user to agent
   */
  async promoteToAgent(userId: string): Promise<RoleChangeResult> {
    try {
      const { data, error } = await supabase.rpc('promote_user_to_agent' as any, {
        p_user_id: userId
      });

      if (error) {
        console.error("Promote to agent error:", error);
        
        // Handle specific error cases
        if (error.code === '409' || error.message?.includes('already')) {
          return {
            success: false,
            message: "User is already an agent"
          };
        }
        
        return {
          success: false,
          message: error.message || "Failed to promote user to agent"
        };
      }

      // Parse the JSON response
      const result = data as any;
      
      return {
        success: result.success ?? true,
        message: result.message || "User promoted to agent successfully",
        agent_id: result.agent_id
      };
    } catch (error: any) {
      console.error("Promote to agent error:", error);
      
      // Handle conflict errors
      if (error.code === '409' || error.message?.includes('already')) {
        return {
          success: false,
          message: "User is already an agent"
        };
      }
      
      return {
        success: false,
        message: error.message || "Failed to promote user to agent"
      };
    }
  },

  /**
   * Promote user to admin
   */
  async promoteToAdmin(userId: string): Promise<RoleChangeResult> {
    try {
      const { data, error } = await supabase.rpc('promote_user_to_admin' as any, {
        p_user_id: userId
      });

      if (error) {
        console.error("Promote to admin error:", error);
        return {
          success: false,
          message: error.message || "Failed to promote user to admin"
        };
      }

      return (data as any) as RoleChangeResult;
    } catch (error: any) {
      console.error("Promote to admin error:", error);
      return {
        success: false,
        message: error.message || "Failed to promote user to admin"
      };
    }
  },

  /**
   * Remove role from user
   */
  async removeRole(userId: string, role: 'admin' | 'agent'): Promise<RoleChangeResult> {
    try {
      const { data, error } = await supabase.rpc('remove_user_role' as any, {
        p_user_id: userId,
        p_role: role
      });

      if (error) {
        console.error("Remove role error:", error);
        return {
          success: false,
          message: error.message || "Failed to remove role"
        };
      }

      return (data as any) as RoleChangeResult;
    } catch (error: any) {
      console.error("Remove role error:", error);
      return {
        success: false,
        message: error.message || "Failed to remove role"
      };
    }
  },

  /**
   * Get user's current roles
   */
  async getUserRoles(userId: string) {
    try {
      const { data, error } = await supabase.rpc('get_user_roles' as any, {
        p_user_id: userId
      });

      if (error) {
        console.error("Get user roles error:", error);
        return null;
      }

      return data;
    } catch (error: any) {
      console.error("Get user roles error:", error);
      return null;
    }
  }
};
