import React, { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const demoFees = [
  { type: "Deposit", flat: "0.00", percent: "0%", min: "100", max: "150,000" },
  { type: "Withdrawal", flat: "30.00", percent: "1%", min: "50", max: "70,000" },
  { type: "Transfer", flat: "25.00", percent: "1%", min: "100", max: "100,000" },
  { type: "Send Money", flat: "15.00", percent: "0.5%", min: "10", max: "70,000" },
  { type: "Statement Download", flat: "50.00", percent: "0%", min: "-", max: "-" },
  { type: "Agent Commission", flat: "0.00", percent: "2%", min: "-", max: "-" },
];

const AdminFeesPage = () => {
  return (
    <DashboardLayout role="admin">
      <div className="max-w-4xl mx-auto space-y-6">
        <h2 className="text-2xl font-bold text-foreground">Fees & Charges</h2>
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-3 font-medium text-muted-foreground">Transaction Type</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Flat Fee (KES)</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Percentage</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Min Amount</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Max Amount</th>
                <th className="text-center p-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {demoFees.map((f) => (
                <tr key={f.type} className="border-b border-border last:border-0">
                  <td className="p-3 font-medium">{f.type}</td>
                  <td className="p-3 text-right">{f.flat}</td>
                  <td className="p-3 text-right">{f.percent}</td>
                  <td className="p-3 text-right text-muted-foreground">{f.min}</td>
                  <td className="p-3 text-right text-muted-foreground">{f.max}</td>
                  <td className="p-3 text-center">
                    <Button size="sm" variant="outline" className="text-xs h-7">Edit</Button>
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

export default AdminFeesPage;
