import React, { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useWallet } from "@/hooks/use-wallet";
import { Lock, CheckCircle2, AlertCircle } from "lucide-react";
import { transactionPinService } from "@/services/transaction-pin.service";

const SetupPinPage = () => {
  const { wallet, refetch } = useWallet();
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [currentPin, setCurrentPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasPin, setHasPin] = useState(false);
  const [checkingPin, setCheckingPin] = useState(true);

  // Check if user has a PIN on mount
  React.useEffect(() => {
    const checkPinStatus = async () => {
      setCheckingPin(true);
      const hasPinStatus = await transactionPinService.hasPin();
      setHasPin(hasPinStatus);
      setCheckingPin(false);
    };
    checkPinStatus();
  }, []);

  const handleSetupPin = async () => {
    // Validate PIN
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      toast.error("PIN must be exactly 4 digits");
      return;
    }

    if (pin !== confirmPin) {
      toast.error("PINs do not match");
      return;
    }

    setLoading(true);

    try {
      if (hasPin && currentPin) {
        // Change existing PIN
        const result = await transactionPinService.changePin(currentPin, pin);
        if (result.success) {
          toast.success(result.message);
        } else {
          toast.error(result.message);
          setLoading(false);
          return;
        }
      } else {
        // Set new PIN
        const result = await transactionPinService.createPin(pin);
        if (result.success) {
          toast.success(result.message);
        } else {
          toast.error(result.message);
          setLoading(false);
          return;
        }
      }
      
      // Clear form
      setPin("");
      setConfirmPin("");
      setCurrentPin("");
      
      // Update hasPin state
      setHasPin(true);
      
      // Refetch wallet
      await refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to set up PIN");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout role="user">
      {checkingPin ? (
        <div className="max-w-md mx-auto space-y-6">
          <div className="text-center">
            <p className="text-muted-foreground">Checking PIN status...</p>
          </div>
        </div>
      ) : (
        <div className="max-w-md mx-auto space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold">
            {hasPin ? "Change Transaction PIN" : "Set Up Transaction PIN"}
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            {hasPin 
              ? "Update your 4-digit PIN for secure transactions"
              : "Create a 4-digit PIN to secure your transactions"}
          </p>
        </div>

        <Card className="p-6 space-y-4">
          {hasPin && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-medium">PIN Already Set</p>
                <p className="text-xs mt-1">Enter your current PIN to change it</p>
              </div>
            </div>
          )}

          {hasPin && (
            <div>
              <Label>Current PIN</Label>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter current PIN"
                className="text-center text-2xl tracking-widest"
              />
            </div>
          )}

          <div>
            <Label>{hasPin ? "New PIN" : "Enter PIN"}</Label>
            <Input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="Enter 4-digit PIN"
              className="text-center text-2xl tracking-widest"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Must be exactly 4 digits
            </p>
          </div>

          <div>
            <Label>Confirm PIN</Label>
            <Input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
              placeholder="Re-enter PIN"
              className="text-center text-2xl tracking-widest"
            />
            {confirmPin && pin !== confirmPin && (
              <p className="text-xs text-destructive mt-1">PINs do not match</p>
            )}
            {confirmPin && pin === confirmPin && (
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                PINs match
              </p>
            )}
          </div>

          <div className="pt-4">
            <Button
              onClick={handleSetupPin}
              disabled={
                loading ||
                pin.length !== 4 ||
                confirmPin.length !== 4 ||
                pin !== confirmPin ||
                (hasPin && !currentPin)
              }
              className="w-full"
            >
              {loading ? "Setting up..." : hasPin ? "Update PIN" : "Set Up PIN"}
            </Button>
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground">
              <strong>Security Tips:</strong>
            </p>
            <ul className="text-xs text-muted-foreground mt-2 space-y-1 list-disc list-inside">
              <li>Never share your PIN with anyone</li>
              <li>Don't use obvious PINs like 1234 or your birth year</li>
              <li>Change your PIN regularly</li>
              <li>Don't write down your PIN</li>
            </ul>
          </div>
        </Card>
      </div>
      )}
    </DashboardLayout>
  );
};

export default SetupPinPage;
