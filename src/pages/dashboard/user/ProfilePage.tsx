import React, { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PinInput from "@/components/PinInput";

const ProfilePage = () => {
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [pinSet, setPinSet] = useState(false);

  if (showPinSetup) {
    return (
      <DashboardLayout role="user">
        <div className="max-w-md mx-auto">
          <PinInput
            title="Create Transaction PIN"
            onSubmit={() => { setPinSet(true); setShowPinSetup(false); }}
            onCancel={() => setShowPinSetup(false)}
          />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="user">
      <div className="max-w-md mx-auto space-y-6">
        <h2 className="text-2xl font-bold text-foreground">Profile</h2>

        <Card className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Full Name</label>
            <p className="text-foreground font-medium">John Doe</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Phone Number</label>
            <p className="text-foreground font-medium">+254 728 XXX XXX</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Email</label>
            <p className="text-foreground font-medium">john@example.com</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Wallet ID</label>
            <p className="text-foreground font-mono text-sm">WAL-2026-4829-7183</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">KYC Status</label>
            <span className="inline-block mt-1 px-2 py-1 rounded text-xs font-medium bg-success/10 text-success">Approved</span>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Transaction PIN</h3>
          {pinSet ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-success font-medium">✓ PIN has been set</span>
              <Button variant="outline" size="sm" onClick={() => setShowPinSetup(true)}>Change PIN</Button>
            </div>
          ) : (
            <div>
              <p className="text-sm text-muted-foreground mb-3">Set a 4-digit PIN for transactions. Required for withdrawals, transfers, and airtime purchases.</p>
              <Button onClick={() => setShowPinSetup(true)}>Create PIN</Button>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ProfilePage;
