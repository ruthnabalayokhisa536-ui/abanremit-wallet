import React, { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PinInput from "@/components/PinInput";
import ReceiptScreen from "@/components/ReceiptScreen";
import AccountConfirmation from "@/components/AccountConfirmation";

type Action = "withdraw_mpesa" | "withdraw_wallet" | "send_money" | null;
type Step = "select" | "form" | "confirm" | "pin" | "receipt";

const AdminActionsPage = () => {
  const [action, setAction] = useState<Action>(null);
  const [step, setStep] = useState<Step>("select");
  const [amount, setAmount] = useState("");
  const [target, setTarget] = useState("");

  const handleDone = () => { setStep("select"); setAction(null); setAmount(""); setTarget(""); };

  if (step === "pin") {
    return (
      <DashboardLayout role="admin">
        <div className="max-w-md mx-auto">
          <PinInput onSubmit={() => setStep("receipt")} onCancel={() => setStep("confirm")} title="Enter Admin PIN" />
        </div>
      </DashboardLayout>
    );
  }

  if (step === "receipt") {
    const label = action === "withdraw_mpesa" ? "M-Pesa Withdrawal" : action === "withdraw_wallet" ? "Wallet Withdrawal" : "Send Money";
    return (
      <DashboardLayout role="admin">
        <div className="max-w-md mx-auto">
          <ReceiptScreen
            title={`${label} Successful`}
            message={`KES ${amount}.00 processed successfully.`}
            items={[
              { label: "Transaction ID", value: "TXN20260211ADM" },
              { label: "Action", value: label },
              { label: "Amount", value: `KES ${amount}.00` },
              { label: action === "withdraw_mpesa" ? "M-Pesa Name" : "Recipient", value: action === "withdraw_mpesa" ? "Admin Account" : target || "N/A" },
              { label: "Date", value: "11/02/2026 15:10" },
            ]}
            onDone={handleDone}
          />
        </div>
      </DashboardLayout>
    );
  }

  if (step === "confirm" && action) {
    const details = action === "withdraw_mpesa"
      ? [{ label: "M-Pesa Name", value: "Admin Account" }, { label: "Phone", value: "+254 700 000 000" }]
      : action === "withdraw_wallet"
      ? [{ label: "Wallet ID", value: target }, { label: "Wallet Owner", value: "Peter Ochieng" }]
      : [{ label: "Recipient Name", value: "Grace Wanjiku" }, { label: "Phone", value: target }];

    return (
      <DashboardLayout role="admin">
        <div className="max-w-md mx-auto">
          <AccountConfirmation
            title={`Confirm ${action === "withdraw_mpesa" ? "M-Pesa Withdrawal" : action === "withdraw_wallet" ? "Wallet Withdrawal" : "Send Money"}`}
            details={details}
            amount={amount}
            onConfirm={() => setStep("pin")}
            onCancel={() => setStep("form")}
          />
        </div>
      </DashboardLayout>
    );
  }

  if (step === "form" && action) {
    return (
      <DashboardLayout role="admin">
        <div className="max-w-md mx-auto space-y-6">
          <Button variant="ghost" onClick={() => { setStep("select"); setAction(null); }}>← Back</Button>
          <h2 className="text-2xl font-bold text-foreground">
            {action === "withdraw_mpesa" ? "Withdraw to M-Pesa" : action === "withdraw_wallet" ? "Withdraw to Wallet" : "Send Money"}
          </h2>
          <Card className="p-6 space-y-4">
            {action !== "withdraw_mpesa" && (
              <div>
                <label className="text-sm font-medium text-foreground">
                  {action === "withdraw_wallet" ? "Wallet Number" : "Recipient Phone"}
                </label>
                <Input
                  placeholder={action === "withdraw_wallet" ? "WAL-XXXX-XXXX-XXXX" : "+254 7XX XXX XXX"}
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  className="mt-1"
                />
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-foreground">Amount (KES)</label>
              <Input type="number" placeholder="Enter amount" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1" />
            </div>
            <Button
              onClick={() => setStep("confirm")}
              disabled={!amount || (action !== "withdraw_mpesa" && !target)}
              className="w-full"
            >
              Continue
            </Button>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="admin">
      <div className="max-w-md mx-auto space-y-6">
        <h2 className="text-2xl font-bold text-foreground">Admin Actions</h2>
        <div className="space-y-3">
          <Card className="p-4 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => { setAction("withdraw_mpesa"); setStep("form"); }}>
            <h3 className="font-semibold text-foreground">Withdraw to M-Pesa</h3>
            <p className="text-sm text-muted-foreground">Withdraw funds to an M-Pesa account</p>
          </Card>
          <Card className="p-4 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => { setAction("withdraw_wallet"); setStep("form"); }}>
            <h3 className="font-semibold text-foreground">Withdraw to Wallet</h3>
            <p className="text-sm text-muted-foreground">Transfer funds to a user or agent wallet</p>
          </Card>
          <Card className="p-4 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => { setAction("send_money"); setStep("form"); }}>
            <h3 className="font-semibold text-foreground">Send Money</h3>
            <p className="text-sm text-muted-foreground">Send money to a phone number</p>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminActionsPage;
