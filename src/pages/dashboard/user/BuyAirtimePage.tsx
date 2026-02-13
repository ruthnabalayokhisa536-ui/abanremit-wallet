import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import PinInput from "@/components/PinInput";
import ReceiptScreen from "@/components/ReceiptScreen";
import { supabase } from "@/integrations/supabase/client";
import { useWallet } from "@/hooks/use-wallet";
import { useProfile } from "@/hooks/use-profile";

type Step = "select" | "confirm" | "pin" | "receipt";

const airtimeAmounts = [50, 100, 200, 500, 1000, 2000];

const BuyAirtimePage = () => {
  const [step, setStep] = useState<Step>("select");
  const [amount, setAmount] = useState(0);
  const [phone, setPhone] = useState("");
  const [networkId, setNetworkId] = useState("");
  const [networks, setNetworks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [txId, setTxId] = useState("");
  const { wallet } = useWallet();
  const { profile } = useProfile();

  useEffect(() => {
    const fetchNetworks = async () => {
      const { data } = await supabase.from("airtime_networks").select("*").eq("enabled", true).order("name");
      setNetworks(data || []);
      if (data && data.length > 0) setNetworkId(data[0].id);
      setLoading(false);
    };
    fetchNetworks();
  }, []);

  useEffect(() => {
    if (profile?.phone) setPhone(profile.phone);
  }, [profile]);

  const selectedNetwork = networks.find(n => n.id === networkId);

  const handleProcess = async () => {
    // Generate a transaction reference
    const ref = "TXN-" + Date.now().toString(36).toUpperCase();
    setTxId(ref);
    setStep("receipt");
  };

  const handleDone = () => { setStep("select"); setAmount(0); };

  if (loading) {
    return (
      <DashboardLayout role="user">
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      </DashboardLayout>
    );
  }

  if (step === "pin") {
    return (
      <DashboardLayout role="user">
        <div className="max-w-md mx-auto">
          <PinInput onSubmit={handleProcess} onCancel={() => setStep("confirm")} />
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
            message={`ABANREMIT: Confirmed. KES ${amount}.00 ${selectedNetwork?.name || ""} Airtime purchase. Wallet ${wallet?.wallet_id || "—"}. Ref ${txId}.`}
            items={[
              { label: "Transaction ID", value: txId },
              { label: "Network", value: selectedNetwork?.name || "—" },
              { label: "Phone", value: phone },
              { label: "Amount", value: `KES ${amount}.00` },
              { label: "Fee", value: "KES 0.00" },
              { label: "New Balance", value: `KES ${((wallet?.balance ?? 0) - amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
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
        <div className="max-w-md mx-auto space-y-6">
          <h2 className="text-2xl font-bold text-foreground">Confirm Airtime Purchase</h2>
          <Card className="p-6 space-y-3">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Network</span><span className="font-medium">{selectedNetwork?.name}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Phone</span><span className="font-medium">{phone}</span></div>
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
            <label className="text-sm font-medium text-foreground mb-2 block">Select Network</label>
            <div className="flex gap-2">
              {networks.map((n) => (
                <Button
                  key={n.id}
                  variant={networkId === n.id ? "default" : "outline"}
                  onClick={() => setNetworkId(n.id)}
                  className="flex-1"
                >
                  {n.name}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Phone Number</label>
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
          <Button onClick={() => setStep("confirm")} disabled={!amount || !phone || !networkId} className="w-full">Continue</Button>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default BuyAirtimePage;
