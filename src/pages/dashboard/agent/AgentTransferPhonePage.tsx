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

const AgentTransferPhonePage = () => {
  const [step, setStep] = useState<Step>("form");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [txId, setTxId] = useState("");
  const { wallet } = useWallet();
  const fee = Math.max(15, Number(amount) * 0.005);
  const handleDone = () => { setStep("form"); setPhone(""); setAmount(""); };

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
            title="Transfer to Phone Successful"
            message={`KES ${amount}.00 sent to ${phone}.`}
            items={[
              { label: "Transaction ID", value: "TXN20260212PHN" },
              { label: "Recipient", value: "Peter Ochieng" },
              { label: "Phone", value: phone },
              { label: "Amount", value: `KES ${amount}.00` },
              { label: "Fee", value: `KES ${fee.toFixed(2)}` },
              { label: "Your Balance", value: `KES ${((user?.balance ?? 245800) - Number(amount) - fee).toLocaleString()}.00` },
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
            title="Confirm Send to Phone"
            details={[
              { label: "Recipient Name", value: "Peter Ochieng" },
              { label: "M-Pesa Name", value: "PETER OCHIENG ONYANGO" },
              { label: "Phone", value: phone },
            ]}
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
        <h2 className="text-2xl font-bold text-foreground">Send to Phone</h2>
        <Card className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">Recipient Phone Number</label>
            <Input type="tel" placeholder="07XX XXX XXX" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Amount (KES)</label>
            <Input type="number" placeholder="Enter amount" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1" />
          </div>
          {amount && <p className="text-sm text-muted-foreground">Fee: <span className="text-destructive">KES {fee.toFixed(2)}</span></p>}
          <Button onClick={() => setStep("confirm")} disabled={!phone || !amount} className="w-full">Continue</Button>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AgentTransferPhonePage;
