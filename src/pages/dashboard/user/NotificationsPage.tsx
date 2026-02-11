import React from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";

const demoNotifications = [
  { id: 1, message: "TXN20260211001 Confirmed. KES 5,000.00 deposited to your wallet. New balance: KES 15,300.00.", time: "2 hours ago", read: false },
  { id: 2, message: "TXN20260210045 Confirmed. KES 1,200.00 withdrawn via M-Pesa. Fee: KES 30.00. New balance: KES 10,300.00.", time: "Yesterday", read: false },
  { id: 3, message: "TXN20260209112 Confirmed. KES 100.00 airtime purchased for +254 728 XXX XXX. New balance: KES 11,500.00.", time: "2 days ago", read: true },
  { id: 4, message: "Your KYC documents have been approved. Your wallet is now fully active.", time: "3 days ago", read: true },
  { id: 5, message: "TXN20260207034 Confirmed. KES 10,000.00 deposited to your wallet. New balance: KES 11,600.00.", time: "4 days ago", read: true },
];

const NotificationsPage = () => {
  return (
    <DashboardLayout role="user">
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

export default NotificationsPage;
