import React from "react";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Users, Shield, BarChart3, Settings, Wallet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import DashboardLayout from "@/components/DashboardLayout";
import { getLoggedInUser } from "@/lib/test-accounts";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const user = getLoggedInUser();

  const stats = [
    { label: "Total System Balance", value: "KES 4,250,000.00", icon: Wallet, color: "text-primary" },
    { label: "Total Users", value: "1,247", icon: Users, color: "text-success" },
    { label: "Active Agents", value: "38", icon: Shield, color: "text-warning" },
    { label: "Transactions Today", value: "342", icon: BarChart3, color: "text-accent-foreground" },
  ];

  const actions = [
    { label: "Users", icon: Users, path: "/admin/users" },
    { label: "Agents", icon: Shield, path: "/admin/agents" },
    { label: "Transactions", icon: BarChart3, path: "/admin/transactions" },
    { label: "Fees", icon: Settings, path: "/admin/fees" },
    { label: "Actions", icon: Wallet, path: "/admin/actions" },
    { label: "Audit", icon: FileText, path: "/admin/audit" },
  ];

  return (
    <DashboardLayout role="admin">
      <div className="max-w-6xl mx-auto space-y-6">
        <h2 className="text-2xl font-bold text-foreground">Admin Dashboard</h2>
        {user && <p className="text-sm text-muted-foreground">Welcome, {user.name}</p>}
        <div className="grid md:grid-cols-4 gap-4">
          {stats.map((s) => (
            <Card key={s.label} className="p-4">
              <div className="flex items-center gap-3 mb-2">
                <s.icon className={`w-5 h-5 ${s.color}`} />
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
              <p className="text-xl font-bold text-foreground">{s.value}</p>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {actions.map((a) => (
            <Button key={a.label} variant="outline" onClick={() => navigate(a.path)} className="flex flex-col items-center gap-2 h-auto py-4">
              <a.icon className="w-5 h-5" />
              <span className="text-xs">{a.label}</span>
            </Button>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
