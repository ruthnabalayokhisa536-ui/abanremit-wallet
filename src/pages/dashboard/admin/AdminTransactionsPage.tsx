import React, { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

const demoDeposits = [
  { id: "TXN20260211001", user: "Alice Kamau", amount: "KES 5,000.00", method: "M-Pesa", date: "11/02/2026 14:32", status: "Completed" },
  { id: "TXN20260207034", user: "Peter Ochieng", amount: "KES 10,000.00", method: "Wallet", date: "07/02/2026 08:00", status: "Completed" },
];

const demoWithdrawals = [
  { id: "TXN20260210045", user: "Alice Kamau", amount: "KES 1,200.00", method: "M-Pesa", fee: "KES 30.00", date: "10/02/2026 09:15", status: "Completed" },
  { id: "TXN20260208090", user: "Grace Wanjiku", amount: "KES 500.00", method: "Agent", fee: "KES 15.00", date: "08/02/2026 12:30", status: "Completed" },
];

const demoTransfers = [
  { id: "TXN20260211030", from: "AGT-0042", to: "WAL-2026-4829-7183", amount: "KES 8,000.00", fee: "KES 0.00", date: "11/02/2026 13:10", status: "Completed" },
  { id: "TXN20260210019", from: "AGT-0042", to: "WAL-2026-5930-8294", amount: "KES 5,000.00", fee: "KES 50.00", date: "10/02/2026 10:30", status: "Completed" },
];

const demoStatements = [
  { id: "STM-001", user: "Alice Kamau", fee: "KES 50.00", date: "11/02/2026 14:45" },
  { id: "STM-002", user: "Peter Ochieng", fee: "KES 50.00", date: "10/02/2026 11:00" },
];

const TxTable = ({ headers, rows }: { headers: string[]; rows: string[][] }) => (
  <Card className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border bg-muted/50">
          {headers.map((h) => (
            <th key={h} className="text-left p-3 font-medium text-muted-foreground">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className="border-b border-border last:border-0">
            {row.map((cell, j) => (
              <td key={j} className={`p-3 ${j === 0 ? "font-mono text-xs" : ""}`}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </Card>
);

const AdminTransactionsPage = () => {
  return (
    <DashboardLayout role="admin">
      <div className="max-w-6xl mx-auto space-y-6">
        <h2 className="text-2xl font-bold text-foreground">Transactions</h2>
        <Tabs defaultValue="deposits">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="deposits">Deposits</TabsTrigger>
            <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
            <TabsTrigger value="transfers">Transfers</TabsTrigger>
            <TabsTrigger value="statements">Statements</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="deposits">
            <TxTable
              headers={["Transaction ID", "User", "Amount", "Method", "Date", "Status"]}
              rows={demoDeposits.map(d => [d.id, d.user, d.amount, d.method, d.date, d.status])}
            />
          </TabsContent>

          <TabsContent value="withdrawals">
            <TxTable
              headers={["Transaction ID", "User", "Amount", "Method", "Fee", "Date", "Status"]}
              rows={demoWithdrawals.map(d => [d.id, d.user, d.amount, d.method, d.fee, d.date, d.status])}
            />
          </TabsContent>

          <TabsContent value="transfers">
            <TxTable
              headers={["Transaction ID", "From", "To", "Amount", "Fee", "Date", "Status"]}
              rows={demoTransfers.map(d => [d.id, d.from, d.to, d.amount, d.fee, d.date, d.status])}
            />
          </TabsContent>

          <TabsContent value="statements">
            <TxTable
              headers={["Statement ID", "User", "Fee", "Date"]}
              rows={demoStatements.map(d => [d.id, d.user, d.fee, d.date])}
            />
          </TabsContent>

          <TabsContent value="reports">
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">Reports module will be available in the next release.</p>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AdminTransactionsPage;
