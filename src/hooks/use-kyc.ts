import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface KYCStatus {
  status: "pending" | "approved" | "rejected";
  documentsCount: number;
  isRequired: boolean;
}

export function useKYC(userId: string | undefined) {
  const [kyc, setKYC] = useState<KYCStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchKYC = async () => {
      if (!userId) {
        setKYC(null);
        setLoading(false);
        return;
      }

      try {
        // Fetch KYC status from profile
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("kyc_status")
          .eq("user_id", userId)
          .single();

        if (profileError) throw profileError;

        // Count documents
        const { count, error: countError } = await supabase
          .from("kyc_documents")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId);

        if (countError) throw countError;

        // Check if KYC is required
        const { data: settingsData, error: settingsError } = await supabase
          .from("system_settings")
          .select("value")
          .eq("key", "kyc_required")
          .single();

        if (!cancelled) {
          const isRequired =
            !settingsError && (settingsData?.value === "true" || settingsData?.value === true);

          setKYC({
            status: (profileData?.kyc_status || "pending") as any,
            documentsCount: count || 0,
            isRequired,
          });
        }
      } catch (error) {
        console.error("Error fetching KYC:", error);
        if (!cancelled) {
          setKYC({
            status: "pending",
            documentsCount: 0,
            isRequired: true,
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchKYC();

    // Subscribe to real-time changes on profiles
    const profileChannel = supabase
      .channel("kyc-changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchKYC();
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      profileChannel.unsubscribe();
    };
  }, [userId]);

  return { kyc, loading };
}

export default useKYC;
