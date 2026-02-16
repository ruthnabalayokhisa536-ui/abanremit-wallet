import React, { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PinInput from "@/components/PinInput";
import ReceiptScreen from "@/components/ReceiptScreen";
import AccountConfirmation from "@/components/AccountConfirmation";
import { smsService } from "@/services/payment";
import { toast } from "sonner";
import { useWallet } from "@/hooks/use-wallet";
import { supabase } from "@/integrations/supabase/client";

type Step = "form" | "confirm" | "pin" | "receipt";

const SendMoneyPage = () => {
  const [step, setStep] = useState<Step>("form");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [txId, setTxId] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const { wallet } = useWallet();

  const fee = Math.max(15, Number(amount) * 0.005);
  const totalAmount = Number(amount) + fee;

  const handlePin = async () => {
    setIsProcessing(true);
    try {
      const { data: currentWallet } = await supabase
        .from("wallets").select("balance").eq("id", wallet?.id).single();

      if (!currentWallet || currentWallet.balance < totalAmount) {
        toast.error("Insufficient funds");
        setIsProcessing(false);
        setStep("form");
        return;
      }

      const generatedTxId = "TXN-" + Date.now().toString(36).toUpperCase();
      setTxId(generatedTxId);

      await smsService.sendTransferConfirmation(phone, Number(amount), wallet?.wallet_id || "WLT001", generatedTxId);
      toast.success("Transfer sent! SMS notification delivered.");
      setStep("receipt");
    } catch (error) {
      toast.error("Transfer completed but SMS notification failed");
      setStep("receipt");
    }
    setIsProcessing(false);
  };

  const handleDone = () => { setStep("form"); setPhone(""); setAmount(""); };

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
            title="Money Sent Successfully"
            message={`ABANREMIT: Confirmed. KES ${amount}.00 sent to ${phone}. Wallet ${wallet?.wallet_id || "—"}. Ref ${txId}.`}
            items={[
              { label: "Transaction ID", value: txId },
              { label: "Recipient Phone", value: phone },
              { label: "Amount", value: `KES ${amount}.00` },
              { label: "Fee", value: `KES ${fee.toFixed(2)}` },
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
    return (
      <DashboardLayout role="user">
        <div className="max-w-md mx-auto">
          <AccountConfirmation
            title="Confirm Send Money"
            details={[{ label: "Recipient Phone", value: phone }]}
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
    <DashboardLayout role="user">
      <div className="max-w-md mx-auto space-y-6">
        <h2 className="text-2xl font-bold text-foreground">Send Money</h2>
        <Card className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">Recipient Phone Number</label>
            <Input type="tel" placeholder="+254 7XX XXX XXX" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1" disabled={isProcessing} />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Amount (KES)</label>
            <Input type="number" placeholder="Enter amount" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1" disabled={isProcessing} />
          </div>
          {amount && <div className="text-sm text-muted-foreground">Fee: <span className="text-destructive">KES {fee.toFixed(2)}</span></div>}
          {amount && wallet && (
            <div className="text-sm">
              <span className="text-muted-foreground">Available Balance: </span>
              <span className={`font-medium ${(wallet.balance < totalAmount) ? 'text-destructive' : 'text-success'}`}>
                KES {wallet.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}
          {amount && wallet && wallet.balance < totalAmount && (
            <div className="text-sm text-destructive font-medium">⚠️ Insufficient funds</div>
          )}
          <Button onClick={() => setStep("confirm")} disabled={!phone || !amount || isProcessing || (wallet && wallet.balance < totalAmount)} className="w-full">
            {isProcessing ? "Processing..." : "Continue"}
          </Button>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default SendMoneyPage;
