import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

export function useRole() {
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) {
        setRole(null);
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .limit(1)
        .single();

      if (!cancelled) {
        setRole(data?.role ?? "user");
        setLoading(false);
      }
    };

    fetchRole();

    // Real-time role listener
    const channel = supabase
      .channel("role-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_roles" },
        () => {
          fetchRole();
        }
      )
      .subscribe();

    // Also listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchRole();
    });

    return () => {
      cancelled = true;
      channel.unsubscribe();
      subscription.unsubscribe();
    };
  }, []);

  return { role, loading };
}
