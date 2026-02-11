import React from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

const demoTransactions = [
  { id: "TXN20260211030", type: "Deposit to User", amount: "-KES 8,000.00", date: "11/02/2026 13:10", fee: "KES 0.00", commission: "KES 160.00" },
  { id: "TXN20260210019", type: "Transfer", amount: "-KES 5,000.00", date: "10/02/2026 10:30", fee: "KES 50.00", commission: "KES 100.00" },
  { id: "TXN20260209010", type: "Deposit to User", amount: "-KES 3,000.00", date: "09/02/2026 16:45", fee: "KES 0.00", commission: "KES 60.00" },
];

const AgentStatementsPage = () => {
  const handleDownload = () => {
    const csv = "Transaction ID,Type,Amount,Fee,Commission,Date\n" + demoTransactions.map(t => `${t.id},${t.type},${t.amount},${t.fee},${t.commission},${t.date}`).join("\n");
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
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-3 font-medium text-muted-foreground">Transaction ID</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Type</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Amount</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Fee</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Commission</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Date</th>
              </tr>
            </thead>
            <tbody>
              {demoTransactions.map((tx) => (
                <tr key={tx.id} className="border-b border-border last:border-0">
                  <td className="p-3 font-mono text-xs">{tx.id}</td>
                  <td className="p-3">{tx.type}</td>
                  <td className="p-3 text-right font-medium">{tx.amount}</td>
                  <td className="p-3 text-right text-muted-foreground">{tx.fee}</td>
                  <td className="p-3 text-right text-success font-medium">{tx.commission}</td>
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

export default AgentStatementsPage;
