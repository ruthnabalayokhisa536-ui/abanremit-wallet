import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import WalletNumberValidator from "@/components/WalletNumberValidator";
import PinInput from "@/components/PinInput";
import ReceiptScreen from "@/components/ReceiptScreen";
import AccountConfirmation from "@/components/AccountConfirmation";
import { sendMoneyService } from "@/services/wallet/send-money.service";
import { toast } from "sonner";
import { useWallet } from "@/hooks/use-wallet";
import { supabase } from "@/integrations/supabase/client";
import { Wallet, Phone } from "lucide-react";

type Step = "form" | "confirm" | "pin" | "receipt";
type TransferType = "wallet" | "phone";

const SendMoneyPage = () => {
  const [step, setStep] = useState<Step>("form");
  const [transferType, setTransferType] = useState<TransferType>("wallet");
  const [walletNumber, setWalletNumber] = useState("");
  const [walletValid, setWalletValid] = useState(false);
  const [recipientName, setRecipientName] = useState("");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [pin, setPin] = useState("");
  const [txId, setTxId] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [fees, setFees] = useState({ wallet: 0, phone: 0 });
  const { wallet, refetch: refetchWallet } = useWallet();

  // Fetch fees from database
  useEffect(() => {
    const fetchFees = async () => {
      const { data } = await supabase
        .from("fees")
        .select("*")
        .in("transaction_type", ["send_money_wallet", "send_money_phone"]);

      if (data) {
        const walletFee = data.find((f) => f.transaction_type === "send_money_wallet");
        const phoneFee = data.find((f) => f.transaction_type === "send_money_phone");
        
        setFees({
          wallet: walletFee ? Number(walletFee.flat_fee) : 0,
          phone: phoneFee ? Number(phoneFee.flat_fee) : 15,
        });
      }
    };
    fetchFees();
  }, []);

  const calculateFee = () => {
    const amt = Number(amount);
    if (transferType === "wallet") {
      // 0.5% fee, min 5, max 50
      return Math.min(Math.max(amt * 0.005, 5), 50);
    } else {
      // 15 KES flat + 1%, min 15, max 100
      return Math.min(Math.max(15 + amt * 0.01, 15), 100);
    }
  };

  const fee = calculateFee();
  const totalAmount = Number(amount) + fee;

  const handleWalletValidation = (isValid: boolean, name?: string) => {
    setWalletValid(isValid);
    setRecipientName(name || "");
  };

  const handlePin = async (enteredPin: string) => {
    setIsProcessing(true);
    setPin(enteredPin);

    try {
      // Real-time balance check
      const { data: currentWallet } = await supabase
        .from("wallets")
        .select("balance")
        .eq("id", wallet?.id)
        .single();

      if (!currentWallet || currentWallet.balance < totalAmount) {
        toast.error("Insufficient funds");
        setIsProcessing(false);
        setStep("form");
        return;
      }

      if (transferType === "wallet") {
        // Wallet-to-wallet transfer
        const result = await sendMoneyService.sendMoney({
          recipientWalletNumber: walletNumber,
          amount: Number(amount),
          description: `Transfer to ${recipientName}`,
          pin: enteredPin,
        });

        if (result.success) {
          setTxId(result.receiptReference || result.transactionId || "");
          toast.success(result.message);
          await refetchWallet();
          setStep("receipt");
        } else {
          toast.error(result.message);
          setStep("form");
        }
      } else {
        // Wallet-to-phone transfer (M-Pesa)
        const generatedTxId = "TXN-" + Date.now().toString(36).toUpperCase();
        setTxId(generatedTxId);

        // Deduct from wallet
        const { error: deductError } = await supabase
          .from("wallets")
          .update({
            balance: currentWallet.balance - totalAmount,
          })
          .eq("id", wallet?.id);

        if (deductError) {
          toast.error("Transfer failed");
          setIsProcessing(false);
          setStep("form");
          return;
        }

        // Create transaction record
        await supabase.from("transactions").insert({
          sender_wallet_id: wallet?.id,
          type: "send_money_phone",
          amount: Number(amount),
          fee: fee,
          status: "completed",
          transaction_id: generatedTxId,
          metadata: { phone, recipient_type: "phone" },
        });

        toast.success("Transfer sent successfully!");
        await refetchWallet();
        setStep("receipt");
      }
    } catch (error: any) {
      toast.error(error.message || "Transfer failed");
      setStep("form");
    }

    setIsProcessing(false);
  };

  const handleDone = () => {
    setStep("form");
    setWalletNumber("");
    setPhone("");
    setAmount("");
    setPin("");
    setRecipientName("");
  };

  if (step === "pin") {
    return (
      <DashboardLayout role="user">
        <div className="max-w-md mx-auto">
          <PinInput
            onSubmit={handlePin}
            onCancel={() => setStep("confirm")}
            disabled={isProcessing}
          />
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
            message={`ABANREMIT: Confirmed. KES ${amount}.00 sent to ${
              transferType === "wallet" ? walletNumber : phone
            }. Wallet ${wallet?.wallet_id || "—"}. Ref ${txId}.`}
            items={[
              { label: "Transaction ID", value: txId },
              {
                label: transferType === "wallet" ? "Recipient Wallet" : "Recipient Phone",
                value: transferType === "wallet" ? walletNumber : phone,
              },
              ...(transferType === "wallet" && recipientName
                ? [{ label: "Recipient Name", value: recipientName }]
                : []),
              { label: "Amount", value: `KES ${amount}.00` },
              { label: "Fee", value: `KES ${fee.toFixed(2)}` },
              {
                label: "New Balance",
                value: `KES ${((wallet?.balance ?? 0) - totalAmount).toLocaleString(
                  undefined,
                  { minimumFractionDigits: 2 }
                )}`,
              },
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
            title={`Confirm Send Money ${transferType === "wallet" ? "to Wallet" : "to Phone"}`}
            details={[
              {
                label: transferType === "wallet" ? "Recipient Wallet" : "Recipient Phone",
                value: transferType === "wallet" ? walletNumber : phone,
              },
              ...(transferType === "wallet" && recipientName
                ? [{ label: "Recipient Name", value: recipientName }]
                : []),
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

  const canProceed =
    amount &&
    ((transferType === "wallet" && walletValid) || (transferType === "phone" && phone)) &&
    wallet &&
    wallet.balance >= totalAmount;

  return (
    <DashboardLayout role="user">
      <div className="max-w-md mx-auto space-y-6">
        <h2 className="text-2xl font-bold text-foreground">Send Money</h2>

        <Card className="p-6 space-y-4">
          <Tabs value={transferType} onValueChange={(v) => setTransferType(v as TransferType)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="wallet" className="flex items-center gap-2">
                <Wallet className="w-4 h-4" />
                To Wallet
              </TabsTrigger>
              <TabsTrigger value="phone" className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                To Phone
              </TabsTrigger>
            </TabsList>

            <TabsContent value="wallet" className="space-y-4 mt-4">
              <WalletNumberValidator
                value={walletNumber}
                onChange={setWalletNumber}
                onValidation={handleWalletValidation}
                label="Recipient Wallet Number"
                placeholder="Enter wallet number (e.g., WLT001)"
                disabled={isProcessing}
              />
            </TabsContent>

            <TabsContent value="phone" className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium text-foreground">
                  Recipient Phone Number
                </label>
                <Input
                  type="tel"
                  placeholder="254XXXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1"
                  disabled={isProcessing}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Money will be sent via M-Pesa
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <div>
            <label className="text-sm font-medium text-foreground">Amount (KES)</label>
            <Input
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1"
              disabled={isProcessing}
            />
          </div>

          {amount && (
            <div className="text-sm text-muted-foreground">
              Fee: <span className="text-destructive">KES {fee.toFixed(2)}</span>
              <span className="text-xs ml-2">
                ({transferType === "wallet" ? "0.5% wallet transfer" : "M-Pesa transfer"})
              </span>
            </div>
          )}

          {amount && wallet && (
            <div className="text-sm">
              <span className="text-muted-foreground">Available Balance: </span>
              <span
                className={`font-medium ${
                  wallet.balance < totalAmount ? "text-destructive" : "text-success"
                }`}
              >
                KES {wallet.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}

          {amount && wallet && wallet.balance < totalAmount && (
            <div className="text-sm text-destructive font-medium">⚠️ Insufficient funds</div>
          )}

          <Button
            onClick={() => setStep("confirm")}
            disabled={!canProceed || isProcessing}
            className="w-full"
          >
            {isProcessing ? "Processing..." : "Continue"}
          </Button>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default SendMoneyPage;
