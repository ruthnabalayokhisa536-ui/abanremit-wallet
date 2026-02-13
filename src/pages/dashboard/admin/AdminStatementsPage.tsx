import React from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";

const AdminStatementsPage = () => (
  <DashboardLayout role="admin">
    <div className="max-w-6xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Statements</h2>
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">Statement downloads and history will appear here.</p>
      </Card>
    </div>
  </DashboardLayout>
);

export default AdminStatementsPage;
