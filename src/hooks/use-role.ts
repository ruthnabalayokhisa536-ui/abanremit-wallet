import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

export function useRole() {
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [agentId, setAgentId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const fetchRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) {
        setRole(null);
        setLoading(false);
        return;
      }

      // Fetch role and agent data in parallel if needed
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .limit(3); // Limit to 3 since we only check for admin, agent, user

      if (cancelled) return;

      // Determine primary role (priority: admin > agent > user)
      let primaryRole: AppRole = "user";
      let fetchedAgentId: string | null = null;

      if (rolesData && rolesData.length > 0) {
        const roles = rolesData.map(r => r.role);
        
        if (roles.includes("admin")) {
          primaryRole = "admin";
        } else if (roles.includes("agent")) {
          primaryRole = "agent";
          
          // Fetch agent ID only if role is agent
          const { data: agentData } = await supabase
            .from("agents")
            .select("agent_id")
            .eq("user_id", user.id)
            .eq("status", "active")
            .maybeSingle(); // Use maybeSingle instead of single to avoid errors
          
          fetchedAgentId = agentData?.agent_id || null;
        }
      }

      if (!cancelled) {
        const previousRole = role;
        setRole(primaryRole);
        setAgentId(fetchedAgentId);
        setLoading(false);

        // Auto-redirect if role changed
        if (previousRole && previousRole !== primaryRole) {
          console.log(`Role changed from ${previousRole} to ${primaryRole}, redirecting...`);
          
          if (primaryRole === "admin") {
            navigate("/admin", { replace: true });
          } else if (primaryRole === "agent") {
            navigate("/agent", { replace: true });
          } else {
            navigate("/dashboard", { replace: true });
          }
        }
      }
    };

    fetchRole();

    // Setup real-time subscription only for role changes
    let channel: any;
    
    const setupRealtimeSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user || cancelled) return null;

      return supabase
        .channel(`role-changes-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "user_roles",
            filter: `user_id=eq.${user.id}`
          },
          () => {
            console.log("Role change detected, refetching...");
            fetchRole();
          }
        )
        .subscribe();
    };

    setupRealtimeSubscription().then(ch => {
      if (ch) channel = ch;
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchRole();
    });

    return () => {
      cancelled = true;
      if (channel) {
        supabase.removeChannel(channel);
      }
      subscription.unsubscribe();
    };
  }, [navigate]); // Removed 'role' from dependencies to prevent infinite loops

  return { role, loading, agentId };
}
