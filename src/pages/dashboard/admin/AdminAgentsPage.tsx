import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AdminAgentsPage = () => {
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAgents = async () => {
    setLoading(true);
    const { data } = await supabase.from("agents").select("*");
    if (!data || data.length === 0) { setAgents([]); setLoading(false); return; }

    const userIds = data.map(a => a.user_id);
    const { data: profiles } = await supabase.from("profiles").select("*").in("user_id", userIds);
    const { data: wallets } = await supabase.from("wallets").select("*").in("user_id", userIds);

    const combined = data.map(a => {
      const p = (profiles || []).find(p => p.user_id === a.user_id);
      const w = (wallets || []).find(w => w.user_id === a.user_id);
      return { ...a, full_name: p?.full_name, phone: p?.phone, wallet_id: w?.wallet_id, balance: w?.balance ?? 0 };
    });
    setAgents(combined);
    setLoading(false);
  };

  useEffect(() => { fetchAgents(); }, []);

  const handleStatus = async (agentId: string, status: string) => {
    const { error } = await supabase.from("agents").update({ status }).eq("id", agentId);
    if (error) { toast.error(error.message); return; }
    toast.success(`Agent ${status}`);
    fetchAgents();
  };

  return (
    <DashboardLayout role="admin">
      <div className="max-w-6xl mx-auto space-y-6">
        <h2 className="text-2xl font-bold text-foreground">Agent Management</h2>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-3 font-medium text-muted-foreground">Agent ID</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Name</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Phone</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Wallet ID</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Commission</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {agents.length === 0 ? (
                  <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No agents found.</td></tr>
                ) : agents.map((a) => (
                  <tr key={a.id} className="border-b border-border last:border-0">
                    <td className="p-3 font-mono text-xs">{a.agent_id}</td>
                    <td className="p-3 font-medium">{a.full_name || "—"}</td>
                    <td className="p-3 text-muted-foreground">{a.phone || "—"}</td>
                    <td className="p-3 font-mono text-xs">{a.wallet_id || "—"}</td>
                    <td className="p-3 text-right font-medium text-success">KES {Number(a.commission_balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="p-3 text-center">
                      <Badge variant={a.status === "active" ? "default" : "destructive"} className="text-xs capitalize">{a.status}</Badge>
                    </td>
                    <td className="p-3 text-center">
                      <Button size="sm" variant="outline" className="text-xs h-7"
                        onClick={() => handleStatus(a.id, a.status === "active" ? "suspended" : "active")}
                      >
                        {a.status === "active" ? "Suspend" : "Activate"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminAgentsPage;
