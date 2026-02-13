import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AdminAirtimePage = () => {
  const [networks, setNetworks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editRate, setEditRate] = useState("");

  const fetch = async () => {
    setLoading(true);
    const { data } = await supabase.from("airtime_networks").select("*").order("name");
    setNetworks(data || []);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const toggleEnabled = async (id: string, enabled: boolean) => {
    const { error } = await supabase.from("airtime_networks").update({ enabled: !enabled }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    fetch();
  };

  const saveRate = async () => {
    if (!editing) return;
    const { error } = await supabase.from("airtime_networks").update({ commission_rate: Number(editRate) }).eq("id", editing);
    if (error) { toast.error(error.message); return; }
    toast.success("Commission rate updated");
    setEditing(null);
    fetch();
  };

  return (
    <DashboardLayout role="admin">
      <div className="max-w-4xl mx-auto space-y-6">
        <h2 className="text-2xl font-bold text-foreground">Airtime Network Management</h2>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-3 font-medium text-muted-foreground">Network</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Code</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Agent Commission %</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {networks.map((n) => (
                  <tr key={n.id} className="border-b border-border last:border-0">
                    <td className="p-3 font-medium">{n.name}</td>
                    <td className="p-3 font-mono text-xs">{n.code}</td>
                    <td className="p-3 text-right">
                      {editing === n.id ? (
                        <div className="flex items-center gap-1 justify-end">
                          <Input type="number" value={editRate} onChange={(e) => setEditRate(e.target.value)} className="w-20 h-7 text-xs text-right" />
                          <span className="text-xs">%</span>
                        </div>
                      ) : (
                        <span>{Number(n.commission_rate).toFixed(2)}%</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <Badge variant={n.enabled ? "default" : "secondary"} className="text-xs">{n.enabled ? "Active" : "Disabled"}</Badge>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex gap-1 justify-center">
                        {editing === n.id ? (
                          <>
                            <Button size="sm" className="text-xs h-7" onClick={saveRate}>Save</Button>
                            <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setEditing(null)}>Cancel</Button>
                          </>
                        ) : (
                          <>
                            <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => { setEditing(n.id); setEditRate(String(n.commission_rate)); }}>Edit Rate</Button>
                            <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => toggleEnabled(n.id, n.enabled)}>
                              {n.enabled ? "Disable" : "Enable"}
                            </Button>
                          </>
                        )}
                      </div>
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

export default AdminAirtimePage;
