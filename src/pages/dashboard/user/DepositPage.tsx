import React, { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PinInput from "@/components/PinInput";
import ReceiptScreen from "@/components/ReceiptScreen";
import { getLoggedInUser } from "@/lib/test-accounts";

type Step = "form" | "confirm" | "pin" | "receipt";
type Method = "mpesa" | "pesapal" | "card";

const DepositPage = () => {
  const [step, setStep] = useState<Step>("form");
  const [method, setMethod] = useState<Method>("mpesa");
  const [amount, setAmount] = useState("");
  const [cardForm, setCardForm] = useState({ number: "", expiry: "", cvv: "", name: "" });
  const user = getLoggedInUser();
  const serviceFee = 0.40;

  const handleConfirm = () => setStep("pin");
  const handlePin = () => setStep("receipt");
  const handleDone = () => { setStep("form"); setAmount(""); setCardForm({ number: "", expiry: "", cvv: "", name: "" }); };

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
            title="Wallet Loaded Successfully"
            message={`KES ${amount}.00 has been loaded to your wallet via ${method === "mpesa" ? "M-Pesa" : method === "pesapal" ? "PesaPal" : "Card"}.`}
            items={[
              { label: "Transaction ID", value: "TXN20260212099" },
              { label: "Amount", value: `KES ${amount}.00` },
              { label: "Method", value: method === "mpesa" ? "M-Pesa" : method === "pesapal" ? "PesaPal" : "Card" },
              { label: "Service Fee", value: `KES ${serviceFee.toFixed(2)}` },
              { label: "Sender", value: user?.name ?? "User" },
              { label: "Wallet ID", value: user?.walletId ?? "7770001" },
              { label: "New Balance", value: `KES ${((user?.balance ?? 15300) + Number(amount)).toLocaleString()}.00` },
              { label: "Date", value: new Date().toLocaleString() },
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
        <h2 className="text-2xl font-bold text-foreground">Load Wallet</h2>

        {step === "form" && (
          <Card className="p-6 space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Payment Method</label>
              <div className="flex gap-2 mt-2">
                <Button variant={method === "mpesa" ? "default" : "outline"} onClick={() => setMethod("mpesa")} className="flex-1">M-Pesa</Button>
                <Button variant={method === "pesapal" ? "default" : "outline"} onClick={() => setMethod("pesapal")} className="flex-1">PesaPal</Button>
                <Button variant={method === "card" ? "default" : "outline"} onClick={() => setMethod("card")} className="flex-1">Card</Button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Amount (KES)</label>
              <Input type="number" placeholder="Enter amount" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1" />
            </div>
            {method === "mpesa" && (
              <div>
                <label className="text-sm font-medium text-foreground">M-Pesa Number</label>
                <Input value={user?.phone ?? ""} readOnly className="mt-1 bg-muted" />
              </div>
            )}
            {method === "card" && (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-foreground">Card Number</label>
                  <Input placeholder="XXXX XXXX XXXX XXXX" value={cardForm.number} onChange={(e) => setCardForm({ ...cardForm, number: e.target.value })} className="mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-foreground">Expiry</label>
                    <Input placeholder="MM/YY" value={cardForm.expiry} onChange={(e) => setCardForm({ ...cardForm, expiry: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">CVV</label>
                    <Input type="password" placeholder="***" maxLength={4} value={cardForm.cvv} onChange={(e) => setCardForm({ ...cardForm, cvv: e.target.value })} className="mt-1" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Cardholder Name</label>
                  <Input placeholder="Name on card" value={cardForm.name} onChange={(e) => setCardForm({ ...cardForm, name: e.target.value })} className="mt-1" />
                </div>
              </div>
            )}
            {amount && <p className="text-xs text-muted-foreground">M-Pesa service fee: <span className="text-destructive">KES {serviceFee.toFixed(2)}</span></p>}
            <Button onClick={() => setStep("confirm")} disabled={!amount} className="w-full">Continue</Button>
          </Card>
        )}

        {step === "confirm" && (
          <Card className="p-6 space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Confirm Load Wallet</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Method</span><span className="font-medium">{method === "mpesa" ? "M-Pesa" : method === "pesapal" ? "PesaPal" : "Card"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="font-medium">KES {amount}.00</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Service Fee</span><span className="font-medium text-destructive">KES {serviceFee.toFixed(2)}</span></div>
              <div className="flex justify-between border-t border-border pt-2"><span className="font-semibold">Total</span><span className="font-bold text-primary">KES {(Number(amount) + serviceFee).toFixed(2)}</span></div>
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
