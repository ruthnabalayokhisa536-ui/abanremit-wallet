import React, { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

const demoTransactions = [
  { id: "TXN20260211001", type: "Deposit", amount: "+KES 5,000.00", date: "11/02/2026 14:32", fee: "KES 0.00" },
  { id: "TXN20260210045", type: "Withdrawal", amount: "-KES 1,200.00", date: "10/02/2026 09:15", fee: "KES 30.00" },
  { id: "TXN20260209112", type: "Airtime", amount: "-KES 100.00", date: "09/02/2026 18:45", fee: "KES 0.00" },
  { id: "TXN20260208078", type: "Send Money", amount: "-KES 3,500.00", date: "08/02/2026 11:20", fee: "KES 17.50" },
  { id: "TXN20260207034", type: "Deposit", amount: "+KES 10,000.00", date: "07/02/2026 08:00", fee: "KES 0.00" },
];

const StatementsPage = () => {
  const [showFeeDialog, setShowFeeDialog] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const handleDownload = () => {
    setDownloaded(true);
    setShowFeeDialog(false);
    // Simulate CSV download
    const csv = "Transaction ID,Type,Amount,Fee,Date\n" + demoTransactions.map(t => `${t.id},${t.type},${t.amount},${t.fee},${t.date}`).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "AbanRemit_Statement.csv";
    a.click();
    URL.revokeObjectURL(url);
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
              A fee of <strong className="text-destructive">KES 50.00</strong> will be deducted from your wallet balance for this statement download.
            </p>
            <p className="text-sm text-muted-foreground mt-1">Current Balance: <strong>KES 15,300.00</strong></p>
            <p className="text-sm text-muted-foreground">Balance After: <strong>KES 15,250.00</strong></p>
            <div className="flex gap-3 mt-4">
              <Button variant="outline" onClick={() => setShowFeeDialog(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleDownload} className="flex-1">Pay KES 50 & Download</Button>
            </div>
          </Card>
        )}

        {downloaded && (
          <Card className="p-4 border-success/50 bg-success/5">
            <p className="text-sm text-success font-medium">✓ Statement downloaded. KES 50.00 deducted from your wallet.</p>
          </Card>
        )}

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
              {demoTransactions.map((tx) => (
                <tr key={tx.id} className="border-b border-border last:border-0">
                  <td className="p-3 font-mono text-xs">{tx.id}</td>
                  <td className="p-3">{tx.type}</td>
                  <td className={`p-3 text-right font-medium ${tx.amount.startsWith("+") ? "text-success" : ""}`}>{tx.amount}</td>
                  <td className="p-3 text-right text-muted-foreground">{tx.fee}</td>
                  <td className="p-3 text-right text-muted-foreground">{tx.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default StatementsPage;
