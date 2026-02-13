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
type Method = "mpesa" | "wallet";

const AgentDepositPage = () => {
  const [step, setStep] = useState<Step>("form");
  const [method, setMethod] = useState<Method>("wallet");
  const [walletNumber, setWalletNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [txId, setTxId] = useState("");
  const { wallet } = useWallet();

  const handleDone = () => { setStep("form"); setWalletNumber(""); setAmount(""); };

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
            title="Deposit Successful"
            message={`ABANREMIT: Confirmed. KES ${amount}.00 deposited to wallet ${walletNumber}. Ref ${txId}.`}
            items={[
              { label: "Transaction ID", value: txId },
              { label: "Wallet ID", value: walletNumber },
              { label: "Amount", value: `KES ${amount}.00` },
              { label: "Method", value: method === "mpesa" ? "M-Pesa" : "Internal Wallet" },
              { label: "Commission Earned", value: `KES ${(Number(amount) * 0.02).toFixed(2)}` },
              { label: "Agent Balance", value: `KES ${((wallet?.balance ?? 0) - Number(amount)).toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
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
            title="Confirm Deposit to User"
            details={[
              { label: "Wallet ID", value: walletNumber },
              { label: "Method", value: method === "mpesa" ? "M-Pesa" : "Internal Wallet" },
            ]}
            amount={amount}
            fee="0.00"
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
        <h2 className="text-2xl font-bold text-foreground">Deposit to User Wallet</h2>
        <Card className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">Deposit Method</label>
            <div className="flex gap-2 mt-2">
              <Button variant={method === "wallet" ? "default" : "outline"} onClick={() => setMethod("wallet")} className="flex-1">Wallet</Button>
              <Button variant={method === "mpesa" ? "default" : "outline"} onClick={() => setMethod("mpesa")} className="flex-1">M-Pesa</Button>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">User Wallet Number</label>
            <Input placeholder="Enter wallet ID" value={walletNumber} onChange={(e) => setWalletNumber(e.target.value)} className="mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Amount (KES)</label>
            <Input type="number" placeholder="Enter amount" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1" />
          </div>
          <Button onClick={() => setStep("confirm")} disabled={!walletNumber || !amount} className="w-full">Continue</Button>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AgentDepositPage;
