import React, { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PinInput from "@/components/PinInput";
import ReceiptScreen from "@/components/ReceiptScreen";
import { useWallet } from "@/hooks/use-wallet";
import { sendMoneyService } from "@/services/wallet/send-money.service";
import { toast } from "sonner";
import { Loader2, CheckCircle2 } from "lucide-react";

type Step = "form" | "pin" | "processing" | "receipt";

const SendMoneyPage = () => {
  const [step, setStep] = useState<Step>("form");
  const [walletNumber, setWalletNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [processing, setProcessing] = useState(false);
  const [validating, setValidating] = useState(false);
  const [recipientName, setRecipientName] = useState("");
  const [receiptData, setReceiptData] = useState<any>(null);
  const { wallet } = useWallet();

  const fee = amount ? Math.min(Math.max(Number(amount) * 0.005, 5), 50) : 0;
  const totalDeduction = Number(amount) + fee;

  const handleValidateWallet = async () => {
    if (!walletNumber.trim()) return;

    setValidating(true);
    try {
      const result = await sendMoneyService.validateRecipient(walletNumber);
      if (result.valid) {
        setRecipientName(result.name || "Unknown");
        toast.success(`Recipient: ${result.name}`);
      } else {
        setRecipientName("");
        toast.error(result.error || "Wallet not found");
      }
    } catch (error) {
      toast.error("Failed to validate wallet");
    } finally {
      setValidating(false);
    }
  };

  const handlePinSubmit = async (pin: string) => {
    setProcessing(true);
    setStep("processing");

    try {
      const result = await sendMoneyService.sendMoney({
        recipientWalletNumber: walletNumber,
        amount: Number(amount),
        description: description || undefined,
        pin,
      });

      if (result.success) {
        setReceiptData({
          transactionId: result.transactionId,
          receiptReference: result.receiptReference,
          amount: Number(amount),
          fee,
          walletNumber,
          recipientName,
        });
        setStep("receipt");
        toast.success(result.message);
      } else {
        toast.error(result.message);
        setStep("pin");
      }
    } catch (error: any) {
      toast.error(error.message || "Transfer failed");
      setStep("pin");
    } finally {
      setProcessing(false);
    }
  };

  const handleDone = () => {
    setStep("form");
    setWalletNumber("");
    setAmount("");
    setDescription("");
    setRecipientName("");
    setReceiptData(null);
  };

  const handleContinue = () => {
    if (!amount || Number(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (!walletNumber.trim()) {
      toast.error("Please enter recipient wallet number");
      return;
    }

    if (!recipientName) {
      toast.error("Please validate recipient wallet first");
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
          <p className="text-lg font-medium">Processing transfer...</p>
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
            title="Money Sent Successfully"
            message={`Successfully sent KES ${receiptData.amount} to ${receiptData.recipientName}.`}
            items={[
              { label: "Receipt Reference", value: receiptData.receiptReference || "—" },
              { label: "Transaction ID", value: receiptData.transactionId || "—" },
              { label: "Recipient", value: receiptData.recipientName },
              { label: "Wallet Number", value: receiptData.walletNumber },
              { label: "Amount", value: `KES ${receiptData.amount.toLocaleString()}` },
              { label: "Fee", value: `KES ${receiptData.fee.toFixed(2)}` },
              { label: "Total Deducted", value: `KES ${(receiptData.amount + receiptData.fee).toLocaleString()}` },
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
          <h2 className="text-2xl font-bold text-foreground">Send Money</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Transfer money to another wallet
          </p>
        </div>

        <Card className="p-6 space-y-4">
          <div>
            <Label htmlFor="walletNumber" className="text-sm font-medium text-foreground">
              Recipient Wallet Number
            </Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="walletNumber"
                placeholder="WLT888XXXX"
                value={walletNumber}
                onChange={(e) => {
                  setWalletNumber(e.target.value);
                  setRecipientName("");
                }}
                className="flex-1"
              />
              <Button
                onClick={handleValidateWallet}
                disabled={!walletNumber || validating}
                variant="outline"
              >
                {validating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify"}
              </Button>
            </div>
            {recipientName && (
              <div className="flex items-center gap-2 mt-2 text-sm text-success">
                <CheckCircle2 className="w-4 h-4" />
                <span>{recipientName}</span>
              </div>
            )}
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

          <div>
            <Label htmlFor="description" className="text-sm font-medium text-foreground">
              Description (Optional)
            </Label>
            <Input
              id="description"
              placeholder="What's this for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1"
            />
          </div>

          {amount && Number(amount) > 0 && (
            <div className="bg-muted p-3 rounded-lg space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Amount:</span>
                <span className="font-medium">KES {Number(amount).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Fee (0.5%):</span>
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
            disabled={!amount || !walletNumber || !recipientName || processing}
            className="w-full"
          >
            Continue
          </Button>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default SendMoneyPage;
