import React from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";

const KYCVerificationPage = () => {
  return (
    <DashboardLayout role="user">
      <div className="max-w-2xl mx-auto space-y-6">
        <h2 className="text-2xl font-bold text-foreground">KYC Verification</h2>
        <Card className="p-6">
          <p className="text-muted-foreground">KYC verification flow is being prepared. Please check back later.</p>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default KYCVerificationPage;
