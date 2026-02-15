import React from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";

const AdminBulkSMSPage = () => {
  return (
    <DashboardLayout role="admin">
      <div className="max-w-2xl mx-auto space-y-6">
        <h2 className="text-2xl font-bold text-foreground">Bulk SMS</h2>
        <Card className="p-6">
          <p className="text-muted-foreground">Bulk SMS management is being prepared for integration.</p>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AdminBulkSMSPage;
