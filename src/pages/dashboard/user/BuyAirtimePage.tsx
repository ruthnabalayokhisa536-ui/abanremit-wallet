import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import PinInput from "@/components/PinInput";
import ReceiptScreen from "@/components/ReceiptScreen";
import { useWallet } from "@/hooks/use-wallet";
import { useProfile } from "@/hooks/use-profile";
import { airtimeService } from "@/services/airtime.service";
import { toast } from "sonner";

type Step = "select" | "pin" | "processing" | "receipt";

const BuyAirtimePage = () => {
  const [step, setStep] = useState<Step>("select");
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [networkId, setNetworkId] = useState("");
  const [networks, setNetworks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const { wallet } = useWallet();
  const { profile } = useProfile();

  useEffect(() => {
    const fetchNetworks = async () => {
      const data = await airtimeService.getNetworks();
      setNetworks(data);
      if (data && data.length > 0) setNetworkId(data[0].id);
      setLoading(false);
    };
    fetchNetworks();
  }, []);

  useEffect(() => {
    if (profile?.phone) setPhone(profile.phone);
  }, [profile]);

  const selectedNetwork = networks.find(n => n.id === networkId);
  const amountNum = parseFloat(amount) || 0;
  const fee = amountNum ? amountNum * 0.02 : 0;
  const totalDeduction = amountNum + fee;

  const handlePinSubmit = async (pin: string) => {
    setProcessing(true);
    setStep("processing");

    try {
      const result = await airtimeService.buyAirtime({
        networkId,
        phoneNumber: phone,
        amount: amountNum,
        pin,
      });

      if (result.success) {
        setReceiptData({
          transactionId: result.transactionId,
          receiptReference: result.receiptReference,
          amount: amountNum,
          fee,
          network: selectedNetwork?.name,
          phone,
        });
        setStep("receipt");
        toast.success(result.message);
      } else {
        toast.error(result.message);
        setStep("pin");
      }
    } catch (error: any) {
      toast.error(error.message || "Airtime purchase failed");
      setStep("pin");
    } finally {
      setProcessing(false);
    }
  };

  const handleDone = () => {
    setStep("select");
    setAmount("");
    setReceiptData(null);
  };

  const handleContinue = () => {
    const amountNum = parseFloat(amount);
    
    if (!amount || isNaN(amountNum) || amountNum < 10) {
      toast.error("Minimum airtime amount is KES 10");
      return;
    }

    if (amountNum > 10000) {
      toast.error("Maximum airtime amount is KES 10,000");
      return;
    }

    if (!phone.trim()) {
      toast.error("Please enter phone number");
      return;
    }

    if (!networkId) {
      toast.error("Please select a network");
      return;
    }

    if (wallet && wallet.balance < totalDeduction) {
      toast.error(`Insufficient balance. Required: ${totalDeduction}, Available: ${wallet.balance}`);
      return;
    }

    setStep("pin");
  };

  if (loading) {
    return (
      <DashboardLayout role="user">
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (step === "processing") {
    return (
      <DashboardLayout role="user">
        <div className="max-w-md mx-auto flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="text-lg font-medium">Processing airtime purchase...</p>
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
            onCancel={() => setStep("select")}
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
            title="Airtime Purchased"
            message={`Successfully purchased KES ${receiptData.amount} ${receiptData.network} airtime for ${receiptData.phone}.`}
            items={[
              { label: "Receipt Reference", value: receiptData.receiptReference || "—" },
              { label: "Transaction ID", value: receiptData.transactionId || "—" },
              { label: "Network", value: receiptData.network },
              { label: "Phone Number", value: receiptData.phone },
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
          <h2 className="text-2xl font-bold text-foreground">Buy Airtime</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Purchase airtime for any network
          </p>
        </div>

        <Card className="p-6 space-y-4">
          <div>
            <Label className="text-sm font-medium text-foreground mb-2 block">
              Select Network
            </Label>
            <div className="flex gap-2 flex-wrap">
              {networks.map((n) => (
                <Button
                  key={n.id}
                  variant={networkId === n.id ? "default" : "outline"}
                  onClick={() => setNetworkId(n.id)}
                  className="flex-1 min-w-[100px]"
                >
                  {n.name}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="phone" className="text-sm font-medium text-foreground">
              Phone Number
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="254712345678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="amount" className="text-sm font-medium text-foreground">
              Enter Amount (KES)
            </Label>
            <Input
              id="amount"
              type="number"
              placeholder="Enter amount (min: 10, max: 10,000)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="10"
              max="10000"
              step="1"
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Minimum: KES 10 | Maximum: KES 10,000
            </p>
          </div>

          {amountNum > 0 && (
            <div className="bg-muted p-3 rounded-lg space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Amount:</span>
                <span className="font-medium">KES {amountNum.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Fee (2%):</span>
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
            disabled={!amount || !phone || !networkId || processing || parseFloat(amount) < 10}
            className="w-full"
          >
            Continue
          </Button>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default BuyAirtimePage;
