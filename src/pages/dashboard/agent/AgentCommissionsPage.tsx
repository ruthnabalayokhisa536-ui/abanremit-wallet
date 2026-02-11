import React from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { DollarSign } from "lucide-react";

const demoCommissions = [
  { id: "COM-001", txId: "TXN20260211030", amount: "KES 160.00", type: "Deposit", date: "11/02/2026 13:10" },
  { id: "COM-002", txId: "TXN20260210019", amount: "KES 100.00", type: "Transfer", date: "10/02/2026 10:30" },
  { id: "COM-003", txId: "TXN20260209010", amount: "KES 60.00", type: "Deposit", date: "09/02/2026 16:45" },
  { id: "COM-004", txId: "TXN20260208005", amount: "KES 200.00", type: "Transfer", date: "08/02/2026 14:20" },
  { id: "COM-005", txId: "TXN20260207001", amount: "KES 80.00", type: "Deposit", date: "07/02/2026 09:00" },
];

const AgentCommissionsPage = () => {
  return (
    <DashboardLayout role="agent">
      <div className="max-w-4xl mx-auto space-y-6">
        <h2 className="text-2xl font-bold text-foreground">Commissions</h2>

        <Card className="p-6 border-success/30 bg-success/5">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="w-6 h-6 text-success" />
            <span className="text-sm text-muted-foreground">Total Commission Earned</span>
          </div>
          <p className="text-3xl font-bold text-success">KES 12,450.00</p>
        </Card>

        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-3 font-medium text-muted-foreground">Commission ID</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Transaction</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Type</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Amount</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Date</th>
              </tr>
            </thead>
            <tbody>
              {demoCommissions.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0">
                  <td className="p-3 font-mono text-xs">{c.id}</td>
                  <td className="p-3 font-mono text-xs">{c.txId}</td>
                  <td className="p-3">{c.type}</td>
                  <td className="p-3 text-right font-medium text-success">{c.amount}</td>
                  <td className="p-3 text-right text-muted-foreground">{c.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AgentCommissionsPage;
