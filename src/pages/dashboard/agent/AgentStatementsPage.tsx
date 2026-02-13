import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWallet } from "@/hooks/use-wallet";

const AgentStatementsPage = () => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { wallet } = useWallet();

  useEffect(() => {
    const fetch = async () => {
      if (!wallet) return;
      const { data } = await supabase
        .from("transactions")
        .select("*")
        .or(`sender_wallet_id.eq.${wallet.id},receiver_wallet_id.eq.${wallet.id}`)
        .order("created_at", { ascending: false })
        .limit(100);
      setTransactions(data || []);
      setLoading(false);
    };
    if (wallet) fetch();
  }, [wallet]);

  const handleDownload = () => {
    const csv = "Transaction ID,Type,Amount,Fee,Date\n" + transactions.map(t =>
      `${t.transaction_id},${t.type},${t.amount},${t.fee},${new Date(t.created_at).toLocaleString()}`
    ).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "AbanRemit_Agent_Statement.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout role="agent">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">Statements</h2>
          <Button onClick={handleDownload} variant="outline" className="gap-2">
            <Download className="w-4 h-4" /> Download CSV
          </Button>
        </div>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-3 font-medium text-muted-foreground">Transaction ID</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Type</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Amount</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Fee</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No transactions yet.</td></tr>
                ) : transactions.map((tx) => {
                  const isCredit = tx.receiver_wallet_id === wallet?.id;
                  return (
                    <tr key={tx.id} className="border-b border-border last:border-0">
                      <td className="p-3 font-mono text-xs">{tx.transaction_id}</td>
                      <td className="p-3 capitalize">{tx.type}</td>
                      <td className={`p-3 text-right font-medium ${isCredit ? "text-success" : ""}`}>
                        {isCredit ? "+" : "-"}KES {Number(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-right text-muted-foreground">KES {Number(tx.fee).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="p-3 text-right text-muted-foreground">{new Date(tx.created_at).toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AgentStatementsPage;
