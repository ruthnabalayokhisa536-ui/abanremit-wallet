import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const AdminAuditPage = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      setLogs(data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  return (
    <DashboardLayout role="admin">
      <div className="max-w-4xl mx-auto space-y-6">
        <h2 className="text-2xl font-bold text-foreground">Audit Logs</h2>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-3 font-medium text-muted-foreground">Actor</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Action</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr><td colSpan={3} className="p-8 text-center text-muted-foreground">No audit logs yet.</td></tr>
                ) : logs.map((l) => (
                  <tr key={l.id} className="border-b border-border last:border-0">
                    <td className="p-3 font-mono text-xs">{l.actor_id ? l.actor_id.slice(0, 8) + "..." : "System"}</td>
                    <td className="p-3">{l.action}</td>
                    <td className="p-3 text-right text-muted-foreground">{new Date(l.created_at).toLocaleString()}</td>
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

export default AdminAuditPage;
