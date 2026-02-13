import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface WalletData {
  id: string;
  wallet_id: string;
  balance: number;
  status: string;
}

export function useWallet() {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchWallet = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) {
        setWallet(null);
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("wallets")
        .select("id, wallet_id, balance, status")
        .eq("user_id", user.id)
        .limit(1)
        .single();

      if (!cancelled && data) {
        setWallet(data);
      }
      if (!cancelled) setLoading(false);
    };

    fetchWallet();

    // Real-time wallet updates
    const channel = supabase
      .channel("wallet-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "wallets" },
        () => {
          fetchWallet();
        }
      )
      .subscribe();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchWallet();
    });

    return () => {
      cancelled = true;
      channel.unsubscribe();
      subscription.unsubscribe();
    };
  }, []);

  return { wallet, loading, refetch: () => {} };
}
