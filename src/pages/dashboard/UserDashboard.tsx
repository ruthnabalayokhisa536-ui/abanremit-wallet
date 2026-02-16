import React, { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  Send,
  Phone,
  FileText,
  Bell,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { useWallet } from "@/hooks/use-wallet";
import { useProfile } from "@/hooks/use-profile";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

const UserDashboard = () => {
  const navigate = useNavigate();
  const { wallet, loading: walletLoading, refetch: refetchWallet } = useWallet();
  const { profile } = useProfile();
  const { user } = useAuth();

  const [transactions, setTransactions] = useState<any[]>([]);
  const [txLoading, setTxLoading] = useState(true);

  const kycStatus = profile?.kyc_status;

  const fetchTransactions = useCallback(async () => {
    if (!user?.id || !wallet?.id) {
      setTxLoading(false);
      return;
    }

    try {
      // Fetch both regular and M-Pesa transactions in parallel with minimal limit
      const [regularTx, mpesaTx] = await Promise.all([
        supabase
          .from("transactions")
          .select("id, type, amount, sender_wallet_id, receiver_wallet_id, created_at, transaction_id")
          .or(`sender_wallet_id.eq.${wallet.id},receiver_wallet_id.eq.${wallet.id}`)
          .order("created_at", { ascending: false })
          .limit(3), // Reduced to 3 for faster loading
        supabase
          .from("mpesa_transactions")
          .select("id, amount, user_id, mpesa_receipt_number, checkout_request_id, status, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(3), // Reduced to 3 for faster loading
      ]);

      // Combine and sort transactions
      const allTx = [
        ...(regularTx.data || []).map((tx) => ({ ...tx, source: "regular" })),
        ...(mpesaTx.data || []).map((tx) => ({
          ...tx,
          source: "mpesa",
          type: "deposit",
          transaction_id: tx.mpesa_receipt_number || tx.checkout_request_id,
        })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setTransactions(allTx.slice(0, 3)); // Show only 3 most recent
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
    } finally {
      setTxLoading(false);
    }
  }, [user?.id, wallet?.id]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Consolidate subscriptions into single channel for better performance
  useEffect(() => {
    if (!user?.id || !wallet?.id) return;

    const channel = supabase
      .channel(`user-dashboard-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "transactions",
          filter: `sender_wallet_id=eq.${wallet.id},receiver_wallet_id=eq.${wallet.id}`,
        },
        () => fetchTransactions()
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "mpesa_transactions",
          filter: `user_id=eq.${user.id}`,
        },
        () => fetchTransactions()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, wallet?.id, fetchTransactions]);

  const actions = [
    { label: "Load Wallet", icon: ArrowDownCircle, path: "/dashboard/deposit", color: "text-success" },
    { label: "Withdraw", icon: ArrowUpCircle, path: "/dashboard/withdraw", color: "text-warning" },
    { label: "Send Money", icon: Send, path: "/dashboard/send", color: "text-primary" },
    { label: "Buy Airtime", icon: Phone, path: "/dashboard/airtime", color: "text-accent-foreground" },
    { label: "Statements", icon: FileText, path: "/dashboard/statements", color: "text-muted-foreground" },
    { label: "Notifications", icon: Bell, path: "/dashboard/notifications", color: "text-destructive" },
  ];

  // Show skeleton loading state while wallet is loading
  if (walletLoading) {
    return (
      <DashboardLayout role="user">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="p-6 bg-gradient-to-br from-primary to-primary/80 rounded-lg animate-pulse">
            <div className="h-12 bg-white/20 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-white/20 rounded w-1/3"></div>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="user">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* ================= KYC STATUS ================= */}

        {kycStatus && kycStatus !== "approved" && (
          <Card
            className={`p-4 border-l-4 ${
              kycStatus === "pending"
                ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-950"
                : "border-red-500 bg-red-50 dark:bg-red-950"
            }`}
          >
            <div className="flex items-start gap-3">
              {kycStatus === "pending" ? (
                <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              )}

              <div className="flex-1">
                <h3
                  className={`font-semibold ${
                    kycStatus === "pending"
                      ? "text-yellow-900 dark:text-yellow-100"
                      : "text-red-900 dark:text-red-100"
                  }`}
                >
                  {kycStatus === "pending"
                    ? "KYC Verification Pending"
                    : "KYC Verification Rejected"}
                </h3>

                <p
                  className={`text-sm mt-1 ${
                    kycStatus === "pending"
                      ? "text-yellow-800 dark:text-yellow-200"
                      : "text-red-800 dark:text-red-200"
                  }`}
                >
                  {kycStatus === "pending"
                    ? "Complete your identity verification to unlock all features like higher transaction limits and agent services."
                    : "Your KYC verification was rejected. Please review and resubmit your documents."}
                </p>

                <Button
                  size="sm"
                  className="mt-3"
                  onClick={() => navigate("/dashboard/kyc-verification")}
                >
                  {kycStatus === "pending"
                    ? "Complete KYC"
                    : "Resubmit Documents"}
                </Button>
              </div>
            </div>
          </Card>
        )}

        {kycStatus === "approved" && (
          <Card className="p-4 border-l-4 border-green-500 bg-green-50 dark:bg-green-950">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
              <div>
                <p className="font-semibold text-green-900 dark:text-green-100">
                  KYC Verification Approved
                </p>
                <p className="text-sm text-green-800 dark:text-green-200 mt-1">
                  All features unlocked. You can now enjoy unlimited transactions and agent services.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* ================= WALLET CARD ================= */}

        <Card className="p-6 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Wallet className="w-6 h-6" />
                <span className="text-sm opacity-90">Wallet Balance</span>
              </div>

              <p className="text-4xl font-bold">
                KES{" "}
                {(wallet?.balance ?? 0).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
              </p>
              
              {wallet?.wallet_id && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs opacity-75">Wallet Number:</span>
                  <span className="font-mono font-bold text-lg bg-white/20 px-3 py-1 rounded">
                    {wallet.wallet_id}
                  </span>
                </div>
              )}
            </div>
            <Wallet className="w-16 h-16 opacity-20" />
          </div>
        </Card>

        {/* ================= PIN SETUP REMINDER ================= */}
        {wallet && !wallet.transaction_pin && (
          <Card className="p-4 border-l-4 border-orange-500 bg-orange-50 dark:bg-orange-950">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-orange-900 dark:text-orange-100">
                  Set Up Transaction PIN
                </h3>
                <p className="text-sm mt-1 text-orange-800 dark:text-orange-200">
                  Secure your transactions by setting up a 4-digit PIN. Required for sending money and withdrawals.
                </p>
                <Button
                  size="sm"
                  className="mt-3"
                  onClick={() => navigate("/dashboard/setup-pin")}
                >
                  Set Up PIN Now
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* ================= ACTION BUTTONS ================= */}

        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {actions.map((action) => (
            <Button
              key={action.label}
              variant="outline"
              onClick={() => navigate(action.path)}
              className="flex flex-col items-center gap-2 h-auto py-4"
            >
              <action.icon className={`w-5 h-5 ${action.color}`} />
              <span className="text-xs">{action.label}</span>
            </Button>
          ))}
        </div>

        {/* ================= TRANSACTIONS ================= */}

        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-4 text-foreground">
            Recent Transactions
          </h3>

          {transactions.length === 0 && !txLoading ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No transactions yet.
            </p>
          ) : (
            <div>
              {transactions.map((tx) => {
                const isCredit = tx.receiver_wallet_id === wallet?.id;

                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between py-3 border-b border-border last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium capitalize">
                        {tx.source === "mpesa" ? "M-Pesa Deposit" : tx.type}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {tx.transaction_id} •{" "}
                        {new Date(tx.created_at).toLocaleString()}
                      </p>
                      {tx.source === "mpesa" && (
                        <p className="text-xs text-success mt-1">
                          {tx.status === "completed"
                            ? "✓ Completed"
                            : tx.status === "pending"
                            ? "⏳ Pending"
                            : "✗ Failed"}
                        </p>
                      )}
                    </div>

                    <span
                      className={`text-sm font-semibold ${
                        tx.source === "mpesa" || isCredit
                          ? "text-success"
                          : "text-foreground"
                      }`}
                    >
                      {tx.source === "mpesa" || isCredit ? "+" : "-"}KES{" "}
                      {Number(tx.amount).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default UserDashboard;
