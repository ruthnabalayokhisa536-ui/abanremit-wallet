import React, { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PinInput from "@/components/PinInput";
import ReceiptScreen from "@/components/ReceiptScreen";
import AccountConfirmation from "@/components/AccountConfirmation";
import { useWallet } from "@/hooks/use-wallet";
import { useProfile } from "@/hooks/use-profile";

type Step = "form" | "confirm" | "pin" | "receipt";

const AgentWithdrawPage = () => {
  const [step, setStep] = useState<Step>("form");
  const [amount, setAmount] = useState("");
  const [txId, setTxId] = useState("");
  const { wallet } = useWallet();
  const { profile } = useProfile();

  const fee = Math.max(50, Number(amount) * 0.015);
  const handleDone = () => { setStep("form"); setAmount(""); };

  if (step === "pin") {
    return (
      <DashboardLayout role="agent">
        <div className="max-w-md mx-auto">
          <PinInput onSubmit={() => { setTxId("TXN-" + Date.now().toString(36).toUpperCase()); setStep("receipt"); }} onCancel={() => setStep("confirm")} title="Enter Agent PIN" />
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
            message={`ABANREMIT: Confirmed. KES ${amount}.00 withdrawn to M-Pesa. Wallet ${wallet?.wallet_id || "—"}. Ref ${txId}.`}
            items={[
              { label: "Transaction ID", value: txId },
              { label: "Method", value: "M-Pesa" },
              { label: "Amount", value: `KES ${amount}.00` },
              { label: "Fee", value: `KES ${fee.toFixed(2)}` },
              { label: "Agent Balance", value: `KES ${((wallet?.balance ?? 0) - Number(amount) - fee).toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
              { label: "Date", value: new Date().toLocaleString() },
            ]}
            onDone={handleDone}
          />
        </div>
      </DashboardLayout>
    );
  }

  if (step === "confirm") {
    return (
      <DashboardLayout role="agent">
        <div className="max-w-md mx-auto">
          <AccountConfirmation
            title="Confirm Withdrawal to M-Pesa"
            details={[{ label: "M-Pesa Name", value: profile?.full_name ?? "Agent" }, { label: "Phone", value: profile?.phone ?? "—" }]}
            amount={amount}
            fee={fee.toFixed(2)}
            onConfirm={() => setStep("pin")}
            onCancel={() => setStep("form")}
          />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="agent">
      <div className="max-w-md mx-auto space-y-6">
        <h2 className="text-2xl font-bold text-foreground">Withdraw to M-Pesa</h2>
        <Card className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">M-Pesa Number</label>
            <Input value={profile?.phone ?? ""} readOnly className="mt-1 bg-muted" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Amount (KES)</label>
            <Input type="number" placeholder="Enter amount" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1" />
          </div>
          {amount && <p className="text-sm text-muted-foreground">Fee: <span className="text-destructive">KES {fee.toFixed(2)}</span></p>}
          <Button onClick={() => setStep("confirm")} disabled={!amount} className="w-full">Continue</Button>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AgentWithdrawPage;
