import React, { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PinInput from "@/components/PinInput";
import ReceiptScreen from "@/components/ReceiptScreen";
import { useWallet } from "@/hooks/use-wallet";
import { withdrawService } from "@/services/wallet/withdraw.service";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

type Step = "form" | "pin" | "processing" | "receipt";
type WithdrawMethod = "agent" | "mpesa" | "bank";

const WithdrawPage = () => {
  const [step, setStep] = useState<Step>("form");
  const [method, setMethod] = useState<WithdrawMethod>("mpesa");
  const [amount, setAmount] = useState("");
  const [destination, setDestination] = useState("");
  const [processing, setProcessing] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const { wallet } = useWallet();

  const fee = amount ? Math.min(Math.max(Number(amount) * 0.01, 10), 100) : 0;
  const totalDeduction = Number(amount) + fee;

  const handlePinSubmit = async (pin: string) => {
    setProcessing(true);
    setStep("processing");

    try {
      const result = await withdrawService.withdraw({
        amount: Number(amount),
        method,
        destination,
        pin,
      });

      if (result.success) {
        setReceiptData({
          transactionId: result.transactionId,
          receiptReference: result.receiptReference,
          amount: Number(amount),
          fee,
          method,
          destination,
        });
        setStep("receipt");
        toast.success(result.message);
      } else {
        toast.error(result.message);
        setStep("pin");
      }
    } catch (error: any) {
      toast.error(error.message || "Withdrawal failed");
      setStep("pin");
    } finally {
      setProcessing(false);
    }
  };

  const handleDone = () => {
    setStep("form");
    setAmount("");
    setDestination("");
    setReceiptData(null);
  };

  const handleContinue = () => {
    if (!amount || Number(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (!destination.trim()) {
      toast.error(`Please enter ${method === "mpesa" ? "M-Pesa number" : method === "bank" ? "bank account" : "agent number"}`);
      return;
    }

    if (wallet && wallet.balance < totalDeduction) {
      toast.error(`Insufficient balance. Required: ${totalDeduction}, Available: ${wallet.balance}`);
      return;
    }

    setStep("pin");
  };

  if (step === "processing") {
    return (
      <DashboardLayout role="user">
        <div className="max-w-md mx-auto flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="text-lg font-medium">Processing withdrawal...</p>
          <p className="text-sm text-muted-foreground">Please wait</p>
        </div>
      </DashboardLayout>
    );
  }

  if (step === "pin") {
    return (
      <DashboardLayout role="user">
        <div className="max-w-md mx-auto">
          <PinInput
            title="Enter Transaction PIN"
            onSubmit={handlePinSubmit}
            onCancel={() => setStep("form")}
          />
        </div>
      </DashboardLayout>
    );
  }

  if (step === "receipt" && receiptData) {
    return (
      <DashboardLayout role="user">
        <div className="max-w-md mx-auto">
          <ReceiptScreen
            title="Withdrawal Successful"
            message={`Successfully withdrew KES ${receiptData.amount} via ${method === "agent" ? "Agent" : method === "bank" ? "Bank" : "M-Pesa"}.`}
            items={[
              { label: "Receipt Reference", value: receiptData.receiptReference || "—" },
              { label: "Transaction ID", value: receiptData.transactionId || "—" },
              { label: "Amount", value: `KES ${receiptData.amount.toLocaleString()}` },
              { label: "Fee", value: `KES ${receiptData.fee.toFixed(2)}` },
              { label: "Total Deducted", value: `KES ${(receiptData.amount + receiptData.fee).toLocaleString()}` },
              { label: "Method", value: method === "agent" ? "Agent Withdrawal" : method === "bank" ? "Bank Transfer" : "M-Pesa" },
              { label: "Destination", value: receiptData.destination },
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
        <div>
          <h2 className="text-2xl font-bold text-foreground">Withdraw</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Withdraw funds from your wallet
          </p>
        </div>

        <Card className="p-6 space-y-4">
          <div>
            <Label className="text-sm font-medium text-foreground">Withdraw To</Label>
            <div className="flex gap-2 mt-2">
              <Button
                variant={method === "mpesa" ? "default" : "outline"}
                onClick={() => setMethod("mpesa")}
                className="flex-1"
              >
                M-Pesa
              </Button>
              <Button
                variant={method === "bank" ? "default" : "outline"}
                onClick={() => setMethod("bank")}
                className="flex-1"
              >
                Bank
              </Button>
              <Button
                variant={method === "agent" ? "default" : "outline"}
                onClick={() => setMethod("agent")}
                className="flex-1"
              >
                Agent
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="destination" className="text-sm font-medium text-foreground">
              {method === "mpesa" ? "M-Pesa Number" : method === "bank" ? "Bank Account" : "Agent Number"}
            </Label>
            <Input
              id="destination"
              placeholder={
                method === "mpesa"
                  ? "254712345678"
                  : method === "bank"
                  ? "Account number"
                  : "Agent number"
              }
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="amount" className="text-sm font-medium text-foreground">
              Amount (KES)
            </Label>
            <Input
              id="amount"
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1"
              min="1"
            />
          </div>

          {amount && Number(amount) > 0 && (
            <div className="bg-muted p-3 rounded-lg space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Amount:</span>
                <span className="font-medium">KES {Number(amount).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Fee (1%):</span>
                <span className="font-medium text-destructive">KES {fee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-1 mt-1">
                <span className="font-semibold">Total Deduction:</span>
                <span className="font-semibold">KES {totalDeduction.toLocaleString()}</span>
              </div>
              {wallet && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Available Balance:</span>
                  <span>KES {wallet.balance.toLocaleString()}</span>
                </div>
              )}
            </div>
          )}

          <Button
            onClick={handleContinue}
            disabled={!amount || !destination || processing}
            className="w-full"
          >
            Continue
          </Button>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default WithdrawPage;
