import React from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";

const AdminReportsPage = () => (
  <DashboardLayout role="admin">
    <div className="max-w-6xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Reports</h2>
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">Reports module will be available in the next release.</p>
      </Card>
    </div>
  </DashboardLayout>
);

export default AdminReportsPage;
