import React from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";

const demoNotifications = [
  { id: 1, message: "TXN20260211030 Confirmed. KES 8,000.00 deposited to Alice Kamau (WAL-2026-4829-7183). Commission: KES 160.00. Agent Balance: KES 245,800.00.", time: "2 hours ago", read: false },
  { id: 2, message: "TXN20260210019 Confirmed. KES 5,000.00 transferred to Mary Njeri. Fee: KES 50.00. Commission: KES 100.00.", time: "Yesterday", read: false },
  { id: 3, message: "TXN20260209010 Confirmed. KES 3,000.00 deposited to Peter Ochieng. Commission: KES 60.00.", time: "2 days ago", read: true },
];

const AgentNotificationsPage = () => {
  return (
    <DashboardLayout role="agent">
      <div className="max-w-2xl mx-auto space-y-6">
        <h2 className="text-2xl font-bold text-foreground">Notifications</h2>
        <div className="space-y-2">
          {demoNotifications.map((n) => (
            <Card key={n.id} className={`p-4 ${!n.read ? "border-primary/30 bg-primary/5" : ""}`}>
              <p className="text-sm text-foreground">{n.message}</p>
              <p className="text-xs text-muted-foreground mt-2">{n.time}</p>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AgentNotificationsPage;
