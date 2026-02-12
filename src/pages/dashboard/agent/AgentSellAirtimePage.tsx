import React, { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PinInput from "@/components/PinInput";
import ReceiptScreen from "@/components/ReceiptScreen";
import AccountConfirmation from "@/components/AccountConfirmation";
import { getLoggedInUser } from "@/lib/test-accounts";

type Step = "form" | "confirm" | "pin" | "receipt";

const airtimeAmounts = [50, 100, 200, 500, 1000, 2000];

const AgentSellAirtimePage = () => {
  const [step, setStep] = useState<Step>("form");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState(0);
  const user = getLoggedInUser();

  const handleDone = () => { setStep("form"); setPhone(""); setAmount(0); };

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
            title="Airtime Sold Successfully"
            message={`KES ${amount}.00 airtime sent to ${phone}.`}
            items={[
              { label: "Transaction ID", value: "TXN20260212AIR" },
              { label: "Customer Phone", value: phone },
              { label: "Amount", value: `KES ${amount}.00` },
              { label: "Commission Earned", value: `KES ${(amount * 0.03).toFixed(2)}` },
              { label: "Agent", value: user?.name ?? "Agent" },
              { label: "Agent Balance", value: `KES ${((user?.balance ?? 245800) - amount).toLocaleString()}.00` },
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
            title="Confirm Airtime Sale"
            details={[
              { label: "Customer Phone", value: phone },
              { label: "M-Pesa Name", value: "Grace Wanjiku" },
            ]}
            amount={String(amount)}
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
        <h2 className="text-2xl font-bold text-foreground">Sell Airtime</h2>
        <Card className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">Customer Phone Number</label>
            <Input type="tel" placeholder="07XX XXX XXX" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Select Amount</label>
            <div className="grid grid-cols-3 gap-2">
              {airtimeAmounts.map((a) => (
                <Button key={a} variant={amount === a ? "default" : "outline"} onClick={() => setAmount(a)} className="h-12">
                  KES {a}
                </Button>
              ))}
            </div>
          </div>
          <Button onClick={() => setStep("confirm")} disabled={!phone || !amount} className="w-full">Continue</Button>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AgentSellAirtimePage;
