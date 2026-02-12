import React from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const demoAgents = [
  { id: "AGT-0042", name: "Ethan Khisa", phone: "0793923427", walletId: "8880001", commission: "KES 12,450.00", status: "Active" },
  { id: "AGT-0043", name: "Faith Nyambura", phone: "0734567890", walletId: "8880002", commission: "KES 8,200.00", status: "Active" },
  { id: "AGT-0044", name: "David Kiprop", phone: "0721234567", walletId: "8880003", commission: "KES 3,100.00", status: "Suspended" },
];

const AdminAgentsPage = () => {
  return (
    <DashboardLayout role="admin">
      <div className="max-w-6xl mx-auto space-y-6">
        <h2 className="text-2xl font-bold text-foreground">Agent Management</h2>
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
              {demoAgents.map((a) => (
                <tr key={a.id} className="border-b border-border last:border-0">
                  <td className="p-3 font-mono text-xs">{a.id}</td>
                  <td className="p-3 font-medium">{a.name}</td>
                  <td className="p-3 text-muted-foreground">{a.phone}</td>
                  <td className="p-3 font-mono text-xs">{a.walletId}</td>
                  <td className="p-3 text-right font-medium text-success">{a.commission}</td>
                  <td className="p-3 text-center">
                    <Badge variant={a.status === "Active" ? "default" : "destructive"} className="text-xs">{a.status}</Badge>
                  </td>
                  <td className="p-3 text-center">
                    <Button size="sm" variant="outline" className="text-xs h-7">
                      {a.status === "Active" ? "Suspend" : "Activate"}
                    </Button>
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

export default AdminAgentsPage;
