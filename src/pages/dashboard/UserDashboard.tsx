import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet, ArrowDownCircle, ArrowUpCircle, Send, Phone, FileText, Bell, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { useWallet } from "@/hooks/use-wallet";
import { useProfile } from "@/hooks/use-profile";
import { supabase } from "@/integrations/supabase/client";

const UserDashboard = () => {
  const navigate = useNavigate();
  const { wallet, loading: walletLoading } = useWallet();
  const { profile } = useProfile();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [txLoading, setTxLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!wallet) return;
      const { data } = await supabase
        .from("transactions")
        .select("*")
        .or(`sender_wallet_id.eq.${wallet.id},receiver_wallet_id.eq.${wallet.id}`)
        .order("created_at", { ascending: false })
        .limit(10);
      setTransactions(data || []);
      setTxLoading(false);
    };
    if (wallet) fetchTransactions();
  }, [wallet]);

  const actions = [
    { label: "Load Wallet", icon: ArrowDownCircle, path: "/dashboard/deposit", color: "text-success" },
    { label: "Withdraw", icon: ArrowUpCircle, path: "/dashboard/withdraw", color: "text-warning" },
    { label: "Send Money", icon: Send, path: "/dashboard/send", color: "text-primary" },
    { label: "Buy Airtime", icon: Phone, path: "/dashboard/airtime", color: "text-accent-foreground" },
    { label: "Statements", icon: FileText, path: "/dashboard/statements", color: "text-muted-foreground" },
    { label: "Notifications", icon: Bell, path: "/dashboard/notifications", color: "text-destructive" },
  ];

  return (
    <DashboardLayout role="user">
      <div className="max-w-4xl mx-auto space-y-6">
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

        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {actions.map((action) => (
            <Button key={action.label} variant="outline" onClick={() => navigate(action.path)} className="flex flex-col items-center gap-2 h-auto py-4">
              <action.icon className={`w-5 h-5 ${action.color}`} />
              <span className="text-xs">{action.label}</span>
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

export default UserDashboard;
