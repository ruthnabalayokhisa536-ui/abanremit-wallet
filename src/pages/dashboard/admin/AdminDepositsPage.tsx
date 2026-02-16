import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { ArrowDownCircle } from "lucide-react";

interface DepositTransaction {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  transaction_id?: string;
  mpesa_receipt_number?: string;
  phone_number?: string;
  user_id: string;
  source: "regular" | "mpesa";
}

const AdminDepositsPage = () => {
  const [deposits, setDeposits] = useState<DepositTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDeposits = async () => {
      // Fetch regular deposit transactions
      const { data: regularDeposits } = await supabase
        .from("transactions")
        .select("*")
        .eq("type", "deposit")
        .order("created_at", { ascending: false })
        .limit(50);

      // Fetch M-Pesa deposit transactions
      const { data: mpesaDeposits } = await supabase
        .from("mpesa_transactions" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      // Combine both types
      const allDeposits: DepositTransaction[] = [
        ...(regularDeposits || []).map((tx: any) => ({
          ...tx,
          user_id: tx.sender_wallet_id || tx.receiver_wallet_id || "",
          source: "regular" as const,
        })),
        ...(mpesaDeposits || []).map((tx: any) => ({
          id: tx.id,
          amount: tx.amount,
          status: tx.status,
          created_at: tx.created_at,
          transaction_id: tx.checkout_request_id,
          mpesa_receipt_number: tx.mpesa_receipt_number,
          phone_number: tx.phone_number,
          user_id: tx.user_id,
          source: "mpesa" as const,
        })),
      ].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setDeposits(allDeposits);
      setLoading(false);
    };

    fetchDeposits();

    // Real-time subscription
    const channel = supabase
      .channel("admin-deposits-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transactions" },
        () => fetchDeposits()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "mpesa_transactions" as any },
        () => fetchDeposits()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: any; label: string }> = {
      completed: { variant: "default", label: "Completed" },
      pending: { variant: "secondary", label: "Pending" },
      failed: { variant: "destructive", label: "Failed" },
    };

    const config = statusMap[status] || { variant: "secondary", label: status };
    return (
      <Badge variant={config.variant} className="text-xs">
        {config.label}
      </Badge>
    );
  };

  return (
    <DashboardLayout role="admin">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <ArrowDownCircle className="w-6 h-6 text-success" />
          <h2 className="text-2xl font-bold text-foreground">
            Deposit Transactions
          </h2>
        </div>

        <Card className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 text-sm font-semibold text-muted-foreground">
                    Date
                  </th>
                  <th className="text-left py-3 px-2 text-sm font-semibold text-muted-foreground">
                    Type
                  </th>
                  <th className="text-left py-3 px-2 text-sm font-semibold text-muted-foreground">
                    Transaction ID
                  </th>
                  <th className="text-left py-3 px-2 text-sm font-semibold text-muted-foreground">
                    Phone
                  </th>
                  <th className="text-right py-3 px-2 text-sm font-semibold text-muted-foreground">
                    Amount
                  </th>
                  <th className="text-center py-3 px-2 text-sm font-semibold text-muted-foreground">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {deposits.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No deposit transactions yet.
                    </td>
                  </tr>
                ) : (
                  deposits.map((deposit) => (
                    <tr
                      key={deposit.id}
                      className="border-b border-border last:border-0 hover:bg-muted/50"
                    >
                      <td className="py-3 px-2 text-sm">
                        {new Date(deposit.created_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-2 text-sm">
                        <Badge
                          variant="outline"
                          className={
                            deposit.source === "mpesa"
                              ? "bg-green-50 text-green-700 border-green-200"
                              : ""
                          }
                        >
                          {deposit.source === "mpesa" ? "M-Pesa" : "Regular"}
                        </Badge>
                      </td>
                      <td className="py-3 px-2 text-sm font-mono text-xs">
                        {deposit.source === "mpesa"
                          ? deposit.mpesa_receipt_number ||
                            deposit.transaction_id?.substring(0, 20) + "..."
                          : deposit.transaction_id?.substring(0, 20) + "..."}
                      </td>
                      <td className="py-3 px-2 text-sm">
                        {deposit.phone_number || "—"}
                      </td>
                      <td className="py-3 px-2 text-sm text-right font-semibold text-success">
                        +KES{" "}
                        {Number(deposit.amount).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="py-3 px-2 text-center">
                        {getStatusBadge(deposit.status)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="text-sm text-muted-foreground">
          Showing {deposits.length} deposit transaction(s)
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDepositsPage;
