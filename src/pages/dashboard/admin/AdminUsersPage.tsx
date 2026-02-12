import React from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const demoUsers = [
  { id: "USR-001", name: "Purity Musembi", phone: "0717562660", walletId: "7770001", kyc: "Approved", balance: "KES 15,300.00", status: "Active" },
  { id: "USR-002", name: "Grace Wanjiku", phone: "0733456789", walletId: "7770002", kyc: "Pending", balance: "KES 2,100.00", status: "Active" },
  { id: "USR-003", name: "Alice Kamau", phone: "0712345678", walletId: "7770003", kyc: "Approved", balance: "KES 45,000.00", status: "Active" },
  { id: "USR-004", name: "Sarah Mutua", phone: "0711333444", walletId: "7770004", kyc: "Rejected", balance: "KES 0.00", status: "Frozen" },
];

const AdminUsersPage = () => {
  return (
    <DashboardLayout role="admin">
      <div className="max-w-6xl mx-auto space-y-6">
        <h2 className="text-2xl font-bold text-foreground">User Management</h2>
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
              {demoUsers.map((u) => (
                <tr key={u.id} className="border-b border-border last:border-0">
                  <td className="p-3 font-medium">{u.name}</td>
                  <td className="p-3 text-muted-foreground">{u.phone}</td>
                  <td className="p-3 font-mono text-xs">{u.walletId}</td>
                  <td className="p-3">
                    <Badge variant={u.kyc === "Approved" ? "default" : u.kyc === "Pending" ? "secondary" : "destructive"} className="text-xs">
                      {u.kyc}
                    </Badge>
                  </td>
                  <td className="p-3 text-right font-medium">{u.balance}</td>
                  <td className="p-3 text-center">
                    <Badge variant={u.status === "Active" ? "default" : "destructive"} className="text-xs">{u.status}</Badge>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex gap-1 justify-center flex-wrap">
                      {u.kyc === "Pending" && <Button size="sm" variant="outline" className="text-xs h-7">Approve KYC</Button>}
                      {u.status === "Active" ? (
                        <Button size="sm" variant="outline" className="text-xs h-7 text-destructive">Freeze</Button>
                      ) : (
                        <Button size="sm" variant="outline" className="text-xs h-7">Unfreeze</Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AdminUsersPage;
