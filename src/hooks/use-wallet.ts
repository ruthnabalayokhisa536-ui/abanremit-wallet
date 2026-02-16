import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface WalletData {
  id: string;
  wallet_id: string;
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
        if (!user) {
          setWallet(null);
          setLoading(false);
          return;
        }

        if (cancelled) return;

        const { data, error } = await supabase
          .from("wallets")
          .select("id, wallet_id, balance, status, user_id, transaction_pin")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error("[useWallet] Error fetching wallet:", error);
          if (!cancelled) setLoading(false);
          return;
        }

        // CRITICAL: Validate returned data matches authenticated user
        if (data && data.user_id !== user.id) {
          console.error("[useWallet] SECURITY: Wallet user_id mismatch!", {
            expected: user.id,
            received: data.user_id,
            timestamp: new Date().toISOString()
          });
          // Reject mismatched data
          if (!cancelled) {
            setWallet(null);
            setLoading(false);
          }
          return;
        }

        if (!cancelled && data) {
          setWallet(data);
        }
        if (!cancelled) setLoading(false);
      } catch (error) {
        // Suppress AbortError in development (caused by rapid mount/unmount)
        if (error instanceof Error && error.name === 'AbortError') {
          console.debug('[useWallet] Request aborted (normal in development)');
        } else {
          console.error("Failed to fetch wallet:", error);
        }
        if (!cancelled) setLoading(false);
      }
    };

    fetchWallet();

    // Real-time wallet updates - only listen to specific user's wallet
    const setupRealtimeSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      
      const channel = supabase
        .channel(`wallet-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "wallets",
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            // CRITICAL: Validate user_id in real-time update
            const newData = payload.new as WalletData;
            if (newData && newData.user_id !== user.id) {
              console.error("[useWallet] SECURITY: Real-time update user_id mismatch!", {
                expected: user.id,
                received: newData.user_id,
                timestamp: new Date().toISOString()
              });
              // Reject mismatched update
              return;
            }
            
            // Immediately update wallet state for real-time balance
            if (newData && !cancelled) {
              setWallet(newData);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
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
        .select("id, wallet_id, balance, status, user_id, transaction_pin")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("[useWallet] Error refetching wallet:", error);
        return;
      }

      // CRITICAL: Validate returned data matches authenticated user
      if (data && data.user_id !== user.id) {
        console.error("[useWallet] SECURITY: Wallet user_id mismatch on refetch!", {
          expected: user.id,
          received: data.user_id,
          timestamp: new Date().toISOString()
        });
        // Reject mismatched data
        setWallet(null);
        return;
      }

      if (data) {
        setWallet(data);
      }
    } catch (error) {
      console.error("Failed to refetch wallet:", error);
    }
  };

  return { wallet, loading, refetch };
}
