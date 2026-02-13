import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AdminUsersPage = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    setLoading(true);
    // Get all user-role users with their profiles and wallets
    const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "user");
    if (!roles || roles.length === 0) { setUsers([]); setLoading(false); return; }

    const userIds = roles.map(r => r.user_id);
    const { data: profiles } = await supabase.from("profiles").select("*").in("user_id", userIds);
    const { data: wallets } = await supabase.from("wallets").select("*").in("user_id", userIds);

    const combined = (profiles || []).map(p => {
      const w = (wallets || []).find(w => w.user_id === p.user_id);
      return { ...p, wallet_id: w?.wallet_id, balance: w?.balance ?? 0, wallet_status: w?.status ?? "active", wallet_uuid: w?.id };
    });
    setUsers(combined);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleKyc = async (userId: string, status: string) => {
    const { error } = await supabase.from("profiles").update({ kyc_status: status }).eq("user_id", userId);
    if (error) { toast.error(error.message); return; }
    toast.success(`KYC ${status}`);
    fetchUsers();
  };

  const handleWalletAction = async (userId: string, status: string) => {
    const { error } = await supabase.from("wallets").update({ status }).eq("user_id", userId);
    if (error) { toast.error(error.message); return; }
    toast.success(`Wallet ${status}`);
    fetchUsers();
  };

  return (
    <DashboardLayout role="admin">
      <div className="max-w-6xl mx-auto space-y-6">
        <h2 className="text-2xl font-bold text-foreground">User Management</h2>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-3 font-medium text-muted-foreground">Name</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Phone</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Wallet ID</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">KYC</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Balance</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No users found.</td></tr>
                ) : users.map((u) => (
                  <tr key={u.user_id} className="border-b border-border last:border-0">
                    <td className="p-3 font-medium">{u.full_name}</td>
                    <td className="p-3 text-muted-foreground">{u.phone || "—"}</td>
                    <td className="p-3 font-mono text-xs">{u.wallet_id || "—"}</td>
                    <td className="p-3">
                      <Badge variant={u.kyc_status === "approved" ? "default" : u.kyc_status === "pending" ? "secondary" : "destructive"} className="text-xs capitalize">
                        {u.kyc_status}
                      </Badge>
                    </td>
                    <td className="p-3 text-right font-medium">KES {Number(u.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="p-3 text-center">
                      <Badge variant={u.wallet_status === "active" ? "default" : "destructive"} className="text-xs capitalize">{u.wallet_status}</Badge>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex gap-1 justify-center flex-wrap">
                        {u.kyc_status === "pending" && (
                          <>
                            <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => handleKyc(u.user_id, "approved")}>Approve KYC</Button>
                            <Button size="sm" variant="outline" className="text-xs h-7 text-destructive" onClick={() => handleKyc(u.user_id, "rejected")}>Reject</Button>
                          </>
                        )}
                        {u.wallet_status === "active" ? (
                          <Button size="sm" variant="outline" className="text-xs h-7 text-destructive" onClick={() => handleWalletAction(u.user_id, "frozen")}>Freeze</Button>
                        ) : u.wallet_status === "frozen" ? (
                          <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => handleWalletAction(u.user_id, "active")}>Unfreeze</Button>
                        ) : null}
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

export default AdminUsersPage;
