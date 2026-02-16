import React, { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWallet } from "@/hooks/use-wallet";
import { useTransactions } from "@/hooks/use-transactions";
import { toast } from "sonner";

const StatementsPage = () => {
  const [showFeeDialog, setShowFeeDialog] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const { wallet } = useWallet();
  const { transactions, loading } = useTransactions({ walletId: wallet?.id, limit: 100 });

  const handleDownload = async () => {
    if (!wallet) {
      toast.error("Wallet not found");
      return;
    }

    const FEE = 50;
    if (wallet.balance < FEE) {
      toast.error("Insufficient balance. You need KES 50 to download statement.");
      setShowFeeDialog(false);
      return;
    }

    setDownloading(true);
    try {
      // Deduct fee from wallet
      const { error: walletError } = await supabase
        .from("wallets")
        .update({ balance: wallet.balance - FEE })
        .eq("id", wallet.id);

      if (walletError) throw walletError;

      // Record transaction
      const { error: txError } = await supabase
        .from("transactions")
        .insert({
          sender_wallet_id: wallet.id,
          type: "statement_fee",
          amount: FEE,
          fee: 0,
          status: "completed",
          metadata: { description: "Statement download fee" },
          balance_after: wallet.balance - FEE,
        });

      if (txError) throw txError;

      // Generate and download CSV
      const csv = "Transaction ID,Type,Amount,Fee,Date\n" + transactions.map(t =>
        `${t.receipt_reference || t.id},${t.type},${t.amount},${t.fee || 0},${new Date(t.created_at).toLocaleString()}`
      ).join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `AbanRemit_Statement_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      setDownloaded(true);
      setShowFeeDialog(false);
      toast.success("Statement downloaded! KES 50 deducted from wallet.");
    } catch (error: any) {
      console.error("Download error:", error);
      toast.error(error.message || "Failed to download statement");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <DashboardLayout role="user">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">Statements</h2>
          <Button onClick={() => setShowFeeDialog(true)} variant="outline" className="gap-2">
            <Download className="w-4 h-4" /> Download CSV
          </Button>
        </div>

        {showFeeDialog && (
          <Card className="p-6 border-warning/50 bg-warning/5">
            <h3 className="text-lg font-semibold text-foreground">Statement Download Fee</h3>
            <p className="text-sm text-muted-foreground mt-2">
              A fee of <strong className="text-destructive">KES 50.00</strong> will be deducted from your wallet balance.
            </p>
            <p className="text-sm text-muted-foreground mt-1">Current Balance: <strong>KES {(wallet?.balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></p>
            <div className="flex gap-3 mt-4">
              <Button variant="outline" onClick={() => setShowFeeDialog(false)} className="flex-1" disabled={downloading}>Cancel</Button>
              <Button onClick={handleDownload} className="flex-1" disabled={downloading}>
                {downloading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Pay KES 50 & Download
              </Button>
            </div>
          </Card>
        )}

        {downloaded && (
          <Card className="p-4 border-success/50 bg-success/5">
            <p className="text-sm text-success font-medium">✓ Statement downloaded. KES 50.00 deducted from your wallet.</p>
          </Card>
        )}

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
                  const meta = tx.metadata as Record<string, any> | null;
                  const description = meta?.description || meta?.network || tx.type;
                  return (
                    <tr key={tx.id} className="border-b border-border last:border-0">
                      <td className="p-3 font-mono text-xs">{tx.receipt_reference || tx.id.slice(0, 8)}</td>
                      <td className="p-3">
                        <div className="capitalize">{tx.type.replace(/_/g, ' ')}</div>
                        {description && description !== tx.type && (
                          <div className="text-xs text-muted-foreground">{description}</div>
                        )}
                      </td>
                      <td className={`p-3 text-right font-medium ${isCredit ? "text-success" : ""}`}>
                        {isCredit ? "+" : "-"}KES {Number(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-right text-muted-foreground">KES {Number(tx.fee || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
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

export default StatementsPage;
