import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import PinInput from "@/components/PinInput";
import ReceiptScreen from "@/components/ReceiptScreen";
import AccountConfirmation from "@/components/AccountConfirmation";
import { supabase } from "@/integrations/supabase/client";
import { useWallet } from "@/hooks/use-wallet";
import { useProfile } from "@/hooks/use-profile";

type Step = "form" | "confirm" | "pin" | "receipt";

const airtimeAmounts = [50, 100, 200, 500, 1000, 2000];

const AgentSellAirtimePage = () => {
  const [step, setStep] = useState<Step>("form");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState(0);
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

  const selectedNetwork = networks.find(n => n.id === networkId);
  const commission = selectedNetwork ? amount * (Number(selectedNetwork.commission_rate) / 100) : 0;

  const handleProcess = async () => {
    const ref = "TXN-" + Date.now().toString(36).toUpperCase();
    setTxId(ref);
    setStep("receipt");
  };

  const handleDone = () => { setStep("form"); setPhone(""); setAmount(0); };

  if (loading) {
    return (
      <DashboardLayout role="agent">
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      </DashboardLayout>
    );
  }

  if (step === "pin") {
    return (
      <DashboardLayout role="agent">
        <div className="max-w-md mx-auto">
          <PinInput onSubmit={handleProcess} onCancel={() => setStep("confirm")} title="Enter Agent PIN" />
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
            message={`ABANREMIT: Confirmed. KES ${amount}.00 ${selectedNetwork?.name || ""} Airtime sold to ${phone}. Wallet ${wallet?.wallet_id || "—"}. Ref ${txId}.`}
            items={[
              { label: "Transaction ID", value: txId },
              { label: "Network", value: selectedNetwork?.name || "—" },
              { label: "Customer Phone", value: phone },
              { label: "Amount", value: `KES ${amount}.00` },
              { label: "Commission Earned", value: `KES ${commission.toFixed(2)}` },
              { label: "Agent", value: profile?.full_name ?? "Agent" },
              { label: "Agent Balance", value: `KES ${((wallet?.balance ?? 0) - amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
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
              { label: "Network", value: selectedNetwork?.name || "—" },
              { label: "Customer Phone", value: phone },
              { label: "Commission", value: `KES ${commission.toFixed(2)}` },
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
            <label className="text-sm font-medium text-foreground mb-2 block">Select Network</label>
            <div className="flex gap-2">
              {networks.map((n) => (
                <Button key={n.id} variant={networkId === n.id ? "default" : "outline"} onClick={() => setNetworkId(n.id)} className="flex-1">
                  {n.name}
                </Button>
              ))}
            </div>
          </div>
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
          {amount > 0 && selectedNetwork && (
            <p className="text-xs text-success">Commission: KES {commission.toFixed(2)} ({Number(selectedNetwork.commission_rate).toFixed(2)}%)</p>
          )}
          <Button onClick={() => setStep("confirm")} disabled={!phone || !amount || !networkId} className="w-full">Continue</Button>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AgentSellAirtimePage;
