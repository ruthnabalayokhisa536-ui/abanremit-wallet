import React, { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PinInput from "@/components/PinInput";
import ReceiptScreen from "@/components/ReceiptScreen";
import AccountConfirmation from "@/components/AccountConfirmation";
import { useWallet } from "@/hooks/use-wallet";

type Step = "form" | "confirm" | "pin" | "receipt";
type WithdrawMethod = "agent" | "mpesa";

const WithdrawPage = () => {
  const [step, setStep] = useState<Step>("form");
  const [method, setMethod] = useState<WithdrawMethod>("mpesa");
  const [amount, setAmount] = useState("");
  const [agentNumber, setAgentNumber] = useState("");
  const [txId, setTxId] = useState("");
  const { wallet } = useWallet();

  const fee = Math.max(30, Number(amount) * 0.01);
  const handleDone = () => { setStep("form"); setAmount(""); setAgentNumber(""); };

  if (step === "pin") {
    return (
      <DashboardLayout role="user">
        <div className="max-w-md mx-auto">
          <PinInput onSubmit={() => { setTxId("TXN-" + Date.now().toString(36).toUpperCase()); setStep("receipt"); }} onCancel={() => setStep("confirm")} />
        </div>
      </DashboardLayout>
    );
  }

  if (step === "receipt") {
    return (
      <DashboardLayout role="user">
        <div className="max-w-md mx-auto">
          <ReceiptScreen
            title="Withdrawal Successful"
            message={`ABANREMIT: Confirmed. KES ${amount}.00 withdrawn via ${method === "agent" ? "Agent" : "M-Pesa"}. Wallet ${wallet?.wallet_id || "—"}. Ref ${txId}.`}
            items={[
              { label: "Transaction ID", value: txId },
              { label: "Amount", value: `KES ${amount}.00` },
              { label: "Fee", value: `KES ${fee.toFixed(2)}` },
              { label: "Method", value: method === "agent" ? "Agent Withdrawal" : "M-Pesa" },
              { label: "New Balance", value: `KES ${((wallet?.balance ?? 0) - Number(amount) - fee).toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
              { label: "Date", value: new Date().toLocaleString() },
            ]}
            onDone={handleDone}
          />
        </div>
      </DashboardLayout>
    );
  }

  if (step === "confirm") {
    const details = method === "agent"
      ? [{ label: "Agent Number", value: agentNumber }]
      : [{ label: "M-Pesa", value: "Your registered number" }];
    return (
      <DashboardLayout role="user">
        <div className="max-w-md mx-auto">
          <AccountConfirmation title="Confirm Withdrawal" details={details} amount={amount} fee={fee.toFixed(2)} onConfirm={() => setStep("pin")} onCancel={() => setStep("form")} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="user">
      <div className="max-w-md mx-auto space-y-6">
        <h2 className="text-2xl font-bold text-foreground">Withdraw</h2>
        <Card className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">Withdraw To</label>
            <div className="flex gap-2 mt-2">
              <Button variant={method === "mpesa" ? "default" : "outline"} onClick={() => setMethod("mpesa")} className="flex-1">M-Pesa</Button>
              <Button variant={method === "agent" ? "default" : "outline"} onClick={() => setMethod("agent")} className="flex-1">Agent</Button>
            </div>
          </div>
          {method === "agent" && (
            <div>
              <label className="text-sm font-medium text-foreground">Agent Number</label>
              <Input placeholder="Enter agent number" value={agentNumber} onChange={(e) => setAgentNumber(e.target.value)} className="mt-1" />
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-foreground">Amount (KES)</label>
            <Input type="number" placeholder="Enter amount" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1" />
          </div>
          {amount && <div className="text-sm text-muted-foreground">Fee: <span className="text-destructive">KES {fee.toFixed(2)}</span></div>}
          <Button onClick={() => setStep("confirm")} disabled={!amount || (method === "agent" && !agentNumber)} className="w-full">Continue</Button>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default WithdrawPage;
