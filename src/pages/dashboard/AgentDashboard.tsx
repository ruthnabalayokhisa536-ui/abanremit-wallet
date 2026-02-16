import React, { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet, ArrowDownCircle, ArrowUpCircle, Send, DollarSign, Phone, Bell, Loader2, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { useWallet } from "@/hooks/use-wallet";
import { useProfile } from "@/hooks/use-profile";
import { useAuth } from "@/hooks/use-auth";
import { useKYC } from "@/hooks/use-kyc";
import { supabase } from "@/integrations/supabase/client";

const AgentDashboard = () => {
  const navigate = useNavigate();
  const { wallet, loading: walletLoading } = useWallet();
  const { profile } = useProfile();
  const { user } = useAuth();
  const { kyc } = useKYC(user?.id);
  const [agent, setAgent] = useState<any>(null);
  const [agentLoading, setAgentLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [txLoading, setTxLoading] = useState(true);

  useEffect(() => {
    const fetchAgent = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setAgentLoading(false);
          return;
        }
        const { data } = await supabase
          .from("agents")
          .select("id, user_id, agent_id, commission_balance, status")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();
        setAgent(data);
      } catch (error) {
        console.error("Failed to fetch agent:", error);
      } finally {
        setAgentLoading(false);
      }
    };
    fetchAgent();
  }, []);

  const fetchTransactions = useCallback(async () => {
    if (!wallet?.id) {
      setTxLoading(false);
      return;
    }

    try {
      const { data } = await supabase
        .from("transactions")
        .select("id, type, amount, sender_wallet_id, receiver_wallet_id, created_at, transaction_id")
        .or(`sender_wallet_id.eq.${wallet.id},receiver_wallet_id.eq.${wallet.id}`)
        .order("created_at", { ascending: false })
        .limit(3); // Reduced to 3 for faster loading
      setTransactions(data || []);
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
    } finally {
      setTxLoading(false);
    }
  }, [wallet?.id]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    if (!wallet?.id) return;

    // Real-time transaction updates - only on inserts
    const channel = supabase
      .channel(`agent-txs-${wallet.id}`)
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [wallet?.id, fetchTransactions]);

  const actions = [
    { label: "Deposit to Wallet", icon: ArrowDownCircle, path: "/agent/deposit", color: "text-success" },
    { label: "Withdraw", icon: ArrowUpCircle, path: "/agent/withdraw", color: "text-warning" },
    { label: "Send To", icon: Send, path: "/agent/transfer", color: "text-primary" },
    { label: "Sell Airtime", icon: Phone, path: "/agent/sell-airtime", color: "text-accent-foreground" },
    { label: "Commissions", icon: DollarSign, path: "/agent/commissions", color: "text-success" },
    { label: "Notifications", icon: Bell, path: "/agent/notifications", color: "text-destructive" },
  ];

  // Show skeleton loading state while wallet or agent is loading
  if (walletLoading || agentLoading) {
    return (
      <DashboardLayout role="agent">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="agent">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* KYC Status Alert */}
        {kyc && kyc.status !== "approved" && (
          <Card className={`p-4 border-l-4 ${
            kyc.status === "pending" 
              ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-950" 
              : "border-red-500 bg-red-50 dark:bg-red-950"
          }`}>
            <div className="flex items-start gap-3">
              {kyc.status === "pending" ? (
                <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1">
                <h3 className={`font-semibold ${
                  kyc.status === "pending" 
                    ? "text-yellow-900 dark:text-yellow-100" 
                    : "text-red-900 dark:text-red-100"
                }`}>
                  {kyc.status === "pending" ? "KYC Verification Pending" : "KYC Verification Rejected"}
                </h3>
                <p className={`text-sm mt-1 ${
                  kyc.status === "pending" 
                    ? "text-yellow-800 dark:text-yellow-200" 
                    : "text-red-800 dark:text-red-200"
                }`}>
                  {kyc.status === "pending" 
                    ? "Complete your identity verification to unlock full agent features and higher transaction limits."
                    : "Your KYC verification was rejected. Please review and resubmit your documents."}
                </p>
                <Button 
                  size="sm" 
                  className="mt-3"
                  onClick={() => navigate("/dashboard/kyc-verification")}
                >
                  {kyc.status === "pending" ? "Complete KYC" : "Resubmit Documents"}
                </Button>
              </div>
            </div>
          </Card>
        )}

        {kyc && kyc.status === "approved" && (
          <Card className="p-4 border-l-4 border-green-500 bg-green-50 dark:bg-green-950">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
              <div>
                <p className="font-semibold text-green-900 dark:text-green-100">KYC Verification Approved</p>
                <p className="text-sm text-green-800 dark:text-green-200 mt-1">
                  All agent features unlocked. You can process transactions with unlimited amounts.
                </p>
              </div>
            </div>
          </Card>
        )}
        
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="p-6 bg-primary text-primary-foreground">
            <div className="flex items-center gap-3 mb-4">
              <Wallet className="w-6 h-6" />
              <span className="text-sm opacity-80">Wallet Balance</span>
            </div>
            {walletLoading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                <p className="text-3xl font-bold">KES {(wallet?.balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                <p className="text-sm opacity-70 mt-2">Wallet ID: {wallet?.wallet_id ?? "—"}</p>
              </>
            )}
          </Card>
          <Card className="p-6 border-success/30 bg-success/5">
            <div className="flex items-center gap-3 mb-4">
              <DollarSign className="w-6 h-6 text-success" />
              <span className="text-sm text-muted-foreground">Commission Balance</span>
            </div>
            <p className="text-3xl font-bold text-success">KES {(agent?.commission_balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            <p className="text-sm text-muted-foreground mt-2">Agent ID: {agent?.agent_id ?? "—"}</p>
          </Card>
        </div>

        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {actions.map((action) => (
            <Button key={action.label} variant="outline" onClick={() => navigate(action.path)} className="flex flex-col items-center gap-2 h-auto py-4">
              <action.icon className={`w-5 h-5 ${action.color}`} />
              <span className="text-xs">{action.label.split(" ")[0]}</span>
            </Button>
          ))}
        </div>

        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-4 text-foreground">Recent Transactions</h3>
          {txLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No transactions yet.</p>
          ) : (
            <div className="space-y-0">
              {transactions.map((tx) => {
                const isCredit = tx.receiver_wallet_id === wallet?.id;
                return (
                  <div key={tx.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium text-foreground capitalize">{tx.type}</p>
                      <p className="text-xs text-muted-foreground">{tx.transaction_id} • {new Date(tx.created_at).toLocaleString()}</p>
                    </div>
                    <span className={`text-sm font-semibold ${isCredit ? "text-success" : "text-foreground"}`}>
                      {isCredit ? "+" : "-"}KES {Number(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
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

export default AgentDashboard;
