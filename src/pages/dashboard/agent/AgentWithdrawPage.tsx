import React, { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PinInput from "@/components/PinInput";
import ReceiptScreen from "@/components/ReceiptScreen";
import AccountConfirmation from "@/components/AccountConfirmation";

type Step = "form" | "confirm" | "pin" | "receipt";
type Method = "mpesa" | "wallet";

const AgentWithdrawPage = () => {
  const [step, setStep] = useState<Step>("form");
  const [method, setMethod] = useState<Method>("mpesa");
  const [target, setTarget] = useState("");
  const [amount, setAmount] = useState("");

  const fee = Math.max(50, Number(amount) * 0.015);
  const handleDone = () => { setStep("form"); setTarget(""); setAmount(""); };

  if (step === "pin") {
    return (
      <DashboardLayout role="agent">
        <div className="max-w-md mx-auto">
          <PinInput onSubmit={() => setStep("receipt")} onCancel={() => setStep("confirm")} title="Enter Agent PIN" />
        </div>
      </DashboardLayout>
    );
  }

  if (step === "receipt") {
    return (
      <DashboardLayout role="agent">
        <div className="max-w-md mx-auto">
          <ReceiptScreen
            title="Withdrawal Successful"
            message={`KES ${amount}.00 withdrawn via ${method === "mpesa" ? "M-Pesa" : "Wallet"}.`}
            items={[
              { label: "Transaction ID", value: "TXN20260211036" },
              { label: "Method", value: method === "mpesa" ? "M-Pesa" : "Wallet Transfer" },
              { label: method === "mpesa" ? "M-Pesa Name" : "Wallet ID", value: method === "mpesa" ? "Agent James Mwangi" : target },
              { label: "Amount", value: `KES ${amount}.00` },
              { label: "Fee", value: `KES ${fee.toFixed(2)}` },
              { label: "Agent Balance", value: `KES ${(245800 - Number(amount) - fee).toLocaleString()}.00` },
              { label: "Date", value: "11/02/2026 14:55" },
            ]}
            onDone={handleDone}
          />
        </div>
      </DashboardLayout>
    );
  }

  if (step === "confirm") {
    const details = method === "mpesa"
      ? [{ label: "M-Pesa Name", value: "James Mwangi" }, { label: "Phone", value: "+254 728 XXX XXX" }]
      : [{ label: "Wallet ID", value: target }, { label: "Wallet Owner", value: "Peter Ochieng" }];

    return (
      <DashboardLayout role="agent">
        <div className="max-w-md mx-auto">
          <AccountConfirmation title="Confirm Withdrawal" details={details} amount={amount} fee={fee.toFixed(2)} onConfirm={() => setStep("pin")} onCancel={() => setStep("form")} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="agent">
      <div className="max-w-md mx-auto space-y-6">
        <h2 className="text-2xl font-bold text-foreground">Withdraw</h2>
        <Card className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">Withdraw To</label>
            <div className="flex gap-2 mt-2">
              <Button variant={method === "mpesa" ? "default" : "outline"} onClick={() => setMethod("mpesa")} className="flex-1">M-Pesa</Button>
              <Button variant={method === "wallet" ? "default" : "outline"} onClick={() => setMethod("wallet")} className="flex-1">Wallet</Button>
            </div>
          </div>
          {method === "wallet" && (
            <div>
              <label className="text-sm font-medium text-foreground">Wallet Number</label>
              <Input placeholder="WAL-XXXX-XXXX-XXXX" value={target} onChange={(e) => setTarget(e.target.value)} className="mt-1" />
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-foreground">Amount (KES)</label>
            <Input type="number" placeholder="Enter amount" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1" />
          </div>
          {amount && <p className="text-sm text-muted-foreground">Fee: <span className="text-destructive">KES {fee.toFixed(2)}</span></p>}
          <Button onClick={() => setStep("confirm")} disabled={!amount || (method === "wallet" && !target)} className="w-full">Continue</Button>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AgentWithdrawPage;
