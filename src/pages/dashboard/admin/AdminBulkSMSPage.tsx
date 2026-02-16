import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Users, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { smsService } from "@/services/payment/sms.service";
import { toast } from "sonner";

const AdminBulkSMSPage = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState<"all" | "verified" | "unverified">("all");

  useEffect(() => {
    fetchUsers();
  }, [filter]);

  const fetchUsers = async () => {
    setLoading(true);
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "user");

    if (!roles || roles.length === 0) {
      setUsers([]);
      setLoading(false);
      return;
    }

    const userIds = roles.map((r) => r.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .in("user_id", userIds);

    let filtered = profiles || [];

    if (filter === "verified") {
      filtered = filtered.filter((p) => p.kyc_status === "approved");
    } else if (filter === "unverified") {
      filtered = filtered.filter((p) => p.kyc_status !== "approved");
    }

    setUsers(filtered);
    setLoading(false);
  };

  const toggleUser = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const selectAll = () => {
    if (selectedUsers.size === users.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(users.map((u) => u.user_id)));
    }
  };

  const handleSendBulkSMS = async () => {
    if (selectedUsers.size === 0) {
      toast.error("Please select at least one user");
      return;
    }

    if (!message.trim()) {
      toast.error("Please enter a message");
      return;
    }

    if (message.length > 160) {
      toast.warning("Message exceeds 160 characters. It will be sent as multiple SMS.");
    }

    setSending(true);
    let successCount = 0;
    let failCount = 0;

    const selectedUsersList = users.filter((u) =>
      selectedUsers.has(u.user_id)
    );

    for (const user of selectedUsersList) {
      if (!user.phone) {
        failCount++;
        continue;
      }

      try {
        const result = await smsService.sendSms({
          to: smsService.formatPhoneNumber(user.phone),
          message: `ABANREMIT: ${message}`,
        });

        if (result.status === "sent") {
          successCount++;
        } else {
          failCount++;
        }

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        failCount++;
      }
    }

    setSending(false);
    toast.success(
      `Bulk SMS sent! Success: ${successCount}, Failed: ${failCount}`
    );
    setMessage("");
    setSelectedUsers(new Set());
  };

  const charCount = message.length;
  const smsCount = Math.ceil(charCount / 160) || 1;

  return (
    <DashboardLayout role="admin">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Bulk SMS</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Send SMS notifications to multiple users
            </p>
          </div>
          <Badge variant="outline" className="text-lg px-4 py-2">
            <Users className="w-4 h-4 mr-2" />
            {selectedUsers.size} Selected
          </Badge>
        </div>

        {/* Message Composer */}
        <Card className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Message
            </label>
            <Textarea
              placeholder="Enter your message here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
              <span>
                {charCount} characters • {smsCount} SMS
              </span>
              <span className={charCount > 160 ? "text-warning" : ""}>
                {160 - (charCount % 160)} chars remaining in current SMS
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleSendBulkSMS}
              disabled={sending || selectedUsers.size === 0 || !message.trim()}
              className="flex-1"
            >
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send to {selectedUsers.size} User{selectedUsers.size !== 1 ? "s" : ""}
                </>
              )}
            </Button>
          </div>

          {selectedUsers.size > 0 && (
            <div className="text-sm text-muted-foreground bg-blue-50 p-3 rounded-md">
              <strong>Cost Estimate:</strong> ~KES{" "}
              {(selectedUsers.size * smsCount * 1.0).toFixed(2)} (assuming KES
              1.00 per SMS)
            </div>
          )}
        </Card>

        {/* Filters */}
        <div className="flex gap-2">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
          >
            All Users
          </Button>
          <Button
            variant={filter === "verified" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("verified")}
          >
            Verified Only
          </Button>
          <Button
            variant={filter === "unverified" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("unverified")}
          >
            Unverified Only
          </Button>
        </div>

        {/* User List */}
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Card className="overflow-x-auto">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedUsers.size === users.length && users.length > 0}
                  onCheckedChange={selectAll}
                />
                <span className="text-sm font-medium">
                  Select All ({users.length} users)
                </span>
              </div>
              {selectedUsers.size > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedUsers(new Set())}
                >
                  Clear Selection
                </Button>
              )}
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-3 font-medium text-muted-foreground w-12">
                    Select
                  </th>
                  <th className="text-left p-3 font-medium text-muted-foreground">
                    Name
                  </th>
                  <th className="text-left p-3 font-medium text-muted-foreground">
                    Phone
                  </th>
                  <th className="text-left p-3 font-medium text-muted-foreground">
                    Email
                  </th>
                  <th className="text-left p-3 font-medium text-muted-foreground">
                    KYC Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="p-8 text-center text-muted-foreground"
                    >
                      No users found.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr
                      key={user.user_id}
                      className={`border-b border-border last:border-0 cursor-pointer hover:bg-muted/50 ${
                        selectedUsers.has(user.user_id) ? "bg-blue-50" : ""
                      }`}
                      onClick={() => toggleUser(user.user_id)}
                    >
                      <td className="p-3">
                        <Checkbox
                          checked={selectedUsers.has(user.user_id)}
                          onCheckedChange={() => toggleUser(user.user_id)}
                        />
                      </td>
                      <td className="p-3 font-medium">{user.full_name}</td>
                      <td className="p-3 text-muted-foreground">
                        {user.phone || (
                          <span className="text-destructive">No phone</span>
                        )}
                      </td>
                      <td className="p-3 text-muted-foreground text-xs">
                        {user.email || "—"}
                      </td>
                      <td className="p-3">
                        <Badge
                          variant={
                            user.kyc_status === "approved"
                              ? "default"
                              : user.kyc_status === "pending"
                              ? "secondary"
                              : "destructive"
                          }
                          className="text-xs capitalize"
                        >
                          {user.kyc_status === "approved" && (
                            <CheckCircle className="w-3 h-3 mr-1" />
                          )}
                          {user.kyc_status}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminBulkSMSPage;
