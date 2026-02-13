import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { DollarSign, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const AgentCommissionsPage = () => {
  const [commissions, setCommissions] = useState<any[]>([]);
  const [agent, setAgent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: agentData } = await supabase.from("agents").select("*").eq("user_id", user.id).limit(1).single();
      setAgent(agentData);

      if (agentData) {
        const { data } = await supabase
          .from("agent_commissions")
          .select("*")
          .eq("agent_id", agentData.id)
          .order("created_at", { ascending: false })
          .limit(50);
        setCommissions(data || []);
      }
      setLoading(false);
    };
    fetch();
  }, []);

  return (
    <DashboardLayout role="agent">
      <div className="max-w-4xl mx-auto space-y-6">
        <h2 className="text-2xl font-bold text-foreground">Commissions</h2>

        <Card className="p-6 border-success/30 bg-success/5">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="w-6 h-6 text-success" />
            <span className="text-sm text-muted-foreground">Total Commission Earned</span>
          </div>
          <p className="text-3xl font-bold text-success">KES {(agent?.commission_balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </Card>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-3 font-medium text-muted-foreground">Transaction</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Amount</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody>
                {commissions.length === 0 ? (
                  <tr><td colSpan={3} className="p-8 text-center text-muted-foreground">No commissions yet.</td></tr>
                ) : commissions.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0">
                    <td className="p-3 font-mono text-xs">{c.transaction_id}</td>
                    <td className="p-3 text-right font-medium text-success">KES {Number(c.commission_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="p-3 text-right text-muted-foreground">{new Date(c.created_at).toLocaleString()}</td>
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

export default AgentCommissionsPage;
