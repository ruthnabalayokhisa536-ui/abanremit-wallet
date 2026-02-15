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

const AgentTransferPage = () => {
  const [step, setStep] = useState<Step>("form");
  const [walletId, setWalletId] = useState("");
  const [amount, setAmount] = useState("");
  const [txId, setTxId] = useState("");
  const { wallet } = useWallet();

  const fee = Math.max(25, Number(amount) * 0.01);
  const handleDone = () => { setStep("form"); setWalletId(""); setAmount(""); };

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
            title="Transfer Successful"
            message={`KES ${amount}.00 transferred to user wallet ${walletId}.`}
            items={[
              { label: "Transaction ID", value: "TXN20260212TRF" },
              { label: "Recipient", value: "Alice Kamau" },
              { label: "Wallet ID", value: walletId },
              { label: "Amount", value: `KES ${amount}.00` },
              { label: "Fee", value: `KES ${fee.toFixed(2)}` },
              { label: "Commission Earned", value: `KES ${(Number(amount) * 0.02).toFixed(2)}` },
              { label: "Agent Balance", value: `KES ${((wallet?.balance ?? 0) - Number(amount) - fee).toLocaleString()}.00` },
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
            title="Confirm Transfer to User Wallet"
            details={[
              { label: "Recipient Name", value: "Alice Kamau" },
              { label: "Wallet ID", value: walletId },
              { label: "Phone", value: "+254 712 345 678" },
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
        <h2 className="text-2xl font-bold text-foreground">Send to User Wallet</h2>
        <Card className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">User Wallet Number</label>
            <Input placeholder="777XXXX" value={walletId} onChange={(e) => setWalletId(e.target.value)} className="mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Amount (KES)</label>
            <Input type="number" placeholder="Enter amount" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1" />
          </div>
          {amount && <p className="text-sm text-muted-foreground">Fee: <span className="text-destructive">KES {fee.toFixed(2)}</span></p>}
          <Button onClick={() => setStep("confirm")} disabled={!walletId || !amount} className="w-full">Continue</Button>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AgentTransferPage;
