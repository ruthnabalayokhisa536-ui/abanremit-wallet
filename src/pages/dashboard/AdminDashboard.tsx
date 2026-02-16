import React, { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Users, Shield, BarChart3, Settings, Wallet, FileText, Globe, Phone, Loader2, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/use-profile";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const [stats, setStats] = useState({ totalBalance: 0, totalUsers: 0, totalAgents: 0, todayTx: 0 });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const today = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
      
      // Fetch total balance with fallback
      let totalBalance = 0;
      try {
        const walletRes = await supabase.rpc('get_total_balance' as any).single();
        totalBalance = typeof walletRes.data === 'number' ? walletRes.data : 0;
      } catch (err) {
        console.debug('RPC function not available, using fallback');
        // Fallback: fetch limited wallet records
        const { data: wallets } = await supabase
          .from("wallets")
          .select("balance")
          .limit(1000);
        if (wallets) {
          totalBalance = wallets.reduce((sum, w) => sum + (Number(w.balance) || 0), 0);
        }
      }
      
      // Fetch counts in parallel with optimized queries
      const [userRes, agentRes, txRes, mpesaTxRes] = await Promise.all([
        supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "user"),
        supabase.from("agents").select("id", { count: "exact", head: true }),
        supabase.from("transactions").select("id", { count: "exact", head: true }).gte("created_at", today),
        supabase.from("mpesa_transactions" as any).select("id", { count: "exact", head: true }).gte("created_at", today),
      ]);

      const todayTxCount = (txRes.count ?? 0) + (mpesaTxRes.count ?? 0);
      
      setStats({
        totalBalance,
        totalUsers: userRes.count ?? 0,
        totalAgents: agentRes.count ?? 0,
        todayTx: todayTxCount,
      });
    } catch (error) {
      console.error("Failed to fetch admin stats:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();

    // Real-time subscription with optimized event handling
    const channel = supabase
      .channel("admin-dashboard-updates")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "transactions" },
        () => fetchStats()
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "mpesa_transactions" as any },
        () => fetchStats()
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "user_roles" },
        () => fetchStats()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchStats]);

  const statCards = [
    { label: "Total System Balance", value: `KES ${stats.totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, icon: Wallet, color: "text-primary" },
    { label: "Total Users", value: String(stats.totalUsers), icon: Users, color: "text-success" },
    { label: "Active Agents", value: String(stats.totalAgents), icon: Shield, color: "text-warning" },
    { label: "Transactions Today", value: String(stats.todayTx), icon: BarChart3, color: "text-accent-foreground" },
  ];

  const actions = [
    { label: "Users", icon: Users, path: "/admin/users" },
    { label: "Agents", icon: Shield, path: "/admin/agents" },
    { label: "Bulk SMS", icon: Bell, path: "/admin/bulk-sms" },
    { label: "Fees", icon: Settings, path: "/admin/fees" },
    { label: "Currencies", icon: Globe, path: "/admin/currencies" },
    { label: "Airtime", icon: Phone, path: "/admin/airtime" },
    { label: "Actions", icon: Wallet, path: "/admin/actions" },
    { label: "Audit", icon: FileText, path: "/admin/audit" },
  ];

  // Show skeleton loading state while loading
  if (loading) {
    return (
      <DashboardLayout role="admin">
        <div className="max-w-6xl mx-auto space-y-6">
          <h2 className="text-2xl font-bold text-foreground">Admin Dashboard</h2>
          <div className="grid md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="p-4">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-3 w-1/3 animate-pulse"></div>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-2/3 animate-pulse"></div>
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-3 md:grid-cols-8 gap-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="admin">
      <div className="max-w-6xl mx-auto space-y-6">
        <h2 className="text-2xl font-bold text-foreground">Admin Dashboard</h2>
        {profile && <p className="text-sm text-muted-foreground">Welcome, {profile.full_name}</p>}
        
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
        
        <div className="grid grid-cols-3 md:grid-cols-8 gap-3">
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
