import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet, ArrowDownCircle, ArrowUpCircle, Send, DollarSign, FileText, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";

const demoTransactions = [
  { id: "TXN20260211030", type: "Deposit to User", amount: "-KES 8,000.00", date: "11/02/2026 13:10", status: "Completed" },
  { id: "TXN20260211028", type: "Commission", amount: "+KES 160.00", date: "11/02/2026 13:10", status: "Completed" },
  { id: "TXN20260210019", type: "Transfer", amount: "-KES 5,000.00", date: "10/02/2026 10:30", status: "Completed" },
  { id: "TXN20260210017", type: "Commission", amount: "+KES 100.00", date: "10/02/2026 10:30", status: "Completed" },
  { id: "TXN20260209010", type: "Deposit to User", amount: "-KES 3,000.00", date: "09/02/2026 16:45", status: "Completed" },
];

const AgentDashboard = () => {
  const navigate = useNavigate();

  const actions = [
    { label: "Deposit to Wallet", icon: ArrowDownCircle, path: "/agent/deposit", color: "text-success" },
    { label: "Withdraw", icon: ArrowUpCircle, path: "/agent/withdraw", color: "text-warning" },
    { label: "Transfer", icon: Send, path: "/agent/transfer", color: "text-primary" },
    { label: "Commissions", icon: DollarSign, path: "/agent/commissions", color: "text-accent-foreground" },
    { label: "Statements", icon: FileText, path: "/agent/statements", color: "text-muted-foreground" },
    { label: "Notifications", icon: Bell, path: "/agent/notifications", color: "text-destructive" },
  ];

  return (
    <DashboardLayout role="agent">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Wallet & Commission Cards */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="p-6 bg-primary text-primary-foreground">
            <div className="flex items-center gap-3 mb-4">
              <Wallet className="w-6 h-6" />
              <span className="text-sm opacity-80">Wallet Balance</span>
            </div>
            <p className="text-3xl font-bold">KES 245,800.00</p>
            <p className="text-sm opacity-70 mt-2">Wallet ID: WAL-2026-9012-3456</p>
          </Card>
          <Card className="p-6 border-success/30 bg-success/5">
            <div className="flex items-center gap-3 mb-4">
              <DollarSign className="w-6 h-6 text-success" />
              <span className="text-sm text-muted-foreground">Commission Balance</span>
            </div>
            <p className="text-3xl font-bold text-success">KES 12,450.00</p>
            <p className="text-sm text-muted-foreground mt-2">Agent ID: AGT-0042</p>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {actions.map((action) => (
            <Button key={action.label} variant="outline" onClick={() => navigate(action.path)} className="flex flex-col items-center gap-2 h-auto py-4">
              <action.icon className={`w-5 h-5 ${action.color}`} />
              <span className="text-xs">{action.label.split(" ")[0]}</span>
            </Button>
          ))}
        </div>

        {/* Recent Transactions */}
        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-4 text-foreground">Recent Transactions</h3>
          <div className="space-y-0">
            {demoTransactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium text-foreground">{tx.type}</p>
                  <p className="text-xs text-muted-foreground">{tx.id} • {tx.date}</p>
                </div>
                <span className={`text-sm font-semibold ${tx.amount.startsWith("+") ? "text-success" : "text-foreground"}`}>
                  {tx.amount}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AgentDashboard;
