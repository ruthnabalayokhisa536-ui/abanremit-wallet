import React, { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PinInput from "@/components/PinInput";
import ReceiptScreen from "@/components/ReceiptScreen";

type Step = "select" | "confirm" | "pin" | "receipt";

const airtimeAmounts = [50, 100, 200, 500, 1000, 2000];

const BuyAirtimePage = () => {
  const [step, setStep] = useState<Step>("select");
  const [amount, setAmount] = useState(0);

  const handleDone = () => { setStep("select"); setAmount(0); };

  if (step === "pin") {
    return (
      <DashboardLayout role="user">
        <div className="max-w-md mx-auto">
          <PinInput onSubmit={() => setStep("receipt")} onCancel={() => setStep("confirm")} />
        </div>
      </DashboardLayout>
    );
  }

  if (step === "receipt") {
    return (
      <DashboardLayout role="user">
        <div className="max-w-md mx-auto">
          <ReceiptScreen
            title="Airtime Purchased"
            message={`KES ${amount}.00 airtime sent to +254 728 XXX XXX.`}
            items={[
              { label: "Transaction ID", value: "TXN20260211108" },
              { label: "Phone", value: "+254 728 XXX XXX" },
              { label: "Amount", value: `KES ${amount}.00` },
              { label: "Fee", value: "KES 0.00" },
              { label: "New Balance", value: `KES ${(15300 - amount).toLocaleString()}.00` },
              { label: "Date", value: "11/02/2026 14:44" },
            ]}
            onDone={handleDone}
          />
        </div>
      </DashboardLayout>
    );
  }

  if (step === "confirm") {
    return (
      <DashboardLayout role="user">
        <div className="max-w-md mx-auto space-y-6">
          <h2 className="text-2xl font-bold text-foreground">Confirm Airtime Purchase</h2>
          <Card className="p-6 space-y-3">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Phone</span><span className="font-medium">+254 728 XXX XXX</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Amount</span><span className="font-bold text-primary">KES {amount}.00</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Fee</span><span>KES 0.00</span></div>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setStep("select")} className="flex-1">Back</Button>
              <Button onClick={() => setStep("pin")} className="flex-1">Confirm</Button>
            </div>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="user">
      <div className="max-w-md mx-auto space-y-6">
        <h2 className="text-2xl font-bold text-foreground">Buy Airtime</h2>
        <Card className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">Phone Number</label>
            <p className="mt-1 text-sm text-foreground bg-muted p-2 rounded">+254 728 XXX XXX</p>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Select Amount</label>
            <div className="grid grid-cols-3 gap-2">
              {airtimeAmounts.map((a) => (
                <Button
                  key={a}
                  variant={amount === a ? "default" : "outline"}
                  onClick={() => setAmount(a)}
                  className="h-12"
                >
                  KES {a}
                </Button>
              ))}
            </div>
          </div>
          <Button onClick={() => setStep("confirm")} disabled={!amount} className="w-full">Continue</Button>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default BuyAirtimePage;
