import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, FileText, ExternalLink, UserCog, Shield, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { kycService, KYCDocument } from "@/services/kyc.service";
import { roleManagementService } from "@/services/admin/role-management.service";

const AdminUsersPage = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [kycDocuments, setKycDocuments] = useState<KYCDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [roleChangeUser, setRoleChangeUser] = useState<any>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      console.log("Fetching users...");
      
      // Fetch profiles - this should work if RLS allows
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, phone, kyc_status, created_at")
        .limit(100);
      
      if (profilesError) {
        console.error("Profiles error:", profilesError);
        toast.error(`Cannot access profiles: ${profilesError.message}`);
        setUsers([]);
        setLoading(false);
        return;
      }

      if (!profilesData || profilesData.length === 0) {
        console.log("No profiles found");
        toast.info("No users found in database");
        setUsers([]);
        setLoading(false);
        return;
      }

      console.log(`Found ${profilesData.length} profiles`);

      // Fetch wallets for these users
      const userIds = profilesData.map(p => p.user_id);
      const { data: walletsData } = await supabase
        .from("wallets")
        .select("user_id, id, wallet_id, balance, status")
        .in("user_id", userIds);
      
      console.log(`Found ${walletsData?.length || 0} wallets`);

      // Fetch roles for these users
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds);
      
      console.log(`Found ${rolesData?.length || 0} role entries`);

      // Combine the data
      const combined = profilesData.map(profile => {
        const wallet = walletsData?.find(w => w.user_id === profile.user_id);
        const roles = rolesData?.filter(r => r.user_id === profile.user_id) || [];
        
        // Check if user is admin or agent
        const isAdmin = roles.some(r => r.role === "admin");
        const isAgent = roles.some(r => r.role === "agent");
        
        return {
          ...profile,
          wallet_id: wallet?.wallet_id || "—",
          balance: wallet?.balance ?? 0,
          wallet_status: wallet?.status ?? "active",
          wallet_uuid: wallet?.id,
          user_roles: roles,
          isAdmin,
          isAgent
        };
      });

      // Filter to show only regular users
      const regularUsers = combined.filter(u => !u.isAdmin && !u.isAgent);
      
      console.log(`Showing ${regularUsers.length} regular users`);
      setUsers(regularUsers);
      
      if (regularUsers.length === 0) {
        toast.info("No regular users found (all users are admins or agents)");
      }
    } catch (error: any) {
      console.error("Unexpected error:", error);
      toast.error(`Error: ${error.message || "Unknown error"}`);
      setUsers([]);
    } finally {
      setLoading(false);
    }
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

  const viewKYCDocuments = async (user: any) => {
    setSelectedUser(user);
    setLoadingDocs(true);
    const docs = await kycService.getUserDocuments(user.user_id);
    setKycDocuments(docs);
    setLoadingDocs(false);
  };

  const openRoleDialog = (user: any) => {
    setRoleChangeUser(user);
    setSelectedRole("");
    setRoleDialogOpen(true);
  };

  const handleRoleChange = async () => {
    if (!roleChangeUser || !selectedRole) {
      toast.error("Please select a role");
      return;
    }

    setLoading(true);
    try {
      let result;
      
      if (selectedRole === "agent") {
        result = await roleManagementService.promoteToAgent(roleChangeUser.user_id);
      } else if (selectedRole === "admin") {
        result = await roleManagementService.promoteToAdmin(roleChangeUser.user_id);
      } else if (selectedRole === "remove_agent") {
        result = await roleManagementService.removeRole(roleChangeUser.user_id, "agent");
      } else if (selectedRole === "remove_admin") {
        result = await roleManagementService.removeRole(roleChangeUser.user_id, "admin");
      }

      if (result?.success) {
        toast.success(result.message);
        if (result.agent_id) {
          toast.info(`Agent ID: ${result.agent_id}`);
        }
        setRoleDialogOpen(false);
        fetchUsers(); // Refresh user list
      } else {
        toast.error(result?.message || "Failed to change role");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to change role");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout role="admin">
      <div className="max-w-6xl mx-auto space-y-6">
        <h2 className="text-2xl font-bold text-foreground">User Management</h2>
        <Card className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
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
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-xs h-7" 
                          onClick={() => openRoleDialog(u)}
                        >
                          <UserCog className="w-3 h-3 mr-1" />
                          Change Role
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-xs h-7" 
                          onClick={() => viewKYCDocuments(u)}
                        >
                          <FileText className="w-3 h-3 mr-1" />
                          View Docs
                        </Button>
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
          )}
          </Card>

        {/* KYC Documents Dialog */}
        <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                KYC Documents - {selectedUser?.full_name}
              </DialogTitle>
            </DialogHeader>
            
            {loadingDocs ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : kycDocuments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No documents uploaded yet
              </div>
            ) : (
              <div className="space-y-4">
                {kycDocuments.map((doc) => (
                  <Card key={doc.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium capitalize">
                            {doc.document_type.replace(/_/g, " ")}
                          </span>
                          <Badge 
                            variant={
                              doc.status === "approved" 
                                ? "default" 
                                : doc.status === "pending" 
                                ? "secondary" 
                                : "destructive"
                            }
                            className="text-xs"
                          >
                            {doc.status}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-muted-foreground">
                          Uploaded: {new Date(doc.uploaded_at || "").toLocaleDateString()}
                        </p>
                        
                        {doc.rejection_reason && (
                          <p className="text-sm text-destructive">
                            Rejection reason: {doc.rejection_reason}
                          </p>
                        )}
                      </div>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(doc.file_url, "_blank")}
                      >
                        <ExternalLink className="w-4 h-4 mr-1" />
                        View
                      </Button>
                    </div>
                  </Card>
                ))}
                
                {selectedUser && selectedUser.kyc_status === "pending" && (
                  <div className="flex gap-2 pt-4 border-t">
                    <Button 
                      className="flex-1"
                      onClick={() => {
                        handleKyc(selectedUser.user_id, "approved");
                        setSelectedUser(null);
                      }}
                    >
                      Approve All Documents
                    </Button>
                    <Button 
                      variant="destructive"
                      className="flex-1"
                      onClick={() => {
                        handleKyc(selectedUser.user_id, "rejected");
                        setSelectedUser(null);
                      }}
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Role Change Dialog */}
        <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change User Role</DialogTitle>
              <DialogDescription>
                Assign or remove roles for {roleChangeUser?.full_name || "this user"}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Action</label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose role action..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agent">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-primary" />
                        <span>Promote to Agent</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="admin">
                      <div className="flex items-center gap-2">
                        <UserCog className="w-4 h-4 text-destructive" />
                        <span>Promote to Admin</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="remove_agent">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span>Remove Agent Role</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="remove_admin">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span>Remove Admin Role</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedRole === "agent" && (
                <div className="p-3 bg-primary/10 rounded-lg text-sm">
                  <p className="font-medium text-primary mb-1">Promoting to Agent will:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Generate unique Agent ID (AGT######)</li>
                    <li>Create agent commission account</li>
                    <li>Grant access to agent dashboard</li>
                    <li>Send notification to user</li>
                  </ul>
                </div>
              )}

              {selectedRole === "admin" && (
                <div className="p-3 bg-destructive/10 rounded-lg text-sm">
                  <p className="font-medium text-destructive mb-1">⚠️ Promoting to Admin will:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Grant full system access</li>
                    <li>Allow managing all users</li>
                    <li>Access to sensitive data</li>
                    <li>Send notification to user</li>
                  </ul>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleRoleChange} 
                disabled={!selectedRole || loading}
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Confirm Change
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default AdminUsersPage;
