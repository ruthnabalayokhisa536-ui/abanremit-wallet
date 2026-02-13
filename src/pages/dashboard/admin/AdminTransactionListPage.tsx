import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  type: "deposit" | "withdrawal" | "transfer";
}

const AdminTransactionListPage: React.FC<Props> = ({ type }) => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("transactions")
        .select("*")
        .eq("type", type)
        .order("created_at", { ascending: false })
        .limit(100);
      setTransactions(data || []);
      setLoading(false);
    };
    fetch();
  }, [type]);

  const title = type === "deposit" ? "Deposits" : type === "withdrawal" ? "Withdrawals" : "Transfers";

  return (
    <DashboardLayout role="admin">
      <div className="max-w-6xl mx-auto space-y-6">
        <h2 className="text-2xl font-bold text-foreground">{title}</h2>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-3 font-medium text-muted-foreground">Transaction ID</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Amount</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Fee</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No {title.toLowerCase()} found.</td></tr>
                ) : transactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-border last:border-0">
                    <td className="p-3 font-mono text-xs">{tx.transaction_id}</td>
                    <td className="p-3 text-right font-medium">KES {Number(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="p-3 text-right text-muted-foreground">KES {Number(tx.fee).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="p-3 text-center">
                      <Badge variant={tx.status === "completed" ? "default" : tx.status === "pending" ? "secondary" : "destructive"} className="text-xs capitalize">{tx.status}</Badge>
                    </td>
                    <td className="p-3 text-right text-muted-foreground">{new Date(tx.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminTransactionListPage;
