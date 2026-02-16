import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

type Transaction = Database["public"]["Tables"]["transactions"]["Row"];

interface UseTransactionsOptions {
  walletId?: string;
  limit?: number;
  type?: string;
}

export function useTransactions(options: UseTransactionsOptions = {}) {
  const { walletId, limit = 50, type } = options;
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchTransactions = async () => {
      try {
        if (!walletId) {
          setTransactions([]);
          setLoading(false);
          return;
        }

        let query = supabase
          .from("transactions")
          .select("*")
          .or(`sender_wallet_id.eq.${walletId},receiver_wallet_id.eq.${walletId}`)
          .order("created_at", { ascending: false })
          .limit(limit);

        if (type) {
          query = query.eq("type", type);
        }

        const { data, error } = await query;

        if (error) throw error;

        if (!cancelled) {
          setTransactions(data || []);
          setLoading(false);
        }
      } catch (error) {
        console.error("Failed to fetch transactions:", error);
        if (!cancelled) {
          setTransactions([]);
          setLoading(false);
        }
      }
    };

    fetchTransactions();

    // Real-time transaction updates
    if (walletId) {
      const channel = supabase
        .channel(`transactions-${walletId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "transactions",
            filter: `sender_wallet_id=eq.${walletId}`,
          },
          (payload) => {
            if (!cancelled && payload.new) {
              setTransactions((prev) => [payload.new as Transaction, ...prev].slice(0, limit));
            }
          }
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "transactions",
            filter: `receiver_wallet_id=eq.${walletId}`,
          },
          (payload) => {
            if (!cancelled && payload.new) {
              setTransactions((prev) => {
                // Avoid duplicates
                if (prev.some((t) => t.id === (payload.new as Transaction).id)) {
                  return prev;
                }
                return [payload.new as Transaction, ...prev].slice(0, limit);
              });
            }
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "transactions",
            filter: `sender_wallet_id=eq.${walletId}`,
          },
          (payload) => {
            if (!cancelled && payload.new) {
              setTransactions((prev) =>
                prev.map((t) => (t.id === (payload.new as Transaction).id ? (payload.new as Transaction) : t))
              );
            }
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "transactions",
            filter: `receiver_wallet_id=eq.${walletId}`,
          },
          (payload) => {
            if (!cancelled && payload.new) {
              setTransactions((prev) =>
                prev.map((t) => (t.id === (payload.new as Transaction).id ? (payload.new as Transaction) : t))
              );
            }
          }
        )
        .subscribe();

      return () => {
        cancelled = true;
        supabase.removeChannel(channel);
      };
    }

    return () => {
      cancelled = true;
    };
  }, [walletId, limit, type]);

  const refetch = async () => {
    if (!walletId) return;

    try {
      let query = supabase
        .from("transactions")
        .select("*")
        .or(`sender_wallet_id.eq.${walletId},receiver_wallet_id.eq.${walletId}`)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (type) {
        query = query.eq("type", type);
      }

      const { data, error } = await query;

      if (error) throw error;

      setTransactions(data || []);
    } catch (error) {
      console.error("Failed to refetch transactions:", error);
    }
  };

  return { transactions, loading, refetch };
}
