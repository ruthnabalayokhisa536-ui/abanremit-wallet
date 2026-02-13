import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Users, Shield, BarChart3, Settings, Wallet, FileText, Globe, Phone, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/use-profile";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const [stats, setStats] = useState({ totalBalance: 0, totalUsers: 0, totalAgents: 0, todayTx: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const [walletRes, userRes, agentRes, txRes] = await Promise.all([
        supabase.from("wallets").select("balance"),
        supabase.from("user_roles").select("id").eq("role", "user"),
        supabase.from("agents").select("id"),
        supabase.from("transactions").select("id").gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
      ]);

      const totalBalance = (walletRes.data || []).reduce((sum, w) => sum + Number(w.balance), 0);
      setStats({
        totalBalance,
        totalUsers: userRes.data?.length ?? 0,
        totalAgents: agentRes.data?.length ?? 0,
        todayTx: txRes.data?.length ?? 0,
      });
      setLoading(false);
    };
    fetchStats();
  }, []);

  const statCards = [
    { label: "Total System Balance", value: `KES ${stats.totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, icon: Wallet, color: "text-primary" },
    { label: "Total Users", value: String(stats.totalUsers), icon: Users, color: "text-success" },
    { label: "Active Agents", value: String(stats.totalAgents), icon: Shield, color: "text-warning" },
    { label: "Transactions Today", value: String(stats.todayTx), icon: BarChart3, color: "text-accent-foreground" },
  ];

  const actions = [
    { label: "Users", icon: Users, path: "/admin/users" },
    { label: "Agents", icon: Shield, path: "/admin/agents" },
    { label: "Fees", icon: Settings, path: "/admin/fees" },
    { label: "Currencies", icon: Globe, path: "/admin/currencies" },
    { label: "Airtime", icon: Phone, path: "/admin/airtime" },
    { label: "Actions", icon: Wallet, path: "/admin/actions" },
    { label: "Audit", icon: FileText, path: "/admin/audit" },
  ];

  return (
    <DashboardLayout role="admin">
      <div className="max-w-6xl mx-auto space-y-6">
        <h2 className="text-2xl font-bold text-foreground">Admin Dashboard</h2>
        {profile && <p className="text-sm text-muted-foreground">Welcome, {profile.full_name}</p>}
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="grid md:grid-cols-4 gap-4">
            {statCards.map((s) => (
              <Card key={s.label} className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                </div>
                <p className="text-xl font-bold text-foreground">{s.value}</p>
              </Card>
            ))}
          </div>
        )}
        <div className="grid grid-cols-3 md:grid-cols-7 gap-3">
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
