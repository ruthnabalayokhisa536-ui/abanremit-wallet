import React from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";

const demoLogs = [
  { id: "AUD-001", actor: "Admin", action: "Approved KYC for Alice Kamau", date: "11/02/2026 14:00" },
  { id: "AUD-002", actor: "Admin", action: "Froze wallet WAL-2026-7152-0416 (Sarah Mutua)", date: "11/02/2026 13:30" },
  { id: "AUD-003", actor: "System", action: "Agent AGT-0042 deposited KES 8,000 to WAL-2026-4829-7183", date: "11/02/2026 13:10" },
  { id: "AUD-004", actor: "Admin", action: "Updated withdrawal fee: flat KES 30, 1%", date: "10/02/2026 16:00" },
  { id: "AUD-005", actor: "Admin", action: "Suspended Agent AGT-0044 (David Kiprop)", date: "10/02/2026 12:00" },
  { id: "AUD-006", actor: "System", action: "User Grace Wanjiku registered. Wallet WAL-2026-5930-8294 created.", date: "09/02/2026 10:00" },
];

const AdminAuditPage = () => {
  return (
    <DashboardLayout role="admin">
      <div className="max-w-4xl mx-auto space-y-6">
        <h2 className="text-2xl font-bold text-foreground">Audit Logs</h2>
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-3 font-medium text-muted-foreground">ID</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Actor</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Action</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Date</th>
              </tr>
            </thead>
            <tbody>
              {demoLogs.map((l) => (
                <tr key={l.id} className="border-b border-border last:border-0">
                  <td className="p-3 font-mono text-xs">{l.id}</td>
                  <td className="p-3">{l.actor}</td>
                  <td className="p-3">{l.action}</td>
                  <td className="p-3 text-right text-muted-foreground">{l.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AdminAuditPage;
