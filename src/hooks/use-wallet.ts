import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface WalletData {
  id: string;
  wallet_id: string;
  wallet_number: string | null;
  balance: number;
  status: string;
  user_id: string;
  transaction_pin?: string;
}

export function useWallet() {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchWallet = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setWallet(null); setLoading(false); return; }
        if (cancelled) return;

        const { data, error } = await supabase
          .from("wallets")
          .select("id, wallet_id, wallet_number, balance, status, user_id, transaction_pin")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error("[useWallet] Error fetching wallet:", error);
          if (!cancelled) setLoading(false);
          return;
        }

        if (data && (data as any).user_id !== user.id) {
          if (!cancelled) { setWallet(null); setLoading(false); }
          return;
        }

        if (!cancelled && data) setWallet(data as unknown as WalletData);
        if (!cancelled) setLoading(false);
      } catch (error) {
        if (!(error instanceof Error && error.name === 'AbortError')) {
          console.error("Failed to fetch wallet:", error);
        }
        if (!cancelled) setLoading(false);
      }
    };

    fetchWallet();

    const setupRealtimeSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      
      const channel = supabase
        .channel(`wallet-${user.id}`)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "wallets", filter: `user_id=eq.${user.id}` },
          (payload) => {
            const newData = payload.new as any;
            if (newData && newData.user_id === user.id && !cancelled) {
              setWallet(newData as WalletData);
            }
          }
        )
        .subscribe();

      return () => supabase.removeChannel(channel);
    };
    
    setupRealtimeSubscription();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchWallet();
    });

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, []);

  const refetch = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("wallets")
        .select("id, wallet_id, wallet_number, balance, status, user_id, transaction_pin")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (error) { console.error("[useWallet] Error refetching wallet:", error); return; }
      if (data && (data as any).user_id !== user.id) { setWallet(null); return; }
      if (data) setWallet(data as unknown as WalletData);
    } catch (error) { console.error("Failed to refetch wallet:", error); }
  };

  return { wallet, loading, refetch };
}
