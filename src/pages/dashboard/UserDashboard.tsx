import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet, ArrowDownCircle, ArrowUpCircle, Send, Phone, FileText, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";

const demoTransactions = [
  { id: "TXN20260211001", type: "Deposit", amount: "+KES 5,000.00", date: "11/02/2026 14:32", status: "Completed" },
  { id: "TXN20260210045", type: "Withdrawal", amount: "-KES 1,200.00", date: "10/02/2026 09:15", status: "Completed" },
  { id: "TXN20260209112", type: "Airtime", amount: "-KES 100.00", date: "09/02/2026 18:45", status: "Completed" },
  { id: "TXN20260208078", type: "Send Money", amount: "-KES 3,500.00", date: "08/02/2026 11:20", status: "Completed" },
  { id: "TXN20260207034", type: "Deposit", amount: "+KES 10,000.00", date: "07/02/2026 08:00", status: "Completed" },
];

const UserDashboard = () => {
  const navigate = useNavigate();

  const actions = [
    { label: "Deposit", icon: ArrowDownCircle, path: "/dashboard/deposit", color: "text-success" },
    { label: "Withdraw", icon: ArrowUpCircle, path: "/dashboard/withdraw", color: "text-warning" },
    { label: "Send Money", icon: Send, path: "/dashboard/send", color: "text-primary" },
    { label: "Buy Airtime", icon: Phone, path: "/dashboard/airtime", color: "text-accent-foreground" },
    { label: "Statements", icon: FileText, path: "/dashboard/statements", color: "text-muted-foreground" },
    { label: "Notifications", icon: Bell, path: "/dashboard/notifications", color: "text-destructive" },
  ];

  return (
    <DashboardLayout role="user">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Wallet Card */}
        <Card className="p-6 bg-primary text-primary-foreground">
          <div className="flex items-center gap-3 mb-4">
            <Wallet className="w-6 h-6" />
            <span className="text-sm opacity-80">Wallet Balance</span>
          </div>
          <p className="text-3xl font-bold">KES 15,300.00</p>
          <p className="text-sm opacity-70 mt-2">Wallet ID: WAL-2026-4829-7183</p>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {actions.map((action) => (
            <Button
              key={action.label}
              variant="outline"
              onClick={() => navigate(action.path)}
              className="flex flex-col items-center gap-2 h-auto py-4"
            >
              <action.icon className={`w-5 h-5 ${action.color}`} />
              <span className="text-xs">{action.label}</span>
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

export default UserDashboard;
