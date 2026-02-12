import React, { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PinInput from "@/components/PinInput";
import { getLoggedInUser } from "@/lib/test-accounts";

const ProfilePage = () => {
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [pinSet, setPinSet] = useState(false);
  const user = getLoggedInUser();

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
        <h2 className="text-2xl font-bold text-foreground">Profile & KYC</h2>

        <Card className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Full Name</label>
            <p className="text-foreground font-medium">{user?.name ?? "User"}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Phone Number</label>
            <p className="text-foreground font-medium">{user?.phone ?? ""}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Email</label>
            <p className="text-foreground font-medium">{user?.email ?? "-"}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Wallet ID</label>
            <p className="text-foreground font-mono text-sm">{user?.walletId ?? ""}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">KYC Status</label>
            <div className="mt-1">
              <Badge
                variant={user?.kycStatus === "approved" ? "default" : user?.kycStatus === "pending" ? "secondary" : "destructive"}
              >
                {user?.kycStatus ? user.kycStatus.charAt(0).toUpperCase() + user.kycStatus.slice(1) : "Pending"}
              </Badge>
            </div>
          </div>
        </Card>

        {/* KYC Upload Section */}
        <Card className="p-6 space-y-4">
          <h3 className="text-lg font-semibold text-foreground">KYC Documents</h3>
          <p className="text-sm text-muted-foreground">Upload your documents for verification. Required: Live selfie + National ID (front & back).</p>
          <div className="space-y-3">
            <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground">📸 Live Selfie</p>
              <Button variant="outline" size="sm" className="mt-2">Upload</Button>
            </div>
            <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground">🪪 National ID (Front)</p>
              <Button variant="outline" size="sm" className="mt-2">Upload</Button>
            </div>
            <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground">🪪 National ID (Back)</p>
              <Button variant="outline" size="sm" className="mt-2">Upload</Button>
            </div>
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
