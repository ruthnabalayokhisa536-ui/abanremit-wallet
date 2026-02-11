import React, { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PinInput from "@/components/PinInput";
import ReceiptScreen from "@/components/ReceiptScreen";

type Step = "form" | "confirm" | "pin" | "receipt";

const DepositPage = () => {
  const [step, setStep] = useState<Step>("form");
  const [method, setMethod] = useState<"mpesa" | "wallet">("mpesa");
  const [amount, setAmount] = useState("");

  const handleConfirm = () => setStep("pin");
  const handlePin = () => setStep("receipt");
  const handleDone = () => { setStep("form"); setAmount(""); };

  if (step === "pin") {
    return (
      <DashboardLayout role="user">
        <div className="max-w-md mx-auto">
          <PinInput onSubmit={handlePin} onCancel={() => setStep("confirm")} />
        </div>
      </DashboardLayout>
    );
  }

  if (step === "receipt") {
    return (
      <DashboardLayout role="user">
        <div className="max-w-md mx-auto">
          <ReceiptScreen
            title="Deposit Successful"
            message={`KES ${amount}.00 has been deposited to your wallet via ${method === "mpesa" ? "M-Pesa" : "Wallet"}.`}
            items={[
              { label: "Transaction ID", value: "TXN20260211099" },
              { label: "Amount", value: `KES ${amount}.00` },
              { label: "Method", value: method === "mpesa" ? "M-Pesa" : "Wallet" },
              { label: "Fee", value: "KES 0.00" },
              { label: "New Balance", value: `KES ${(15300 + Number(amount)).toLocaleString()}.00` },
              { label: "Date", value: "11/02/2026 14:35" },
            ]}
            onDone={handleDone}
          />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="user">
      <div className="max-w-md mx-auto space-y-6">
        <h2 className="text-2xl font-bold text-foreground">Deposit</h2>

        {step === "form" && (
          <Card className="p-6 space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Deposit Method</label>
              <div className="flex gap-2 mt-2">
                <Button variant={method === "mpesa" ? "default" : "outline"} onClick={() => setMethod("mpesa")} className="flex-1">M-Pesa</Button>
                <Button variant={method === "wallet" ? "default" : "outline"} onClick={() => setMethod("wallet")} className="flex-1">Wallet</Button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Amount (KES)</label>
              <Input type="number" placeholder="Enter amount" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1" />
            </div>
            {method === "mpesa" && (
              <div>
                <label className="text-sm font-medium text-foreground">M-Pesa Number</label>
                <Input value="+254 728 XXX XXX" readOnly className="mt-1 bg-muted" />
              </div>
            )}
            <Button onClick={() => setStep("confirm")} disabled={!amount} className="w-full">Continue</Button>
          </Card>
        )}

        {step === "confirm" && (
          <Card className="p-6 space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Confirm Deposit</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Method</span><span className="font-medium">{method === "mpesa" ? "M-Pesa" : "Wallet"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="font-medium">KES {amount}.00</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Fee</span><span className="font-medium">KES 0.00</span></div>
              <div className="flex justify-between border-t border-border pt-2"><span className="font-semibold">Total</span><span className="font-bold text-primary">KES {amount}.00</span></div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep("form")} className="flex-1">Back</Button>
              <Button onClick={handleConfirm} className="flex-1">Confirm</Button>
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DepositPage;
